import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RealtimeService } from '../realtime/realtime.service'
import { randomToken, shortNameFor, TEAM_COLORS } from '../common/util'
import { isStarted, TournamentsService } from './tournaments.service'
import { TeamDto, UpdateTeamDto } from './tournament.dto'
import { planLimit } from '../common/plans'

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
    const t = await this.tournaments.owned(tournamentId, userId)
    if (isStarted(t)) throw new BadRequestException('Teams cannot be added or removed after the auction has started')
    const { limits, plan } = await this.tournaments.plan(tournamentId)
    if (count > limits.maxTeams) planLimit(`The ${plan === 'FREE' ? 'Free' : 'Pro'} plan allows up to ${limits.maxTeams} teams`)
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
      await this.prisma.team.deleteMany({ where: { id: { in: teams.slice(count).map((x) => x.id) } } })
    }
    this.realtime.stateChanged(tournamentId)
    return this.list(tournamentId)
  }

  async create(tournamentId: string, userId: string, dto: TeamDto) {
    const t = await this.tournaments.owned(tournamentId, userId)
    if (isStarted(t)) throw new BadRequestException('Teams cannot be added after the auction has started')
    const count = await this.prisma.team.count({ where: { tournamentId } })
    const { limits, plan } = await this.tournaments.plan(tournamentId)
    if (count >= limits.maxTeams) planLimit(`The ${plan === 'FREE' ? 'Free' : 'Pro'} plan allows up to ${limits.maxTeams} teams`)
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
    const t = await this.tournaments.owned(tournamentId, userId)
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
    await this.prisma.team.delete({ where: { id: teamId } })
    this.realtime.stateChanged(tournamentId)
    return { ok: true }
  }

  async rotateBidToken(tournamentId: string, teamId: string, userId: string) {
    await this.ownedTeam(tournamentId, teamId, userId)
    return this.prisma.team.update({ where: { id: teamId }, data: { bidToken: randomToken() }, select: { id: true, bidToken: true } })
  }
}
