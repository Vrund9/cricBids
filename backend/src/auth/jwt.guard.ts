import { CanActivate, createParamDecorator, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import { isAdminUser } from '../common/admin'

export interface AuthUser {
  id: string
  email: string
  isAdmin: boolean
}

export interface JwtPayload {
  sub: string
  email: string
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest()
    const header: string | undefined = req.headers?.authorization
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined
    if (!token) throw new UnauthorizedException('Please sign in')
    let payload: JwtPayload
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token)
    } catch {
      throw new UnauthorizedException('Session expired, please sign in again')
    }
    // Checked on every request so suspensions and deletions from the admin panel take effect immediately.
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, isAdmin: true, suspendedAt: true } })
    if (!user) throw new UnauthorizedException('Session expired, please sign in again')
    if (user.suspendedAt) throw new UnauthorizedException('This account has been suspended')
    req.user = { id: user.id, email: user.email, isAdmin: isAdminUser(user) } satisfies AuthUser
    return true
  }
}

/** Use after JwtAuthGuard: only platform admins get through. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user: AuthUser | undefined = context.switchToHttp().getRequest().user
    if (!user?.isAdmin) throw new ForbiddenException('Admins only')
    return true
  }
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest().user
})
