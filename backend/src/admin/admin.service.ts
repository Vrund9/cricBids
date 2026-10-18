import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RealtimeService } from '../realtime/realtime.service'
import { AuthUser } from '../auth/jwt.guard'
import { adminEmails, isAdminUser } from '../common/admin'
import { loadSettings, PlatformSettings, settings, validateSetting } from '../common/settings'
import { billingMode } from '../common/plans'
import type { Prisma } from '../generated/prisma/client'
import type { PaymentKind } from '../generated/prisma/enums'

const DAY = 24 * 60 * 60 * 1000
const PAGE_SIZE = 25

export type UserFilter = 'all' | 'paid' | 'admins' | 'suspended' | 'google'

function page(n?: number) {
  const p = Math.max(1, Math.floor(Number(n) || 1))
  return { skip: (p - 1) * PAGE_SIZE, take: PAGE_SIZE, page: p }
}

/** Buckets dates into one count per day for the last `days` days (oldest first). */
function perDay(dates: Date[], days: number) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setTime(start.getTime() - (days - 1) * DAY)
  const counts = Array.from({ length: days }, (_, i) => ({ date: new Date(start.getTime() + i * DAY).toISOString().slice(0, 10), count: 0 }))
  for (const d of dates) {
    const i = Math.floor((d.getTime() - start.getTime()) / DAY)
    if (i >= 0 && i < days) counts[i].count++
  }
  return counts
}

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async onModuleInit() {
    loadSettings(await this.prisma.appSetting.findMany())
  }

  private audit(actor: AuthUser, action: string, targetType: string | null, targetId: string | null, details?: Prisma.InputJsonValue) {
    return this.prisma.auditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, action, targetType, targetId, details } })
  }

  private paidUserWhere(): Prisma.UserWhereInput {
    return { OR: [{ seasonPassUntil: { gt: new Date() } }, { tournaments: { some: { plan: 'PRO' } } }] }
  }

  // ───────────── Overview ─────────────

  async overview() {
    const now = Date.now()
    const d7 = new Date(now - 7 * DAY)
    const d30 = new Date(now - 30 * DAY)
    const [
      users, users7, users30, suspended, googleUsers, paidUsers, seasonPasses, proTournaments,
      tournaments, tournaments30, byStatus, players, bids, revenue, revenue30, payments30,
      signupDates, tournamentDates, recentUsers, recentPayments, live,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: d7 } } }),
      this.prisma.user.count({ where: { createdAt: { gte: d30 } } }),
      this.prisma.user.count({ where: { suspendedAt: { not: null } } }),
      this.prisma.user.count({ where: { googleId: { not: null } } }),
      this.prisma.user.count({ where: this.paidUserWhere() }),
      this.prisma.user.count({ where: { seasonPassUntil: { gt: new Date() } } }),
      this.prisma.tournament.count({ where: { plan: 'PRO' } }),
      this.prisma.tournament.count(),
      this.prisma.tournament.count({ where: { createdAt: { gte: d30 } } }),
      this.prisma.tournament.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.player.count(),
      this.prisma.bid.count(),
      this.prisma.payment.aggregate({ _sum: { amount: true } }),
      this.prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: d30 } } }),
      this.prisma.payment.count({ where: { createdAt: { gte: d30 } } }),
      this.prisma.user.findMany({ where: { createdAt: { gte: d30 } }, select: { createdAt: true } }),
      this.prisma.tournament.findMany({ where: { createdAt: { gte: d30 } }, select: { createdAt: true } }),
      this.prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true, googleId: true } }),
      this.prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 6, include: { user: { select: { id: true, name: true, email: true } }, tournament: { select: { id: true, name: true } } } }),
      this.liveTournaments(),
    ])
    return {
      users: { total: users, new7d: users7, new30d: users30, suspended, google: googleUsers, admins: adminEmails().length },
      paid: { users: paidUsers, seasonPasses, proTournaments },
      revenue: { total: revenue._sum.amount ?? 0, last30d: revenue30._sum.amount ?? 0, payments30d: payments30 },
      tournaments: {
        total: tournaments,
        new30d: tournaments30,
        byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
      },
      players,
      bids,
      charts: { signups: perDay(signupDates.map((u) => u.createdAt), 30), tournaments: perDay(tournamentDates.map((t) => t.createdAt), 30) },
      recentUsers: recentUsers.map(({ googleId, ...u }) => ({ ...u, google: !!googleId })),
      recentPayments,
      live,
      billingMode: billingMode(),
    }
  }

  liveTournaments() {
    return this.prisma.tournament.findMany({
      where: { status: { in: ['LIVE', 'PAUSED'] } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, name: true, status: true, plan: true, liveToken: true, updatedAt: true,
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { teams: true, players: true, bids: true } },
        state: { select: { startedAt: true } },
      },
    })
  }

  // ───────────── Users ─────────────

  async users(q: string | undefined, filter: UserFilter = 'all', pageNo?: number) {
    const and: Prisma.UserWhereInput[] = []
    if (q?.trim()) and.push({ OR: [{ name: { contains: q.trim(), mode: 'insensitive' } }, { email: { contains: q.trim(), mode: 'insensitive' } }] })
    if (filter === 'paid') and.push(this.paidUserWhere())
    if (filter === 'admins') and.push({ email: { in: adminEmails() } })
    if (filter === 'suspended') and.push({ suspendedAt: { not: null } })
    if (filter === 'google') and.push({ googleId: { not: null } })
    const where: Prisma.UserWhereInput = and.length ? { AND: and } : {}
    const { skip, take, page: p } = page(pageNo)
    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { tournaments: true, payments: true } },
          tournaments: { where: { plan: 'PRO' }, select: { id: true } },
        },
      }),
    ])
    return {
      total, page: p, pageSize: PAGE_SIZE,
      rows: rows.map((u) => this.userRow(u)),
    }
  }

  private userRow(u: Prisma.UserGetPayload<{ include: { _count: { select: { tournaments: true; payments: true } }; tournaments: { select: { id: true } } } }>) {
    const pass = !!u.seasonPassUntil && u.seasonPassUntil > new Date()
    return {
      id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl,
      createdAt: u.createdAt, lastLoginAt: u.lastLoginAt, suspendedAt: u.suspendedAt,
      isAdmin: isAdminUser(u),
      google: !!u.googleId, hasPassword: !!u.passwordHash,
      seasonPassUntil: u.seasonPassUntil, seasonPassActive: pass,
      proTournaments: u.tournaments.length,
      paid: pass || u.tournaments.length > 0,
      tournaments: u._count.tournaments, payments: u._count.payments,
    }
  }

  async user(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: { select: { tournaments: true, payments: true } },
        tournaments: { where: { plan: 'PRO' }, select: { id: true } },
      },
    })
    if (!u) throw new NotFoundException('User not found')
    const [tournaments, payments, activity] = await Promise.all([
      this.prisma.tournament.findMany({
        where: { ownerId: id }, orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, status: true, plan: true, createdAt: true, liveToken: true, _count: { select: { teams: true, players: true } } },
      }),
      this.prisma.payment.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, include: { tournament: { select: { id: true, name: true } } } }),
      this.prisma.auditLog.findMany({ where: { targetType: 'user', targetId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ])
    return { ...this.userRow(u), tournamentsList: tournaments, paymentsList: payments, activity }
  }

  async updateUser(actor: AuthUser, id: string, dto: { suspended?: boolean; name?: string }) {
    const u = await this.prisma.user.findUnique({ where: { id } })
    if (!u) throw new NotFoundException('User not found')
    if (dto.suspended === true && isAdminUser(u)) throw new BadRequestException("Admin accounts can't be suspended")
    const data: Prisma.UserUpdateInput = {}
    const changes: Record<string, unknown> = {}
    if (dto.suspended !== undefined && dto.suspended !== !!u.suspendedAt) { data.suspendedAt = dto.suspended ? new Date() : null; changes.suspended = dto.suspended }
    if (dto.name !== undefined && dto.name.trim() !== u.name) { data.name = dto.name.trim(); changes.name = { from: u.name, to: dto.name.trim() } }
    if (!Object.keys(changes).length) return this.user(id)
    await this.prisma.user.update({ where: { id }, data })
    const action = changes.suspended === true ? 'user.suspend' : changes.suspended === false ? 'user.unsuspend' : 'user.update'
    await this.audit(actor, action, 'user', id, { email: u.email, ...changes } as Prisma.InputJsonValue)
    return this.user(id)
  }

  async seasonPass(actor: AuthUser, id: string, dto: { action: 'grant' | 'revoke'; months?: number }) {
    const u = await this.prisma.user.findUnique({ where: { id } })
    if (!u) throw new NotFoundException('User not found')
    if (dto.action === 'revoke') {
      await this.prisma.user.update({ where: { id }, data: { seasonPassUntil: null } })
      await this.audit(actor, 'user.season_pass.revoke', 'user', id, { email: u.email })
    } else {
      const months = dto.months ?? 12
      const from = u.seasonPassUntil && u.seasonPassUntil > new Date() ? u.seasonPassUntil : new Date()
      const until = new Date(from)
      until.setMonth(until.getMonth() + months)
      await this.prisma.$transaction([
        this.prisma.user.update({ where: { id }, data: { seasonPassUntil: until } }),
        this.prisma.payment.create({ data: { userId: id, kind: 'SEASON_PASS', source: 'ADMIN', note: `Granted by ${actor.email} (${months} months)` } }),
      ])
      await this.audit(actor, 'user.season_pass.grant', 'user', id, { email: u.email, months, until: until.toISOString() })
    }
    // Plan changes affect every tournament this user owns.
    const owned = await this.prisma.tournament.findMany({ where: { ownerId: id }, select: { id: true } })
    owned.forEach((t) => this.realtime.stateChanged(t.id))
    return this.user(id)
  }

  async deleteUser(actor: AuthUser, id: string) {
    const u = await this.prisma.user.findUnique({ where: { id }, include: { _count: { select: { tournaments: true } } } })
    if (!u) throw new NotFoundException('User not found')
    if (isAdminUser(u)) throw new BadRequestException("Admin accounts can't be deleted from the admin panel")
    await this.prisma.user.delete({ where: { id } })
    await this.audit(actor, 'user.delete', 'user', id, { email: u.email, name: u.name, tournaments: u._count.tournaments })
    return { ok: true }
  }

  // ───────────── Tournaments ─────────────

  async tournaments(q: string | undefined, status?: string, plan?: string, pageNo?: number) {
    const and: Prisma.TournamentWhereInput[] = []
    if (q?.trim()) {
      and.push({ OR: [
        { name: { contains: q.trim(), mode: 'insensitive' } },
        { owner: { email: { contains: q.trim(), mode: 'insensitive' } } },
        { owner: { name: { contains: q.trim(), mode: 'insensitive' } } },
      ] })
    }
    if (status && ['DRAFT', 'READY', 'LIVE', 'PAUSED', 'COMPLETED'].includes(status)) and.push({ status: status as any })
    if (plan === 'PRO' || plan === 'FREE') and.push({ plan })
    const where: Prisma.TournamentWhereInput = and.length ? { AND: and } : {}
    const { skip, take, page: p } = page(pageNo)
    const [total, rows] = await Promise.all([
      this.prisma.tournament.count({ where }),
      this.prisma.tournament.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, status: true, plan: true, planActivatedAt: true, createdAt: true, updatedAt: true, liveToken: true, venue: true, auctionDate: true,
          owner: { select: { id: true, name: true, email: true, seasonPassUntil: true } },
          _count: { select: { teams: true, players: true, bids: true } },
        },
      }),
    ])
    return { total, page: p, pageSize: PAGE_SIZE, rows }
  }

  async setTournamentPlan(actor: AuthUser, id: string, plan: 'FREE' | 'PRO') {
    const t = await this.prisma.tournament.findUnique({ where: { id }, select: { id: true, name: true, plan: true, ownerId: true } })
    if (!t) throw new NotFoundException('Tournament not found')
    if (t.plan === plan) return { ok: true }
    await this.prisma.$transaction([
      this.prisma.tournament.update({ where: { id }, data: { plan, planActivatedAt: plan === 'PRO' ? new Date() : null } }),
      ...(plan === 'PRO'
        ? [this.prisma.payment.create({ data: { userId: t.ownerId, tournamentId: id, kind: 'TOURNAMENT_PRO', source: 'ADMIN', note: `Granted by ${actor.email}` } })]
        : []),
    ])
    await this.audit(actor, plan === 'PRO' ? 'tournament.upgrade' : 'tournament.downgrade', 'tournament', id, { name: t.name, from: t.plan, to: plan })
    this.realtime.stateChanged(id)
    return { ok: true }
  }

  // ───────────── Payments ─────────────

  async payments(kind?: string, source?: string, pageNo?: number) {
    const where: Prisma.PaymentWhereInput = {}
    if (kind && ['TOURNAMENT_PRO', 'SEASON_PASS', 'EXTRA_TEAMS', 'THEME_UNLOCK', 'AUCTION_FEE'].includes(kind)) where.kind = kind as PaymentKind
    if (source === 'DEMO' || source === 'ADMIN' || source === 'GATEWAY') where.source = source
    const { skip, take, page: p } = page(pageNo)
    const [total, rows, sum, byKind] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } }, tournament: { select: { id: true, name: true } } },
      }),
      this.prisma.payment.aggregate({ where, _sum: { amount: true } }),
      this.prisma.payment.groupBy({ by: ['kind', 'source'], _count: { _all: true }, _sum: { amount: true } }),
    ])
    return {
      total, page: p, pageSize: PAGE_SIZE, rows,
      amount: sum._sum.amount ?? 0,
      breakdown: byKind.map((b) => ({ kind: b.kind, source: b.source, count: b._count._all, amount: b._sum.amount ?? 0 })),
    }
  }

  // ───────────── Settings & audit ─────────────

  getSettings() {
    return { settings: settings(), effectiveBillingMode: billingMode(), adminEmails: adminEmails() }
  }

  async updateSettings(actor: AuthUser, patch: Partial<Record<keyof PlatformSettings, unknown>>) {
    const before = settings()
    const changes: Record<string, { from: unknown; to: unknown }> = {}
    const valid: Partial<PlatformSettings> = {}
    for (const key of Object.keys(patch) as (keyof PlatformSettings)[]) {
      if (patch[key] === undefined) continue
      const value = validateSetting(key, patch[key])
      if (JSON.stringify(value) !== JSON.stringify(before[key])) {
        Object.assign(valid, { [key]: value })
        changes[key] = { from: before[key], to: value }
      }
    }
    const keys = Object.keys(valid) as (keyof PlatformSettings)[]
    if (!keys.length) return this.getSettings()
    await this.prisma.$transaction(
      keys.map((key) => {
        const value = (valid[key] ?? null) as Prisma.InputJsonValue
        return this.prisma.appSetting.upsert({ where: { key }, create: { key, value, updatedById: actor.id }, update: { value, updatedById: actor.id } })
      }),
    )
    loadSettings(await this.prisma.appSetting.findMany())
    await this.audit(actor, 'settings.update', 'settings', null, changes as Prisma.InputJsonValue)
    return this.getSettings()
  }

  async auditLog(pageNo?: number) {
    const { skip, take, page: p } = page(pageNo)
    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.findMany({ skip, take, orderBy: { createdAt: 'desc' } }),
    ])
    return { total, page: p, pageSize: PAGE_SIZE, rows }
  }
}
