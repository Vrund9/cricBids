import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RealtimeService } from '../realtime/realtime.service'
import { DEFAULT_INCREMENTS, maxBidFor } from '../common/auction-rules'
import { DEFAULT_REG_FIELDS, sanitizeFields } from '../common/registration'
import { randomToken, slugify } from '../common/util'
import { resetPurses } from './retention'
import { planInfo, planLimit, PLAN_OWNER_SELECT, sanitizeTheme } from '../common/plans'
import { CreateTournamentDto, UpdateTournamentDto } from './tournament.dto'
import type { Tournament } from '../generated/prisma/client'

/** Statuses where the money side of the auction is locked. */
export const STARTED = ['LIVE', 'PAUSED', 'COMPLETED'] as const

export function isStarted(t: Pick<Tournament, 'status'>) {
  return (STARTED as readonly string[]).includes(t.status)
}

@Injectable()
export class TournamentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  /** Load a tournament and make sure the caller owns it. */
  async owned(id: string, userId: string) {
    const t = await this.prisma.tournament.findUnique({ where: { id } })
    if (!t) throw new NotFoundException('Tournament not found')
    if (t.ownerId !== userId) throw new ForbiddenException('You do not have access to this tournament')
    return t
  }

  /** Like `owned`, but refuses changes once the auction is complete — results are final. */
  async editable(id: string, userId: string) {
    const t = await this.owned(id, userId)
    if (t.status === 'COMPLETED') throw new BadRequestException('This auction is complete, so its details are locked')
    return t
  }

  /** Effective plan for a tournament (per-tournament Pro or the owner's Season Pass). */
  async plan(id: string) {
    const t = await this.prisma.tournament.findUnique({
      where: { id },
      select: { plan: true, extraTeams: true, themeUnlocked: true, auctionFeePaid: true, randomUnlocked: true, sequence: true, owner: { select: PLAN_OWNER_SELECT } },
    })
    if (!t) throw new NotFoundException('Tournament not found')
    return planInfo(t, t.owner)
  }

  async list(userId: string) {
    const rows = await this.prisma.tournament.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { teams: true, players: true } } },
    })
    const sold = await this.prisma.player.groupBy({
      by: ['tournamentId'],
      where: { tournamentId: { in: rows.map((r) => r.id) }, status: 'SOLD' },
      _count: true,
      _sum: { soldPrice: true },
    })
    const soldBy = new Map(sold.map((s) => [s.tournamentId, s]))
    return rows.map(({ _count, ...t }) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      logoUrl: t.logoUrl,
      venue: t.venue,
      auctionDate: t.auctionDate,
      currency: t.currency,
      status: t.status,
      plan: t.plan,
      setupComplete: t.setupComplete,
      registrationOpen: t.registrationOpen,
      liveToken: t.liveToken,
      updatedAt: t.updatedAt,
      teams: _count.teams,
      players: _count.players,
      sold: soldBy.get(t.id)?._count ?? 0,
      totalSpent: soldBy.get(t.id)?._sum.soldPrice ?? 0,
    }))
  }

  async create(userId: string, dto: CreateTournamentDto) {
    // The counter never goes down, so deleting old auctions doesn't reset the free allowance.
    const { auctionsCreated } = await this.prisma.user.update({ where: { id: userId }, data: { auctionsCreated: { increment: 1 } }, select: { auctionsCreated: true } })
    return this.prisma.tournament.create({
      data: {
        ownerId: userId,
        sequence: auctionsCreated,
        name: dto.name.trim(),
        slug: slugify(dto.name),
        description: dto.description,
        venue: dto.venue,
        auctionDate: new Date(dto.auctionDate),
        currency: dto.currency ?? 'INR',
        logoUrl: dto.logoUrl,
        bidIncrements: DEFAULT_INCREMENTS as any,
        registrationFields: DEFAULT_REG_FIELDS as any,
        // Open by default so the first link an organiser shares actually works.
        registrationOpen: true,
        registrationToken: randomToken(),
        liveToken: randomToken(),
      },
    })
  }

  async detail(id: string, userId: string) {
    const t = await this.owned(id, userId)
    const [teams, counts, categories, plan] = await Promise.all([
      this.prisma.team.findMany({
        where: { tournamentId: id },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        include: { _count: { select: { players: true } } },
      }),
      this.prisma.player.groupBy({ by: ['status', 'approved', 'source'], where: { tournamentId: id }, _count: true }),
      this.prisma.player.groupBy({ by: ['category'], where: { tournamentId: id }, _count: true }),
      this.plan(id),
    ])
    const sum = (pred: (c: (typeof counts)[number]) => boolean) => counts.filter(pred).reduce((a, c) => a + c._count, 0)
    return {
      ...t,
      planInfo: plan,
      teams: teams.map(({ _count, ...team }) => ({
        ...team,
        squadSize: _count.players,
        maxBid: maxBidFor(team.purse, _count.players, t),
      })),
      stats: {
        players: sum(() => true),
        approved: sum((c) => c.approved),
        pendingApproval: sum((c) => !c.approved),
        fromForm: sum((c) => c.source === 'FORM'),
        fromExcel: sum((c) => c.source === 'EXCEL'),
        sold: sum((c) => c.status === 'SOLD'),
        unsold: sum((c) => c.status === 'UNSOLD'),
        available: sum((c) => c.status === 'AVAILABLE' && c.approved),
      },
      categories: categories.filter((c) => c.category).map((c) => ({ name: c.category!, count: c._count })),
    }
  }

  async update(id: string, userId: string, dto: UpdateTournamentDto) {
    const t = await this.editable(id, userId)
    if (dto.auctionDate === null) throw new BadRequestException('Auction date is required')
    const started = isStarted(t)
    if (started && dto.teamPurse !== undefined && dto.teamPurse !== t.teamPurse) {
      throw new BadRequestException('Team purse cannot be changed after the auction has started')
    }
    const minSquad = dto.minSquad ?? t.minSquad
    const maxSquad = dto.maxSquad ?? t.maxSquad
    if (minSquad > maxSquad) throw new BadRequestException('Minimum squad size cannot be more than the maximum')
    const teamPurse = dto.teamPurse ?? t.teamPurse
    const basePrice = dto.basePrice ?? t.basePrice
    if (basePrice * minSquad > teamPurse) {
      throw new BadRequestException(`A purse of ${teamPurse} can't buy ${minSquad} players at base price ${basePrice}. Raise the purse or lower the base price.`)
    }

    const { limits } = await this.plan(id)
    const theme = dto.theme !== undefined ? sanitizeTheme(dto.theme, limits) : undefined

    const { registrationFields, auctionDate, categoryBasePrices, bidIncrements, theme: _theme, ...rest } = dto
    let cats: Record<string, number> | null | undefined = undefined
    if (categoryBasePrices !== undefined) {
      cats = categoryBasePrices === null ? null : Object.fromEntries(
        Object.entries(categoryBasePrices)
          .map(([k, v]) => [k.trim().slice(0, 30), Math.round(Number(v))] as const)
          .filter(([k, v]) => k && v > 0),
      )
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.tournament.update({
        where: { id },
        data: {
          ...rest,
          name: rest.name?.trim(),
          auctionDate: auctionDate === undefined ? undefined : auctionDate ? new Date(auctionDate) : null,
          registrationFields: registrationFields ? (sanitizeFields(registrationFields) as any) : undefined,
          bidIncrements: bidIncrements ? ([...bidIncrements].sort((a, b) => a.from - b.from) as any) : undefined,
          categoryBasePrices: cats === undefined ? undefined : (cats as any) ?? null,
          theme: theme as any,
          status: !started && (dto.setupComplete ?? t.setupComplete) ? 'READY' : undefined,
        },
      })
      // Before the auction, every team's purse is the tournament purse minus its retentions.
      if (!started && dto.teamPurse !== undefined) await resetPurses(tx, id, dto.teamPurse)
      return row
    })
    this.realtime.stateChanged(id)
    return updated
  }

  async remove(id: string, userId: string) {
    await this.owned(id, userId)
    await this.prisma.tournament.delete({ where: { id } })
    return { ok: true }
  }

  async rotateToken(id: string, userId: string, kind: 'live' | 'registration') {
    await this.owned(id, userId)
    return this.prisma.tournament.update({
      where: { id },
      data: kind === 'live' ? { liveToken: randomToken() } : { registrationToken: randomToken() },
      select: { liveToken: true, registrationToken: true },
    })
  }

  /**
   * Smart defaults for the setup wizard, derived from the real player pool —
   * this is what turns "upload an Excel" into "answer five questions and go".
   */
  async suggestions(id: string, userId: string) {
    const t = await this.owned(id, userId)
    const [players, teams, categories] = await Promise.all([
      this.prisma.player.count({ where: { tournamentId: id, approved: true } }),
      this.prisma.team.count({ where: { tournamentId: id } }),
      this.prisma.player.groupBy({ by: ['category'], where: { tournamentId: id, approved: true }, _count: true }),
    ])
    const teamCount = teams || Math.min(12, Math.max(2, Math.round(players / 12) || 4))
    const perTeam = Math.max(1, Math.floor(players / teamCount))
    const maxSquad = Math.min(25, Math.max(perTeam + 2, 11))
    const minSquad = Math.min(maxSquad, Math.max(1, Math.min(11, perTeam)))
    const basePrice = t.basePrice
    // A purse of ~2.5x what a minimum squad costs at base price gives room for real bidding wars.
    const teamPurse = Math.ceil((basePrice * minSquad * 2.5) / 1000) * 1000
    return {
      players,
      teamCount,
      perTeam,
      minSquad,
      maxSquad,
      basePrice,
      teamPurse,
      categories: categories.filter((c) => c.category).map((c) => ({ name: c.category!, count: c._count })),
      warnings: [
        players < teamCount * minSquad ? `Only ${players} players for ${teamCount} teams × ${minSquad} minimum. Lower the minimum squad or add players.` : null,
        players === 0 ? 'No approved players yet — upload an Excel or share the registration form first.' : null,
      ].filter(Boolean),
    }
  }
}
