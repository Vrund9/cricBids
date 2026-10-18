import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RealtimeService } from '../realtime/realtime.service'
import { randomToken, shortNameFor, TEAM_COLORS } from '../common/util'
import { isStarted, TournamentsService } from './tournaments.service'
import { TeamDto, UpdateTeamDto } from './tournament.dto'
import { planLimit, teamLimitMessage } from '../common/plans'
import { releaseRetained } from './retention'

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tournaments: TournamentsService,
    private readonly realtime: RealtimeService,
  ) {}

  list(tournamentId: string) {
    return this.prisma.team.findMany({ where: { tournamentId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
  }

  /** Wizard question "How many teams?" — grows or shrinks the team list before the auction. */
  async setCount(tournamentId: string, userId: string, count: number) {
    const t = await this.tournaments.editable(tournamentId, userId)
    if (isStarted(t)) throw new BadRequestException('Teams cannot be added or removed after the auction has started')
    const { limits } = await this.tournaments.plan(tournamentId)
    if (count > limits.maxTeams) planLimit(teamLimitMessage(limits, count))
    const teams = await this.list(tournamentId)
    if (teams.length < count) {
      const used = new Set(teams.map((x) => x.color))
      const free = TEAM_COLORS.filter((c) => !used.has(c))
      await this.prisma.team.createMany({
        data: Array.from({ length: count - teams.length }, (_, i) => {
          const n = teams.length + i + 1
          return {
            tournamentId,
            name: `Team ${n}`,
            shortName: `T${n}`,
            color: free[i % Math.max(1, free.length)] ?? TEAM_COLORS[n % TEAM_COLORS.length],
            purse: t.teamPurse,
            bidToken: randomToken(),
            sortOrder: n,
          }
        }),
      })
    } else if (teams.length > count) {
      const ids = teams.slice(count).map((x) => x.id)
      await this.prisma.$transaction([releaseRetained(this.prisma, ids), this.prisma.team.deleteMany({ where: { id: { in: ids } } })])
    }
    this.realtime.stateChanged(tournamentId)
    return this.list(tournamentId)
  }

  async create(tournamentId: string, userId: string, dto: TeamDto) {
    const t = await this.tournaments.editable(tournamentId, userId)
    if (isStarted(t)) throw new BadRequestException('Teams cannot be added after the auction has started')
    const count = await this.prisma.team.count({ where: { tournamentId } })
    const { limits } = await this.tournaments.plan(tournamentId)
    if (count >= limits.maxTeams) planLimit(teamLimitMessage(limits, count + 1))
    const team = await this.prisma.team.create({
      data: {
        tournamentId,
        name: dto.name.trim(),
        shortName: (dto.shortName || shortNameFor(dto.name)).toUpperCase(),
        color: dto.color ?? TEAM_COLORS[count % TEAM_COLORS.length],
        logoUrl: dto.logoUrl,
        ownerName: dto.ownerName,
        purse: t.teamPurse,
        bidToken: randomToken(),
        sortOrder: count + 1,
      },
    })
    this.realtime.stateChanged(tournamentId)
    return team
  }

  private async ownedTeam(tournamentId: string, teamId: string, userId: string) {
    const t = await this.tournaments.editable(tournamentId, userId)
    const team = await this.prisma.team.findFirst({ where: { id: teamId, tournamentId } })
    if (!team) throw new NotFoundException('Team not found')
    return { t, team }
  }

  async update(tournamentId: string, teamId: string, userId: string, dto: UpdateTeamDto) {
    await this.ownedTeam(tournamentId, teamId, userId)
    const team = await this.prisma.team.update({
      where: { id: teamId },
      data: {
        ...dto,
        name: dto.name?.trim(),
        shortName: dto.shortName?.toUpperCase() || (dto.name ? shortNameFor(dto.name) : undefined),
      },
    })
    this.realtime.stateChanged(tournamentId)
    return team
  }

  async remove(tournamentId: string, teamId: string, userId: string) {
    const { t } = await this.ownedTeam(tournamentId, teamId, userId)
    if (isStarted(t)) throw new BadRequestException('Teams cannot be removed after the auction has started')
    await this.prisma.$transaction([releaseRetained(this.prisma, [teamId]), this.prisma.team.delete({ where: { id: teamId } })])
    this.realtime.stateChanged(tournamentId)
    return { ok: true }
  }

  /**
   * Keep a player in a team before the auction. With `deductFromPurse` the retention price comes
   * out of the team's purse, exactly like a sale; otherwise the player joins at no cost.
   */
  async retain(tournamentId: string, teamId: string, userId: string, dto: { playerId: string; price: number; deductFromPurse: boolean }) {
    const { t, team } = await this.ownedTeam(tournamentId, teamId, userId)
    if (isStarted(t)) throw new BadRequestException('Players can only be retained before the auction starts')
    const player = await this.prisma.player.findUnique({ where: { id: dto.playerId } })
    if (!player || player.tournamentId !== tournamentId) throw new NotFoundException('Player not found')
    if (player.status !== 'AVAILABLE' || !player.approved) throw new BadRequestException(`${player.name} is not available to retain`)
    const squad = await this.prisma.player.count({ where: { soldTeamId: teamId } })
    if (squad >= t.maxSquad) throw new BadRequestException(`${team.name} already has a full squad of ${t.maxSquad}`)
    const cost = dto.deductFromPurse ? dto.price : 0
    if (cost > team.purse) throw new BadRequestException(`${team.name} has only ${team.purse} left in the purse`)
    await this.prisma.$transaction([
      this.prisma.player.update({ where: { id: player.id }, data: { status: 'SOLD', retained: true, soldTeamId: teamId, soldPrice: cost, soldAt: new Date() } }),
      this.prisma.team.update({ where: { id: teamId }, data: { purse: { decrement: cost } } }),
    ])
    this.realtime.stateChanged(tournamentId)
    return { ok: true }
  }

  /** Undo a retention: the player goes back in the pool and any deducted amount returns to the purse. */
  async release(tournamentId: string, teamId: string, playerId: string, userId: string) {
    const { t } = await this.ownedTeam(tournamentId, teamId, userId)
    if (isStarted(t)) throw new BadRequestException('Retentions are locked once the auction starts')
    const player = await this.prisma.player.findUnique({ where: { id: playerId } })
    if (!player || player.soldTeamId !== teamId || !player.retained) throw new NotFoundException('This player is not retained by this team')
    await this.prisma.$transaction([
      this.prisma.player.update({ where: { id: playerId }, data: { status: 'AVAILABLE', retained: false, soldTeamId: null, soldPrice: null, soldAt: null } }),
      this.prisma.team.update({ where: { id: teamId }, data: { purse: { increment: player.soldPrice ?? 0 } } }),
    ])
    this.realtime.stateChanged(tournamentId)
    return { ok: true }
  }

  async rotateBidToken(tournamentId: string, teamId: string, userId: string) {
    await this.ownedTeam(tournamentId, teamId, userId)
    return this.prisma.team.update({ where: { id: teamId }, data: { bidToken: randomToken() }, select: { id: true, bidToken: true } })
  }
}
