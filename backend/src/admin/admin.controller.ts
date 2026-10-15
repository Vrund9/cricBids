import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Allow, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'
import { AdminGuard, AuthUser, CurrentUser, JwtAuthGuard } from '../auth/jwt.guard'
import { AdminService, UserFilter } from './admin.service'
import { settings } from '../common/settings'

class UpdateUserDto {
  @IsOptional() @IsBoolean() suspended?: boolean
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) name?: string
}

class SeasonPassDto {
  @IsIn(['grant', 'revoke']) action: 'grant' | 'revoke'
  @IsOptional() @IsInt() @Min(1) @Max(60) months?: number
}

class TournamentPlanDto {
  @IsIn(['FREE', 'PRO']) plan: 'FREE' | 'PRO'
}

/** Values are validated per key in common/settings.ts. */
class SettingsDto {
  @Allow() signupsEnabled?: unknown
  @Allow() announcement?: unknown
  @Allow() billingMode?: unknown
  @Allow() freeMaxTeams?: unknown
  @Allow() freeMaxPlayers?: unknown
  @Allow() proMaxTeams?: unknown
  @Allow() proMaxPlayers?: unknown
}

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  overview() {
    return this.admin.overview()
  }

  @Get('live')
  live() {
    return this.admin.liveTournaments()
  }

  @Get('users')
  users(@Query('q') q?: string, @Query('filter') filter?: UserFilter, @Query('page') page?: string) {
    return this.admin.users(q, filter, Number(page))
  }

  @Get('users/:id')
  user(@Param('id') id: string) {
    return this.admin.user(id)
  }

  @Patch('users/:id')
  updateUser(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.admin.updateUser(actor, id, dto)
  }

  @Post('users/:id/season-pass')
  @HttpCode(200)
  seasonPass(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() dto: SeasonPassDto) {
    return this.admin.seasonPass(actor, id, dto)
  }

  @Delete('users/:id')
  deleteUser(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.admin.deleteUser(actor, id)
  }

  @Get('tournaments')
  tournaments(@Query('q') q?: string, @Query('status') status?: string, @Query('plan') plan?: string, @Query('page') page?: string) {
    return this.admin.tournaments(q, status, plan, Number(page))
  }

  @Patch('tournaments/:id/plan')
  setPlan(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() dto: TournamentPlanDto) {
    return this.admin.setTournamentPlan(actor, id, dto.plan)
  }

  @Get('payments')
  payments(@Query('kind') kind?: string, @Query('source') source?: string, @Query('page') page?: string) {
    return this.admin.payments(kind, source, Number(page))
  }

  @Get('settings')
  getSettings() {
    return this.admin.getSettings()
  }

  @Patch('settings')
  updateSettings(@CurrentUser() actor: AuthUser, @Body() dto: SettingsDto) {
    return this.admin.updateSettings(actor, dto)
  }

  @Get('audit')
  audit(@Query('page') page?: string) {
    return this.admin.auditLog(Number(page))
  }
}

/** Public, cacheable platform config the web app reads on load (announcement banner, sign-up availability). */
@Controller('config')
export class ConfigController {
  @Get()
  config() {
    const s = settings()
    return { signupsEnabled: s.signupsEnabled, announcement: s.announcement }
  }
}
