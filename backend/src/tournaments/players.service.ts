import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RealtimeService } from '../realtime/realtime.service'
import { cleanCategory, cleanStr, normalizePhotoUrl, normalizeRole } from '../common/util'
import { isStarted, TournamentsService } from './tournaments.service'
import { ImportPlayersDto, PlayerInputDto, UpdatePlayerDto } from './tournament.dto'
import { Prisma } from '../generated/prisma/client'
import type { PlayerSource } from '../generated/prisma/enums'
import { planLimit } from '../common/plans'

const dedupeKey = (name: string, phone?: string | null) =>
  `${name.trim().toLowerCase().replace(/\s+/g, ' ')}|${(phone || '').replace(/\D/g, '').slice(-10)}`

export interface NewPlayer {
  name: string
  role?: string
  category?: string | null
  battingStyle?: string
  bowlingStyle?: string
  phone?: string
  email?: string
  city?: string
  age?: number
  photoUrl?: string | null
  basePrice?: number | null
  extra?: Record<string, string>
  approved?: boolean
}

@Injectable()
export class PlayersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tournaments: TournamentsService,
    private readonly realtime: RealtimeService,
  ) {}

  private toData(p: NewPlayer) {
    return {
      name: p.name.trim().replace(/\s+/g, ' '),
      role: normalizeRole(p.role),
      category: cleanCategory(p.category),
      battingStyle: cleanStr(p.battingStyle, 60),
      bowlingStyle: cleanStr(p.bowlingStyle, 60),
      phone: cleanStr(p.phone, 30),
      email: cleanStr(p.email, 120)?.toLowerCase(),
      city: cleanStr(p.city, 80),
      age: p.age,
      photoUrl: normalizePhotoUrl(p.photoUrl) ?? null,
      basePrice: p.basePrice && p.basePrice > 0 ? p.basePrice : null,
      extra: p.extra && Object.keys(p.extra).length ? (p.extra as any) : undefined,
    }
  }

  /**
   * Fit incoming categories to the tournament: dropped entirely when it isn't category-wise,
   * otherwise any new category (from Excel or a manual edit) joins the tournament's list.
   */
  private async fitCategories<T extends { category?: string | null }>(tournamentId: string, rows: T[]): Promise<T[]> {
    const t = await this.prisma.tournament.findUniqueOrThrow({ where: { id: tournamentId }, select: { useCategories: true, categoryList: true } })
    if (!t.useCategories) return rows.map((r) => (r.category === undefined ? r : { ...r, category: null }))
    const fresh = [...new Set(rows.map((r) => cleanCategory(r.category)).filter((c): c is string => !!c && !t.categoryList.includes(c)))]
    if (fresh.length) await this.prisma.tournament.update({ where: { id: tournamentId }, data: { categoryList: [...t.categoryList, ...fresh].slice(0, 40) } })
    return rows
  }

  list(tournamentId: string) {
    return this.prisma.player.findMany({ where: { tournamentId }, orderBy: { serial: 'asc' } })
  }

  /**
   * Insert players with sequential serial numbers. Serial allocation can race with
   * concurrent form submissions, so retry on a unique-constraint clash.
   */
  async insertMany(tournamentId: string, players: NewPlayer[], source: PlayerSource) {
    const { limits } = await this.tournaments.plan(tournamentId)
    const existing = await this.prisma.player.count({ where: { tournamentId } })
    if (existing + players.length > limits.maxPlayers) {
      if (source === 'FORM') planLimit('Registrations for this tournament are full. Please contact the organiser.')
      throw new BadRequestException(`An auction can have up to ${limits.maxPlayers} players (you have ${existing}, adding ${players.length})`)
    }
    players = await this.fitCategories(tournamentId, players)
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const created = await this.prisma.$transaction(async (tx) => {
          const max = await tx.player.aggregate({ where: { tournamentId }, _max: { serial: true } })
          let serial = max._max.serial ?? 0
          return tx.player.createManyAndReturn({
            data: players.map((p) => ({
              ...this.toData(p),
              tournamentId,
              source,
              approved: p.approved ?? true,
              serial: ++serial,
            })),
          })
        })
        await this.appendToLiveQueue(tournamentId, created.filter((p) => p.approved).map((p) => p.id))
        return created
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && attempt < 4) continue
        throw e
      }
    }
    throw new BadRequestException('Could not save players, please retry')
  }

  /** Players added while an auction is running join the end of the queue. */
  async appendToLiveQueue(tournamentId: string, ids: string[]) {
    if (!ids.length) return
    const state = await this.prisma.auctionState.findUnique({ where: { tournamentId } })
    if (!state) return
    await this.prisma.auctionState.update({
      where: { tournamentId },
      data: { queue: { push: ids }, version: { increment: 1 } },
    })
    this.realtime.stateChanged(tournamentId)
  }

  async create(tournamentId: string, userId: string, dto: PlayerInputDto) {
    await this.tournaments.editable(tournamentId, userId)
    const [player] = await this.insertMany(tournamentId, [dto], 'MANUAL')
    this.realtime.stateChanged(tournamentId)
    return player
  }

  async import(tournamentId: string, userId: string, dto: ImportPlayersDto) {
    const t = await this.tournaments.editable(tournamentId, userId)
    if (dto.mode === 'replace') {
      if (isStarted(t)) throw new BadRequestException('Players cannot be replaced after the auction has started')
      await this.prisma.player.deleteMany({ where: { tournamentId } })
    }
    const existing = await this.prisma.player.findMany({ where: { tournamentId }, select: { name: true, phone: true } })
    const seen = new Set(existing.map((p) => dedupeKey(p.name, p.phone)))
    const fresh: NewPlayer[] = []
    let duplicates = 0
    for (const p of dto.players) {
      if (!p.name?.trim()) continue
      const key = dedupeKey(p.name, p.phone)
      if (seen.has(key)) {
        duplicates++
        continue
      }
      seen.add(key)
      fresh.push(p)
    }
    const created = fresh.length ? await this.insertMany(tournamentId, fresh, 'EXCEL') : []
    this.realtime.stateChanged(tournamentId)
    return { created: created.length, duplicates, total: dto.players.length }
  }

  private async ownedPlayer(tournamentId: string, playerId: string, userId: string) {
    const t = await this.tournaments.editable(tournamentId, userId)
    const player = await this.prisma.player.findFirst({ where: { id: playerId, tournamentId } })
    if (!player) throw new NotFoundException('Player not found')
    return { t, player }
  }

  async update(tournamentId: string, playerId: string, userId: string, dto: UpdatePlayerDto) {
    const { player } = await this.ownedPlayer(tournamentId, playerId, userId)
    const { approved, ...input } = dto
    const [fields] = await this.fitCategories(tournamentId, [input])
    const data: Record<string, unknown> = {}
    const mapped = this.toData({ ...player, ...fields, name: fields.name ?? player.name } as NewPlayer)
    // Keys present in the request are applied; an empty value clears the field.
    for (const key of Object.keys(fields) as (keyof typeof mapped)[]) {
      if (!(key in mapped)) continue
      data[key] = key === 'name' || key === 'role' ? mapped[key] : (mapped[key] ?? null)
    }
    if (approved !== undefined) data.approved = approved
    const updated = await this.prisma.player.update({ where: { id: playerId }, data })
    if (approved === true && !player.approved) await this.appendToLiveQueue(tournamentId, [playerId])
    this.realtime.stateChanged(tournamentId)
    return updated
  }

  async remove(tournamentId: string, playerId: string, userId: string) {
    const { player } = await this.ownedPlayer(tournamentId, playerId, userId)
    if (player.status === 'LIVE' || player.status === 'SOLD') {
      throw new BadRequestException('A player who is live or already sold cannot be deleted')
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.player.delete({ where: { id: playerId } })
      const state = await tx.auctionState.findUnique({ where: { tournamentId } })
      if (state?.queue.includes(playerId)) {
        await tx.auctionState.update({
          where: { tournamentId },
          data: { queue: state.queue.filter((id) => id !== playerId), version: { increment: 1 } },
        })
      }
    })
    this.realtime.stateChanged(tournamentId)
    return { ok: true }
  }

  async bulkApprove(tournamentId: string, userId: string, ids: string[], approved: boolean) {
    await this.tournaments.editable(tournamentId, userId)
    const targets = await this.prisma.player.findMany({
      where: { tournamentId, id: { in: ids }, approved: !approved, status: 'AVAILABLE' },
      select: { id: true },
    })
    await this.prisma.player.updateMany({ where: { id: { in: targets.map((t) => t.id) } }, data: { approved } })
    if (approved) await this.appendToLiveQueue(tournamentId, targets.map((t) => t.id))
    this.realtime.stateChanged(tournamentId)
    return { updated: targets.length }
  }

  async bulkCategory(tournamentId: string, userId: string, ids: string[], category: string | null) {
    const t = await this.tournaments.editable(tournamentId, userId)
    if (!t.useCategories) throw new BadRequestException('This tournament doesn’t use categories — turn them on in tournament settings first')
    const [fitted] = await this.fitCategories(tournamentId, [{ category }])
    const res = await this.prisma.player.updateMany({
      where: { tournamentId, id: { in: ids } },
      data: { category: cleanCategory(fitted.category) },
    })
    return { updated: res.count }
  }
}
