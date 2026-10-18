import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, UseGuards } from '@nestjs/common'
import { AuthUser, CurrentUser, JwtAuthGuard } from '../auth/jwt.guard'
import { TournamentsService } from './tournaments.service'
import { TeamsService } from './teams.service'
import { PlayersService } from './players.service'
import {
  BulkApproveDto, BulkCategoryDto, CreateTournamentDto, ImportPlayersDto, PlayerInputDto, RetainDto, RotateTokenDto,
  TeamCountDto, TeamDto, UpdatePlayerDto, UpdateTeamDto, UpdateTournamentDto,
} from './tournament.dto'

@Controller('tournaments')
@UseGuards(JwtAuthGuard)
export class TournamentsController {
  constructor(
    private readonly tournaments: TournamentsService,
    private readonly teams: TeamsService,
    private readonly players: PlayersService,
  ) {}

  @Get()
  list(@CurrentUser() u: AuthUser) {
    return this.tournaments.list(u.id)
  }

  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateTournamentDto) {
    return this.tournaments.create(u.id, dto)
  }

  @Get(':id')
  detail(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.tournaments.detail(id, u.id)
  }

  @Patch(':id')
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateTournamentDto) {
    return this.tournaments.update(id, u.id, dto)
  }

  @Delete(':id')
  remove(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.tournaments.remove(id, u.id)
  }

  @Post(':id/rotate-token')
  @HttpCode(200)
  rotate(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: RotateTokenDto) {
    return this.tournaments.rotateToken(id, u.id, dto.kind)
  }

  @Get(':id/suggestions')
  suggestions(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.tournaments.suggestions(id, u.id)
  }

  // ── Teams ──

  @Get(':id/teams')
  async listTeams(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    await this.tournaments.owned(id, u.id)
    return this.teams.list(id)
  }

  @Put(':id/teams/count')
  setTeamCount(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: TeamCountDto) {
    return this.teams.setCount(id, u.id, dto.count)
  }

  @Post(':id/teams')
  createTeam(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: TeamDto) {
    return this.teams.create(id, u.id, dto)
  }

  @Patch(':id/teams/:teamId')
  updateTeam(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('teamId') teamId: string, @Body() dto: UpdateTeamDto) {
    return this.teams.update(id, teamId, u.id, dto)
  }

  @Delete(':id/teams/:teamId')
  removeTeam(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('teamId') teamId: string) {
    return this.teams.remove(id, teamId, u.id)
  }

  @Post(':id/teams/:teamId/rotate-token')
  @HttpCode(200)
  rotateTeamToken(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('teamId') teamId: string) {
    return this.teams.rotateBidToken(id, teamId, u.id)
  }

  @Post(':id/teams/:teamId/retain')
  @HttpCode(200)
  retain(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('teamId') teamId: string, @Body() dto: RetainDto) {
    return this.teams.retain(id, teamId, u.id, dto)
  }

  @Delete(':id/teams/:teamId/retain/:playerId')
  release(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('teamId') teamId: string, @Param('playerId') playerId: string) {
    return this.teams.release(id, teamId, playerId, u.id)
  }

  // ── Players ──

  @Get(':id/players')
  async listPlayers(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    await this.tournaments.owned(id, u.id)
    return this.players.list(id)
  }

  @Post(':id/players')
  createPlayer(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: PlayerInputDto) {
    return this.players.create(id, u.id, dto)
  }

  @Post(':id/players/import')
  importPlayers(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: ImportPlayersDto) {
    return this.players.import(id, u.id, dto)
  }

  @Post(':id/players/approve')
  @HttpCode(200)
  approve(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: BulkApproveDto) {
    return this.players.bulkApprove(id, u.id, dto.ids, dto.approved)
  }

  @Post(':id/players/category')
  @HttpCode(200)
  category(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: BulkCategoryDto) {
    return this.players.bulkCategory(id, u.id, dto.ids, dto.category)
  }

  @Patch(':id/players/:playerId')
  updatePlayer(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('playerId') playerId: string, @Body() dto: UpdatePlayerDto) {
    return this.players.update(id, playerId, u.id, dto)
  }

  @Delete(':id/players/:playerId')
  removePlayer(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('playerId') playerId: string) {
    return this.players.remove(id, playerId, u.id)
  }
}
