import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { basePriceFor, maxBidFor, nextBidAmount, parseIncrements } from '../common/auction-rules'
import { planInfo, PLAN_OWNER_SELECT, publicTheme } from '../common/plans'

/** Fields that are safe to show on a public screen — never phone, email or custom answers. */
export const PUBLIC_PLAYER_SELECT = {
  id: true,
  serial: true,
  name: true,
  role: true,
  category: true,
  battingStyle: true,
  bowlingStyle: true,
  city: true,
  age: true,
  photoUrl: true,
  basePrice: true,
  status: true,
  soldTeamId: true,
  soldPrice: true,
  soldAt: true,
  retained: true,
} as const

/** Sales included in each snapshot (newest first). Squads come from their own endpoint. */
const RECENT_SALES = 20

/**
 * Builds the single public "state of the auction" payload that every screen renders:
 * the big-screen live view, the team bidding paddle and the organiser's control room.
 */
@Injectable()
export class SnapshotService {
  constructor(private readonly prisma: PrismaService) {}

  async build(tournamentId: string) {
    const t = await this.prisma.tournament.findUnique({ where: { id: tournamentId }, include: { state: true, owner: { select: PLAN_OWNER_SELECT } } })
    if (!t) return null
    const state = t.state
    const [teams, sold, counts, current, bids, bidCount] = await Promise.all([
      this.prisma.team.findMany({ where: { tournamentId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      this.prisma.player.findMany({ where: { tournamentId, status: 'SOLD' }, select: PUBLIC_PLAYER_SELECT, orderBy: { soldAt: 'desc' } }),
      this.prisma.player.groupBy({ by: ['status'], where: { tournamentId, approved: true }, _count: true }),
      state?.currentPlayerId ? this.prisma.player.findUnique({ where: { id: state.currentPlayerId }, select: PUBLIC_PLAYER_SELECT }) : null,
      state?.currentPlayerId
        ? this.prisma.bid.findMany({
            where: { playerId: state.currentPlayerId, round: state.round },
            orderBy: { createdAt: 'desc' },
            take: 15,
            select: { id: true, teamId: true, amount: true, source: true, createdAt: true },
          })
        : [],
      this.prisma.bid.count({ where: { tournamentId } }),
    ])

    const tiers = parseIncrements(t.bidIncrements)
    const squadOf = new Map<string, number>()
    const spentOf = new Map<string, number>()
    for (const p of sold) {
      squadOf.set(p.soldTeamId!, (squadOf.get(p.soldTeamId!) ?? 0) + 1)
      spentOf.set(p.soldTeamId!, (spentOf.get(p.soldTeamId!) ?? 0) + (p.soldPrice ?? 0))
    }
    const base = current ? basePriceFor(current, t) : t.basePrice
    const isLive = current?.status === 'LIVE'
    const nextBid = isLive ? nextBidAmount(state!.currentBid, base, tiers) : null
    const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0
    // Retained players count towards squads and purses, but they weren't sold under the hammer.
    const auctioned = sold.filter((p) => !p.retained)
    const totalSpent = sold.reduce((a, p) => a + (p.soldPrice ?? 0), 0)
    const plan = planInfo(t, t.owner)

    return {
      serverTime: Date.now(),
      version: state?.version ?? 0,
      tournament: {
        id: t.id,
        name: t.name,
        logoUrl: t.logoUrl,
        venue: t.venue,
        auctionDate: t.auctionDate,
        currency: t.currency,
        status: t.status,
        teamPurse: t.teamPurse,
        basePrice: t.basePrice,
        minSquad: t.minSquad,
        maxSquad: t.maxSquad,
        bidTimerSec: t.bidTimerSec,
        remoteBidding: t.remoteBidding,
        playerOrder: t.playerOrder,
        liveToken: t.liveToken,
        plan: plan.plan,
        theme: publicTheme(t.theme, plan.limits),
      },
      round: state?.round ?? 0,
      current: current
        ? {
            player: current,
            basePrice: base,
            currentBid: state!.currentBid,
            leadingTeamId: state!.leadingTeamId,
            nextBid,
            timerEndsAt: state!.timerEndsAt,
            bids,
          }
        : null,
      teams: teams.map((team) => {
        const squad = squadOf.get(team.id) ?? 0
        const maxBid = maxBidFor(team.purse, squad, t)
        return {
          id: team.id,
          name: team.name,
          shortName: team.shortName,
          color: team.color,
          logoUrl: team.logoUrl,
          ownerName: team.ownerName,
          purse: team.purse,
          spent: spentOf.get(team.id) ?? 0,
          squadSize: squad,
          maxBid,
          canBid: !!(isLive && nextBid !== null && state!.leadingTeamId !== team.id && squad < t.maxSquad && maxBid >= nextBid && t.status === 'LIVE'),
        }
      }),
      counts: {
        total: counts.reduce((a, c) => a + c._count, 0),
        available: count('AVAILABLE'),
        sold: count('SOLD'),
        unsold: count('UNSOLD'),
        live: count('LIVE'),
        queue: state?.queue.length ?? 0,
        bids: bidCount,
      },
      totalSpent,
      // Screens only show recent sales; sending all of them on every bid made big auctions sluggish.
      sold: auctioned.slice(0, RECENT_SALES),
      topBuys: [...auctioned].sort((a, b) => (b.soldPrice ?? 0) - (a.soldPrice ?? 0)).slice(0, 5),
      lastEvent: (state?.lastEvent as Record<string, unknown> | null) ?? null,
    }
  }
}

export type Snapshot = NonNullable<Awaited<ReturnType<SnapshotService['build']>>>
