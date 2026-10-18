import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RealtimeService } from '../realtime/realtime.service'
import { TournamentsService } from '../tournaments/tournaments.service'
import { basePriceFor, maxBidFor, nextBidAmount, parseIncrements } from '../common/auction-rules'
import { ordinal, shuffle } from '../common/util'
import { planLimit, PRICING } from '../common/plans'
import { resetPurses } from '../tournaments/retention'
import type { AuctionState, Prisma, Tournament } from '../generated/prisma/client'
import type { BidSource } from '../generated/prisma/enums'

type Tx = Prisma.TransactionClient
type StatePatch = Partial<Pick<AuctionState, 'currentPlayerId' | 'currentBid' | 'leadingTeamId' | 'round' | 'queue' | 'timerEndsAt' | 'startedAt'>> & {
  lastEvent?: Record<string, unknown>
}

interface Ctx {
  tx: Tx
  t: Tournament
  state: AuctionState
}

@Injectable()
export class AuctionService {
  /** Per-tournament promise chain: actions on one auction run strictly one after another. */
  private readonly locks = new Map<string, Promise<unknown>>()

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly tournaments: TournamentsService,
  ) {}

  private withLock<T>(tournamentId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(tournamentId) ?? Promise.resolve()
    const run = prev.catch(() => undefined).then(fn)
    this.locks.set(tournamentId, run)
    run.finally(() => {
      if (this.locks.get(tournamentId) === run) this.locks.delete(tournamentId)
    }).catch(() => undefined)
    return run
  }

  /**
   * Run an engine action in a transaction. The state row is written with a version
   * check (optimistic lock), so even multiple API instances can't apply two
   * conflicting bids.
   */
  private async act(tournamentId: string, fn: (ctx: Ctx) => Promise<StatePatch | void>) {
    const result = await this.withLock(tournamentId, () =>
      this.prisma.$transaction(async (tx) => {
        const t = await tx.tournament.findUnique({ where: { id: tournamentId } })
        if (!t) throw new NotFoundException('Tournament not found')
        const state = await tx.auctionState.findUnique({ where: { tournamentId } })
        if (!state) throw new BadRequestException('The auction has not started yet')
        const patch = await fn({ tx, t, state })
        if (patch) await this.save(tx, state, patch)
        return { ok: true }
      }),
    )
    this.realtime.stateChanged(tournamentId)
    return result
  }

  private async save(tx: Tx, state: AuctionState, patch: StatePatch) {
    const { lastEvent, ...rest } = patch
    const res = await tx.auctionState.updateMany({
      where: { tournamentId: state.tournamentId, version: state.version },
      data: {
        ...rest,
        lastEvent: lastEvent ? ({ ...lastEvent, at: Date.now() } as any) : undefined,
        version: { increment: 1 },
      },
    })
    if (res.count === 0) throw new ConflictException('The auction moved on — please try again')
  }

  private timer(t: Tournament) {
    return t.bidTimerSec > 0 ? new Date(Date.now() + t.bidTimerSec * 1000) : null
  }

  private requireRunning(t: Tournament) {
    if (t.status === 'PAUSED') throw new BadRequestException('The auction is paused')
    if (t.status !== 'LIVE') throw new BadRequestException('The auction is not live')
  }

  private async currentPlayer(ctx: Ctx, expect: 'LIVE' | 'DONE' | 'ANY' = 'LIVE') {
    const { tx, state } = ctx
    if (!state.currentPlayerId) throw new BadRequestException('No player is up right now')
    const p = await tx.player.findUnique({ where: { id: state.currentPlayerId } })
    if (!p) throw new BadRequestException('No player is up right now')
    if (expect === 'LIVE' && p.status !== 'LIVE') throw new BadRequestException(`${p.name} is already ${p.status.toLowerCase()}`)
    if (expect === 'DONE' && p.status !== 'SOLD' && p.status !== 'UNSOLD') throw new BadRequestException(`${p.name} is still live`)
    return p
  }

  /** Decide the order players will be called. Random order uses crypto shuffle. */
  private orderPlayers(players: { id: string; serial: number; category: string | null }[], t: Tournament) {
    if (t.playerOrder === 'SEQUENTIAL') return [...players].sort((a, b) => a.serial - b.serial).map((p) => p.id)
    if (t.playerOrder === 'RANDOM') return shuffle(players).map((p) => p.id)
    // CATEGORY_RANDOM: marquee categories (highest base price) first, random within each category.
    const prices = (t.categoryBasePrices || {}) as Record<string, number>
    const cats = [...new Set(players.map((p) => p.category ?? ''))].sort((a, b) => {
      if (!a) return 1
      if (!b) return -1
      return (prices[b] ?? 0) - (prices[a] ?? 0) || a.localeCompare(b)
    })
    return cats.flatMap((c) => shuffle(players.filter((p) => (p.category ?? '') === c)).map((p) => p.id))
  }

  /** Bring the next eligible player from the queue on stage. */
  private async advance(ctx: Ctx, queueIn: string[]): Promise<StatePatch> {
    const { tx, t } = ctx
    const queue = [...queueIn]
    while (queue.length) {
      const id = queue.shift()!
      const p = await tx.player.findUnique({ where: { id } })
      if (p && p.tournamentId === t.id && p.approved && p.status === 'AVAILABLE') {
        await tx.player.update({ where: { id }, data: { status: 'LIVE' } })
        return {
          queue,
          currentPlayerId: id,
          currentBid: null,
          leadingTeamId: null,
          timerEndsAt: null,
          lastEvent: { type: 'NEXT', playerId: id, name: p.name },
        }
      }
    }
    const unsold = await tx.player.count({ where: { tournamentId: t.id, status: 'UNSOLD' } })
    return { queue: [], currentPlayerId: null, currentBid: null, leadingTeamId: null, timerEndsAt: null, lastEvent: { type: 'ROUND_END', unsold } }
  }

  // ───────────────────────────── Organiser actions ─────────────────────────────

  async start(tournamentId: string, userId: string) {
    const t0 = await this.tournaments.owned(tournamentId, userId)
    if (t0.status === 'LIVE' || t0.status === 'PAUSED') throw new BadRequestException('The auction is already running')
    if (t0.status === 'COMPLETED') throw new BadRequestException('This auction is complete. Reset it to run again.')
    // One organiser runs one auction at a time: finish the running one before starting another.
    const running = await this.prisma.tournament.findFirst({
      where: { ownerId: t0.ownerId, id: { not: tournamentId }, status: { in: ['LIVE', 'PAUSED'] } },
      select: { name: true },
    })
    if (running) throw new ConflictException(`“${running.name}” is still live. Finish that auction before starting another one.`)
    const { limits, sequence } = await this.tournaments.plan(tournamentId)
    if (limits.auctionFeeDue) planLimit(`This is your auction #${sequence}. Your first ${PRICING.freeAuctions} are free; from your ${ordinal(PRICING.freeAuctions + 1)} on, each auction is ₹${PRICING.auctionFee}.`)
    await this.withLock(tournamentId, () =>
      this.prisma.$transaction(async (tx) => {
        const t = await tx.tournament.findUniqueOrThrow({ where: { id: tournamentId } })
        const teams = await tx.team.count({ where: { tournamentId } })
        if (teams < 2) throw new BadRequestException('Add at least 2 teams before starting')
        const players = await tx.player.findMany({
          where: { tournamentId, approved: true, status: 'AVAILABLE' },
          select: { id: true, serial: true, category: true },
        })
        if (!players.length) throw new BadRequestException('Add or approve at least one player before starting')
        await tx.bid.deleteMany({ where: { tournamentId } })
        await resetPurses(tx, tournamentId, t.teamPurse)
        const queue = this.orderPlayers(players, t)
        const state = await tx.auctionState.upsert({
          where: { tournamentId },
          create: { tournamentId, queue, round: 1, startedAt: new Date() },
          update: { queue, round: 1, startedAt: new Date(), currentPlayerId: null, currentBid: null, leadingTeamId: null, timerEndsAt: null },
        })
        const live = await tx.tournament.update({ where: { id: tournamentId }, data: { status: 'LIVE', setupComplete: true } })
        const ctx = { tx, t: live, state }
        const patch = await this.advance(ctx, queue)
        await this.save(tx, state, { ...patch, timerEndsAt: this.timer(live), lastEvent: { ...patch.lastEvent, type: 'STARTED' } })
      }),
    )
    this.realtime.stateChanged(tournamentId)
    return { ok: true }
  }

  async next(tournamentId: string, userId: string) {
    await this.tournaments.owned(tournamentId, userId)
    return this.act(tournamentId, async (ctx) => {
      this.requireRunning(ctx.t)
      if (ctx.state.currentPlayerId) {
        const p = await ctx.tx.player.findUnique({ where: { id: ctx.state.currentPlayerId } })
        if (p?.status === 'LIVE') throw new BadRequestException(`Sell, mark unsold or skip ${p.name} first`)
      }
      const patch = await this.advance(ctx, ctx.state.queue)
      return { ...patch, timerEndsAt: patch.currentPlayerId ? this.timer(ctx.t) : null }
    })
  }

  async bid(
    tournamentId: string,
    teamId: string,
    opts: { amount?: number; expected?: number; source: BidSource },
  ) {
    return this.act(tournamentId, async (ctx) => {
      const { tx, t, state } = ctx
      this.requireRunning(t)
      if (opts.source === 'REMOTE' && !t.remoteBidding) throw new ForbiddenException('Remote bidding is turned off')
      const player = await this.currentPlayer(ctx)
      const team = await tx.team.findFirst({ where: { id: teamId, tournamentId } })
      if (!team) throw new NotFoundException('Team not found')
      if (state.leadingTeamId === teamId) throw new BadRequestException(`${team.name} already holds the highest bid`)

      const tiers = parseIncrements(t.bidIncrements)
      const base = basePriceFor(player, t)
      const next = nextBidAmount(state.currentBid, base, tiers)
      if (opts.expected !== undefined && opts.expected !== next) {
        throw new ConflictException(`Price moved — the next bid is now ${next.toLocaleString('en-IN')}`)
      }
      const amount = opts.amount ?? next
      if (amount < next) throw new BadRequestException(`Bid must be at least ${next.toLocaleString('en-IN')}`)

      const squad = await tx.player.count({ where: { soldTeamId: teamId } })
      if (squad >= t.maxSquad) throw new BadRequestException(`${team.name} already has a full squad (${t.maxSquad})`)
      const maxBid = maxBidFor(team.purse, squad, t)
      if (amount > maxBid) {
        throw new BadRequestException(`${team.name} can bid at most ${maxBid.toLocaleString('en-IN')} (must keep money for ${Math.max(0, t.minSquad - squad - 1)} more players)`)
      }

      await tx.bid.create({ data: { tournamentId, playerId: player.id, teamId, amount, round: state.round, source: opts.source } })
      return {
        currentBid: amount,
        leadingTeamId: teamId,
        timerEndsAt: this.timer(t),
        lastEvent: { type: 'BID', playerId: player.id, teamId, amount, source: opts.source },
      }
    })
  }

  async sell(tournamentId: string, userId: string) {
    await this.tournaments.owned(tournamentId, userId)
    return this.act(tournamentId, async (ctx) => {
      const { tx, state } = ctx
      this.requireRunning(ctx.t)
      const player = await this.currentPlayer(ctx)
      if (!state.leadingTeamId || state.currentBid === null) throw new BadRequestException('No bids yet — mark the player unsold instead')
      const team = await tx.team.findUniqueOrThrow({ where: { id: state.leadingTeamId } })
      if (team.purse < state.currentBid) throw new BadRequestException(`${team.name} doesn't have enough purse left`)
      await tx.player.update({
        where: { id: player.id },
        data: { status: 'SOLD', soldTeamId: team.id, soldPrice: state.currentBid, soldAt: new Date() },
      })
      await tx.team.update({ where: { id: team.id }, data: { purse: { decrement: state.currentBid } } })
      return {
        timerEndsAt: null,
        lastEvent: { type: 'SOLD', playerId: player.id, name: player.name, teamId: team.id, teamName: team.name, amount: state.currentBid },
      }
    })
  }

  async unsold(tournamentId: string, userId: string) {
    await this.tournaments.owned(tournamentId, userId)
    return this.act(tournamentId, async (ctx) => {
      this.requireRunning(ctx.t)
      const player = await this.currentPlayer(ctx)
      await ctx.tx.player.update({ where: { id: player.id }, data: { status: 'UNSOLD' } })
      return { currentBid: null, leadingTeamId: null, timerEndsAt: null, lastEvent: { type: 'UNSOLD', playerId: player.id, name: player.name } }
    })
  }

  async undoBid(tournamentId: string, userId: string) {
    await this.tournaments.owned(tournamentId, userId)
    return this.act(tournamentId, async (ctx) => {
      const { tx, state } = ctx
      this.requireRunning(ctx.t)
      const player = await this.currentPlayer(ctx)
      const bids = await tx.bid.findMany({
        where: { playerId: player.id, round: state.round },
        orderBy: { createdAt: 'desc' },
        take: 2,
      })
      if (!bids.length) throw new BadRequestException('There is no bid to undo')
      await tx.bid.delete({ where: { id: bids[0].id } })
      const prev = bids[1]
      return {
        currentBid: prev?.amount ?? null,
        leadingTeamId: prev?.teamId ?? null,
        timerEndsAt: this.timer(ctx.t),
        lastEvent: { type: 'UNDO', playerId: player.id },
      }
    })
  }

  /** Reverse the hammer on the current player (sold or unsold) and reopen bidding. */
  async reopen(tournamentId: string, userId: string) {
    await this.tournaments.owned(tournamentId, userId)
    return this.act(tournamentId, async (ctx) => {
      const { tx, state } = ctx
      this.requireRunning(ctx.t)
      const player = await this.currentPlayer(ctx, 'DONE')
      if (player.status === 'SOLD' && player.soldTeamId && player.soldPrice) {
        await tx.team.update({ where: { id: player.soldTeamId }, data: { purse: { increment: player.soldPrice } } })
      }
      await tx.player.update({ where: { id: player.id }, data: { status: 'LIVE', soldTeamId: null, soldPrice: null, soldAt: null } })
      const last = await tx.bid.findFirst({ where: { playerId: player.id, round: state.round }, orderBy: { createdAt: 'desc' } })
      return {
        currentBid: last?.amount ?? null,
        leadingTeamId: last?.teamId ?? null,
        timerEndsAt: this.timer(ctx.t),
        lastEvent: { type: 'REOPEN', playerId: player.id, name: player.name },
      }
    })
  }

  /** Send the current player to the back of the queue without a result. */
  async skip(tournamentId: string, userId: string) {
    await this.tournaments.owned(tournamentId, userId)
    return this.act(tournamentId, async (ctx) => {
      const { tx, state } = ctx
      this.requireRunning(ctx.t)
      const player = await this.currentPlayer(ctx)
      await tx.bid.deleteMany({ where: { playerId: player.id, round: state.round } })
      await tx.player.update({ where: { id: player.id }, data: { status: 'AVAILABLE' } })
      const patch = await this.advance(ctx, [...state.queue, player.id])
      return { ...patch, timerEndsAt: patch.currentPlayerId ? this.timer(ctx.t) : null }
    })
  }

  async pause(tournamentId: string, userId: string, paused: boolean) {
    await this.tournaments.owned(tournamentId, userId)
    return this.act(tournamentId, async ({ tx, t }) => {
      if (paused && t.status !== 'LIVE') throw new BadRequestException('The auction is not live')
      if (!paused && t.status !== 'PAUSED') throw new BadRequestException('The auction is not paused')
      await tx.tournament.update({ where: { id: t.id }, data: { status: paused ? 'PAUSED' : 'LIVE' } })
      return { timerEndsAt: paused ? null : this.timer(t), lastEvent: { type: paused ? 'PAUSED' : 'RESUMED' } }
    })
  }

  /** Put every unsold player back into the queue for another round. */
  async reauction(tournamentId: string, userId: string) {
    await this.tournaments.owned(tournamentId, userId)
    return this.act(tournamentId, async (ctx) => {
      const { tx, t, state } = ctx
      this.requireRunning(t)
      if (state.currentPlayerId) {
        const cur = await tx.player.findUnique({ where: { id: state.currentPlayerId } })
        if (cur?.status === 'LIVE') throw new BadRequestException(`Finish bidding on ${cur.name} first`)
      }
      const unsold = await tx.player.findMany({
        where: { tournamentId, status: 'UNSOLD', approved: true },
        select: { id: true, serial: true, category: true },
      })
      if (!unsold.length) throw new BadRequestException('There are no unsold players')
      await tx.player.updateMany({ where: { id: { in: unsold.map((p) => p.id) } }, data: { status: 'AVAILABLE' } })
      const queue = [...state.queue, ...this.orderPlayers(unsold, t)]
      const patch = await this.advance(ctx, queue)
      return { ...patch, round: state.round + 1, timerEndsAt: this.timer(t), lastEvent: { ...patch.lastEvent, type: 'REAUCTION', count: unsold.length } }
    })
  }

  async finish(tournamentId: string, userId: string) {
    await this.tournaments.owned(tournamentId, userId)
    return this.act(tournamentId, async ({ tx, t, state }) => {
      if (t.status === 'COMPLETED') throw new BadRequestException('The auction is already complete')
      if (state.currentPlayerId) {
        await tx.player.updateMany({ where: { id: state.currentPlayerId, status: 'LIVE' }, data: { status: 'UNSOLD' } })
      }
      await tx.tournament.update({ where: { id: t.id }, data: { status: 'COMPLETED' } })
      return { currentPlayerId: null, currentBid: null, leadingTeamId: null, timerEndsAt: null, lastEvent: { type: 'COMPLETED' } }
    })
  }

  /**
   * One-click random auction (paid add-on). No bidding: players are drawn to teams grade by grade
   * (highest-priced category first, e.g. Marquee → A → B → C, uncategorised last), shuffled within
   * each grade. Each player goes to the team with the fewest players that can still afford them and
   * has squad room (ties broken at random), at their base price, which comes out of the purse.
   * Anyone who can't be placed is left unsold. The auction is complete when it returns.
   */
  async randomAuction(tournamentId: string, userId: string) {
    const t0 = await this.tournaments.owned(tournamentId, userId)
    if (t0.status !== 'DRAFT' && t0.status !== 'READY') throw new BadRequestException('Random auction can only run before the auction starts')
    const { limits, sequence } = await this.tournaments.plan(tournamentId)
    if (!limits.randomAuction) planLimit(`Random auction is a ₹${PRICING.randomAuction} add-on for this auction`)
    if (limits.auctionFeeDue) planLimit(`This is your auction #${sequence}. Your first ${PRICING.freeAuctions} are free; from your ${ordinal(PRICING.freeAuctions + 1)} on, each auction is ₹${PRICING.auctionFee}.`)

    const summary = await this.withLock(tournamentId, () =>
      this.prisma.$transaction(
        async (tx) => {
          const t = await tx.tournament.findUniqueOrThrow({ where: { id: tournamentId } })
          const teams = await tx.team.findMany({ where: { tournamentId }, select: { id: true } })
          if (teams.length < 2) throw new BadRequestException('Add at least 2 teams first')
          const players = await tx.player.findMany({
            where: { tournamentId, approved: true, status: 'AVAILABLE' },
            select: { id: true, serial: true, category: true, basePrice: true },
          })
          if (!players.length) throw new BadRequestException('Add or approve at least one player first')

          await tx.bid.deleteMany({ where: { tournamentId } })
          await resetPurses(tx, tournamentId, t.teamPurse)
          const fresh = await tx.team.findMany({ where: { tournamentId }, select: { id: true, purse: true, _count: { select: { players: true } } } })
          const book = new Map(fresh.map((x) => [x.id, { purse: x.purse, squad: x._count.players }]))

          const prices = (t.categoryBasePrices || {}) as Record<string, number>
          const grades = [...new Set(players.map((p) => p.category ?? ''))].sort((a, b) => {
            if (!a) return 1
            if (!b) return -1
            return (prices[b] ?? 0) - (prices[a] ?? 0) || a.localeCompare(b)
          })

          const now = new Date()
          let sold = 0
          let unsold = 0
          for (const grade of grades) {
            for (const p of shuffle(players.filter((x) => (x.category ?? '') === grade))) {
              const price = basePriceFor(p, t)
              const options = shuffle(fresh.map((x) => x.id)).filter((id) => {
                const b = book.get(id)!
                return b.squad < t.maxSquad && b.purse >= price
              })
              const teamId = options.sort((a, b) => book.get(a)!.squad - book.get(b)!.squad)[0]
              if (!teamId) {
                await tx.player.update({ where: { id: p.id }, data: { status: 'UNSOLD' } })
                unsold++
                continue
              }
              const b = book.get(teamId)!
              b.squad++
              b.purse -= price
              await tx.player.update({ where: { id: p.id }, data: { status: 'SOLD', soldTeamId: teamId, soldPrice: price, soldAt: new Date(now.getTime() + sold) } })
              sold++
            }
          }
          for (const [id, b] of book) await tx.team.update({ where: { id }, data: { purse: b.purse } })

          const lastEvent = { type: 'COMPLETED', at: Date.now(), random: true }
          await tx.auctionState.upsert({
            where: { tournamentId },
            create: { tournamentId, queue: [], round: 1, startedAt: now, lastEvent },
            update: { queue: [], round: 1, startedAt: now, currentPlayerId: null, currentBid: null, leadingTeamId: null, timerEndsAt: null, lastEvent, version: { increment: 1 } },
          })
          await tx.tournament.update({ where: { id: tournamentId }, data: { status: 'COMPLETED', setupComplete: true } })
          return { sold, unsold }
        },
        { timeout: 60_000 },
      ),
    )
    this.realtime.stateChanged(tournamentId)
    return summary
  }

  /** Wipe all results and return to the pre-auction state. */
  async reset(tournamentId: string, userId: string) {
    await this.tournaments.owned(tournamentId, userId)
    await this.withLock(tournamentId, () =>
      this.prisma.$transaction(async (tx) => {
        const t = await tx.tournament.findUniqueOrThrow({ where: { id: tournamentId } })
        await tx.bid.deleteMany({ where: { tournamentId } })
        // Retained players stay with their teams; everyone else goes back in the pool.
        await tx.player.updateMany({
          where: { tournamentId, retained: false },
          data: { status: 'AVAILABLE', soldTeamId: null, soldPrice: null, soldAt: null },
        })
        await resetPurses(tx, tournamentId, t.teamPurse)
        await tx.auctionState.deleteMany({ where: { tournamentId } })
        await tx.tournament.update({ where: { id: tournamentId }, data: { status: t.setupComplete ? 'READY' : 'DRAFT' } })
      }),
    )
    this.realtime.stateChanged(tournamentId)
    return { ok: true }
  }

  /** Full results for the organiser (includes contact details for export). */
  async results(tournamentId: string, userId: string) {
    const t = await this.tournaments.owned(tournamentId, userId)
    const [teams, players, bidCount] = await Promise.all([
      this.prisma.team.findMany({ where: { tournamentId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      this.prisma.player.findMany({ where: { tournamentId }, orderBy: [{ soldPrice: { sort: 'desc', nulls: 'last' } }, { serial: 'asc' }] }),
      this.prisma.bid.count({ where: { tournamentId } }),
    ])
    return { tournament: t, teams, players, bidCount }
  }
}
