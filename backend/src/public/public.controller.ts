import {
  BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, HttpCode, NotFoundException, Param, Post,
  UploadedFile, UseInterceptors,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { IsInt, Min } from 'class-validator'
import { PrismaService } from '../prisma/prisma.service'
import { RealtimeService } from '../realtime/realtime.service'
import { SnapshotService, PUBLIC_PLAYER_SELECT } from '../auction/snapshot.service'
import { AuctionService } from '../auction/auction.service'
import { PlayersService } from '../tournaments/players.service'
import { fieldsFor, parseSubmission } from '../common/registration'
import { imageUpload, publicUrl } from '../uploads/uploads'
import { planInfo, PLAN_OWNER_SELECT, publicTheme } from '../common/plans'

class RemoteBidDto {
  /** The price the team owner saw on screen; rejected if someone bid in between. */
  @IsInt() @Min(1)
  expected: number
}

/** Endpoints reachable through shared links — no login, scoped by unguessable tokens. */
@Controller('public')
export class PublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshots: SnapshotService,
    private readonly auction: AuctionService,
    private readonly players: PlayersService,
    private readonly realtime: RealtimeService,
  ) {}

  private async byLiveToken(token: string) {
    const t = await this.prisma.tournament.findUnique({ where: { liveToken: token }, include: { owner: { select: PLAN_OWNER_SELECT } } })
    if (!t) throw new NotFoundException('This live link is invalid or has been reset')
    return t
  }

  @Get('live/:token')
  async live(@Param('token') token: string) {
    const t = await this.byLiveToken(token)
    return this.snapshots.build(t.id)
  }

  /** Lightweight info for SEO metadata and link previews (WhatsApp, X, etc.). */
  @Get('live/:token/meta')
  async liveMeta(@Param('token') token: string) {
    const t = await this.byLiveToken(token)
    const [teams, players, sold, top] = await Promise.all([
      this.prisma.team.count({ where: { tournamentId: t.id } }),
      this.prisma.player.count({ where: { tournamentId: t.id, approved: true } }),
      this.prisma.player.aggregate({ where: { tournamentId: t.id, status: 'SOLD' }, _count: true, _sum: { soldPrice: true } }),
      this.prisma.player.findFirst({ where: { tournamentId: t.id, status: 'SOLD' }, orderBy: { soldPrice: 'desc' }, select: { name: true, soldPrice: true } }),
    ])
    return {
      name: t.name,
      logoUrl: t.logoUrl,
      venue: t.venue,
      auctionDate: t.auctionDate,
      status: t.status,
      currency: t.currency,
      teams,
      players,
      sold: sold._count,
      totalSpent: sold._sum.soldPrice ?? 0,
      topBuy: top,
      theme: publicTheme(t.theme, planInfo(t, t.owner).limits),
    }
  }

  @Get('live/:token/squads')
  async squads(@Param('token') token: string) {
    const t = await this.byLiveToken(token)
    const [teams, unsold] = await Promise.all([
      this.prisma.team.findMany({
        where: { tournamentId: t.id },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true, name: true, shortName: true, color: true, logoUrl: true, purse: true, ownerName: true,
          players: { select: PUBLIC_PLAYER_SELECT, orderBy: { soldPrice: 'desc' } },
        },
      }),
      this.prisma.player.findMany({ where: { tournamentId: t.id, status: 'UNSOLD' }, select: PUBLIC_PLAYER_SELECT, orderBy: { serial: 'asc' } }),
    ])
    return { teams, unsold }
  }

  // ── Player self-registration ──

  private async byRegToken(token: string) {
    const t = await this.prisma.tournament.findUnique({ where: { registrationToken: token }, include: { owner: { select: PLAN_OWNER_SELECT } } })
    if (!t) throw new NotFoundException('This registration link is invalid or has been reset')
    return t
  }

  @Get('register/:token')
  async form(@Param('token') token: string) {
    const t = await this.byRegToken(token)
    const count = await this.prisma.player.count({ where: { tournamentId: t.id, source: 'FORM' } })
    return {
      tournament: { name: t.name, logoUrl: t.logoUrl, venue: t.venue, auctionDate: t.auctionDate, description: t.description },
      open: t.registrationOpen && t.status !== 'COMPLETED',
      requireApproval: t.requireApproval,
      fields: fieldsFor(t).filter((f) => f.enabled),
      registrations: count,
      theme: publicTheme(t.theme, planInfo(t, t.owner).limits),
    }
  }

  @Post('register/:token')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  async register(@Param('token') token: string, @Body() body: Record<string, unknown>) {
    const t = await this.byRegToken(token)
    if (!t.registrationOpen || t.status === 'COMPLETED') throw new ForbiddenException('Registrations are closed for this tournament')
    if (!body || typeof body !== 'object') throw new BadRequestException('Invalid submission')
    const data = parseSubmission(fieldsFor(t), body)
    if (data.phone) {
      const digits = data.phone.replace(/\D/g, '').slice(-10)
      const existing = await this.prisma.player.findMany({ where: { tournamentId: t.id, phone: { not: null } }, select: { phone: true, serial: true } })
      const dup = existing.find((p) => p.phone!.replace(/\D/g, '').slice(-10) === digits)
      if (dup) throw new ConflictException(`This mobile number is already registered (player #${dup.serial})`)
    }
    const [player] = await this.players.insertMany(t.id, [{ ...data, approved: !t.requireApproval }], 'FORM')
    this.realtime.playerRegistered(t.id, { id: player.id, name: player.name, role: player.role })
    this.realtime.stateChanged(t.id)
    return { serial: player.serial, name: player.name, approved: player.approved }
  }

  @Post('register/:token/photo')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(imageUpload)
  async registerPhoto(@Param('token') token: string, @UploadedFile() file: Express.Multer.File) {
    const t = await this.byRegToken(token)
    if (!t.registrationOpen) throw new ForbiddenException('Registrations are closed for this tournament')
    return publicUrl(file)
  }

  // ── Team owner remote paddle ──

  private async byBidToken(token: string) {
    const team = await this.prisma.team.findUnique({ where: { bidToken: token }, include: { tournament: true } })
    if (!team) throw new NotFoundException('This team link is invalid or has been reset')
    return team
  }

  @Get('bid/:token')
  async paddle(@Param('token') token: string) {
    const team = await this.byBidToken(token)
    return {
      team: { id: team.id, name: team.name, shortName: team.shortName, color: team.color, logoUrl: team.logoUrl },
      tournament: { name: team.tournament.name, logoUrl: team.tournament.logoUrl, liveToken: team.tournament.liveToken, remoteBidding: team.tournament.remoteBidding },
      state: await this.snapshots.build(team.tournamentId),
    }
  }

  @Post('bid/:token')
  @HttpCode(200)
  @Throttle({ default: { limit: 40, ttl: 10_000 } })
  async remoteBid(@Param('token') token: string, @Body() dto: RemoteBidDto) {
    const team = await this.byBidToken(token)
    return this.auction.bid(team.tournamentId, team.id, { expected: dto.expected, source: 'REMOTE' })
  }
}
