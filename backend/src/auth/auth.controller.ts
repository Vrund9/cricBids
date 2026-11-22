import { Body, Controller, Delete, Get, HttpCode, Param, ParseEnumPipe, Patch, Post, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { AuthUser, CurrentUser, JwtAuthGuard } from './jwt.guard'
import { ChangePasswordDto, ForgotPasswordDto, GoogleLoginDto, LoginDto, ResetPasswordDto, SignupDto, UpdateProfileDto } from './auth.dto'

/** Guided tours the web app can mark as seen (matches the `id` of each <Tour>). */
const TOURS = { dashboard: 'dashboard', tournament: 'tournament' } as const

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto)
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto)
  }

  @Post('google')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  google(@Body() dto: GoogleLoginDto) {
    return this.auth.googleLogin(dto)
  }

  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  forgot(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email)
  }

  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  reset(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id)
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.id, dto)
  }

  @Post('me/tours/:tour')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  tourSeen(@CurrentUser() user: AuthUser, @Param('tour', new ParseEnumPipe(TOURS)) tour: string) {
    return this.auth.markTourSeen(user.id, tour)
  }

  @Delete('me/tours')
  @UseGuards(JwtAuthGuard)
  resetTours(@CurrentUser() user: AuthUser) {
    return this.auth.resetTours(user.id)
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.id, dto)
  }
}
