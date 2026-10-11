import { Logger, OnModuleDestroy } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import {
  ConnectedSocket, MessageBody, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets'
import type { Namespace, Socket } from 'socket.io'
import { Subscription } from 'rxjs'
import { PrismaService } from '../prisma/prisma.service'
import { RealtimeService } from '../realtime/realtime.service'
import { SnapshotService } from './snapshot.service'
import { allowedOrigins } from '../common/origins'
import type { JwtPayload } from '../auth/jwt.guard'

const room = (id: string) => `t:${id}`
const ownerRoom = (id: string) => `o:${id}`

/**
 * Realtime channel. Anyone holding a live link joins `t:<id>` and receives a full
 * snapshot whenever the auction changes. Full snapshots (rather than diffs) make
 * reconnecting phones on flaky venue Wi-Fi trivially correct.
 */
@WebSocketGateway({ namespace: '/live', cors: { origin: allowedOrigins(), credentials: true }, pingInterval: 10000, pingTimeout: 8000 })
export class AuctionGateway implements OnGatewayInit, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer() server: Namespace
  private readonly logger = new Logger(AuctionGateway.name)
  private sub?: Subscription
  private readonly pending = new Map<string, NodeJS.Timeout>()
  private readonly viewerTimers = new Map<string, NodeJS.Timeout>()

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly snapshots: SnapshotService,
    private readonly jwt: JwtService,
  ) {}

  afterInit() {
    this.sub = this.realtime.changes$.subscribe((e) => {
      if (e.kind === 'registration') {
        this.server.to(ownerRoom(e.tournamentId)).emit('registration', e.payload)
        return
      }
      // Coalesce bursts (e.g. bulk import) into one broadcast.
      if (this.pending.has(e.tournamentId)) return
      this.pending.set(
        e.tournamentId,
        setTimeout(() => {
          this.pending.delete(e.tournamentId)
          void this.broadcast(e.tournamentId)
        }, 40),
      )
    })
  }

  onModuleDestroy() {
    this.sub?.unsubscribe()
  }

  private async broadcast(tournamentId: string) {
    try {
      const snap = await this.snapshots.build(tournamentId)
      if (snap) this.server.to(room(tournamentId)).emit('state', snap)
    } catch (err) {
      this.logger.error(`Broadcast failed for ${tournamentId}`, err as Error)
    }
  }

  private emitViewers(tournamentId: string) {
    if (this.viewerTimers.has(tournamentId)) return
    this.viewerTimers.set(
      tournamentId,
      setTimeout(() => {
        this.viewerTimers.delete(tournamentId)
        const count = this.server.adapter.rooms.get(room(tournamentId))?.size ?? 0
        this.server.to(room(tournamentId)).emit('viewers', { count })
      }, 500),
    )
  }

  @SubscribeMessage('join')
  async join(@ConnectedSocket() client: Socket, @MessageBody() body: { liveToken?: string }) {
    const token = typeof body?.liveToken === 'string' ? body.liveToken : ''
    const t = token ? await this.prisma.tournament.findUnique({ where: { liveToken: token }, select: { id: true } }) : null
    if (!t) return { ok: false, error: 'This live link is invalid or has been reset' }
    await client.join(room(t.id))
    client.data.tournamentId = t.id
    this.emitViewers(t.id)
    return { ok: true, state: await this.snapshots.build(t.id) }
  }

  /** Organiser dashboards also get private events like new registrations. */
  @SubscribeMessage('join-owner')
  async joinOwner(@ConnectedSocket() client: Socket, @MessageBody() body: { tournamentId?: string; token?: string }) {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(String(body?.token || ''))
      const t = await this.prisma.tournament.findUnique({ where: { id: String(body?.tournamentId || '') }, select: { id: true, ownerId: true } })
      if (!t || t.ownerId !== payload.sub) return { ok: false, error: 'Forbidden' }
      await client.join([room(t.id), ownerRoom(t.id)])
      client.data.tournamentId = t.id
      this.emitViewers(t.id)
      return { ok: true, state: await this.snapshots.build(t.id) }
    } catch {
      return { ok: false, error: 'Unauthorized' }
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data?.tournamentId) this.emitViewers(client.data.tournamentId)
  }
}
