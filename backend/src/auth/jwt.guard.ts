import { CanActivate, createParamDecorator, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

export interface AuthUser {
  id: string
  email: string
}

export interface JwtPayload {
  sub: string
  email: string
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest()
    const header: string | undefined = req.headers?.authorization
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined
    if (!token) throw new UnauthorizedException('Please sign in')
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token)
      req.user = { id: payload.sub, email: payload.email } satisfies AuthUser
      return true
    } catch {
      throw new UnauthorizedException('Session expired, please sign in again')
    }
  }
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest().user
})
