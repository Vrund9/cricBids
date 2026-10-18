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
  /** Session version at sign-in (see User.sessionVersion) */
  sv?: number
}

/** Shown when a newer sign-in elsewhere replaced this session. The web app recognises this code. */
export const SIGNED_IN_ELSEWHERE = 'SIGNED_IN_ELSEWHERE'

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
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, isAdmin: true, suspendedAt: true, sessionVersion: true } })
    if (!user) throw new UnauthorizedException('Session expired, please sign in again')
    if ((payload.sv ?? 0) !== user.sessionVersion) {
      throw new UnauthorizedException({ statusCode: 401, code: SIGNED_IN_ELSEWHERE, message: 'You signed in on another device, so this one was signed out.' })
    }
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
