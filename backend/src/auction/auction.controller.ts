import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common'
import { IsInt, IsOptional, IsString, Min } from 'class-validator'
import { SkipThrottle } from '@nestjs/throttler'
import { AuthUser, CurrentUser, JwtAuthGuard } from '../auth/jwt.guard'
import { TournamentsService } from '../tournaments/tournaments.service'
import { AuctionService } from './auction.service'
import { SnapshotService } from './snapshot.service'

class BidDto {
  @IsString()
  teamId: string

  /** Optional jump bid. Defaults to the next increment. */
  @IsOptional() @IsInt() @Min(1)
  amount?: number
}

/** Organiser control room. Every action broadcasts a fresh snapshot to all viewers. */
@Controller('tournaments/:id/auction')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class AuctionController {
  constructor(
    private readonly auction: AuctionService,
    private readonly snapshots: SnapshotService,
    private readonly tournaments: TournamentsService,
  ) {}

  @Get()
  async state(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    await this.tournaments.owned(id, u.id)
    return this.snapshots.build(id)
  }

  @Get('results')
  results(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.auction.results(id, u.id)
  }

  @Post('start') @HttpCode(200)
  start(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.auction.start(id, u.id)
  }

  @Post('next') @HttpCode(200)
  next(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.auction.next(id, u.id)
  }

  @Post('bid') @HttpCode(200)
  async bid(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: BidDto) {
    await this.tournaments.owned(id, u.id)
    return this.auction.bid(id, dto.teamId, { amount: dto.amount, source: 'AUCTIONEER' })
  }

  @Post('sell') @HttpCode(200)
  sell(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.auction.sell(id, u.id)
  }

  @Post('unsold') @HttpCode(200)
  unsold(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.auction.unsold(id, u.id)
  }

  @Post('undo') @HttpCode(200)
  undo(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.auction.undoBid(id, u.id)
  }

  @Post('reopen') @HttpCode(200)
  reopen(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.auction.reopen(id, u.id)
  }

  @Post('skip') @HttpCode(200)
  skip(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.auction.skip(id, u.id)
  }

  @Post('pause') @HttpCode(200)
  pause(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.auction.pause(id, u.id, true)
  }

  @Post('resume') @HttpCode(200)
  resume(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.auction.pause(id, u.id, false)
  }

  @Post('reauction') @HttpCode(200)
  reauction(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.auction.reauction(id, u.id)
  }

  @Post('finish') @HttpCode(200)
  finish(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.auction.finish(id, u.id)
  }

  @Post('reset') @HttpCode(200)
  reset(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.auction.reset(id, u.id)
  }
}
