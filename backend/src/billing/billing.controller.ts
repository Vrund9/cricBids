import { BadRequestException, Body, Controller, Get, HttpCode, HttpException, HttpStatus, NotFoundException, Param, Post, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'
import { AuthUser, CurrentUser, JwtAuthGuard } from '../auth/jwt.guard'
import { PrismaService } from '../prisma/prisma.service'
import { TournamentsService } from '../tournaments/tournaments.service'
import { RealtimeService } from '../realtime/realtime.service'
import { billingMode, PRICING } from '../common/plans'
import { discounted, rewardDiscount } from '../common/rewards'
import type { PaymentKind } from '../generated/prisma/enums'

class CheckoutDto {
  /** Total paid extra teams wanted (on top of the free allowance). Only the increase is charged. */
  @IsOptional() @IsInt() @Min(0) @Max(50) extraTeams?: number
  @IsOptional() @IsBoolean() theme?: boolean
  @IsOptional() @IsBoolean() auctionFee?: boolean
  @IsOptional() @IsBoolean() randomAuction?: boolean
  /** Pro for this auction: replaces every individual add-on */
  @IsOptional() @IsBoolean() pro?: boolean
  /** Spend reward points: whole blocks of 100 points = 10% off each, up to 50% */
  @IsOptional() @IsBoolean() usePoints?: boolean
}

class RedeemDto {
  @IsString() @MinLength(4) @MaxLength(40) code: string
}

interface Line {
  kind: PaymentKind
  quantity: number
  amount: number
  label: string
}

/**
 * Pay-per-use purchases for a tournament. In BILLING_MODE=demo (default outside production)
 * purchases activate instantly without charging — swap `charge()` for Razorpay/Stripe checkout
 * + webhook to go live.
 */
@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tournaments: TournamentsService,
    private readonly realtime: RealtimeService,
  ) {}

  private charge() {
    if (billingMode() !== 'demo') {
      throw new HttpException('Online payments are not configured yet. Contact support to upgrade.', HttpStatus.PAYMENT_REQUIRED)
    }
  }

  /** What the requested add-ons cost, given what the tournament already owns. */
  private async lines(id: string, dto: CheckoutDto) {
    const info = await this.tournaments.plan(id)
    if (dto.pro) return { info, lines: [{ kind: 'TOURNAMENT_PRO' as PaymentKind, quantity: 1, amount: PRICING.pro, label: 'Pro for this auction' }], wantTeams: info.purchases.extraTeams }
    const lines: Line[] = []
    const room = info.limits.teamCap - info.limits.includedTeams
    const wantTeams = Math.min(room, dto.extraTeams ?? info.purchases.extraTeams)
    const newTeams = Math.max(0, wantTeams - info.purchases.extraTeams)
    if (newTeams) lines.push({ kind: 'EXTRA_TEAMS', quantity: newTeams, amount: newTeams * PRICING.perExtraTeam, label: `${newTeams} extra team${newTeams === 1 ? '' : 's'}` })
    if (dto.theme && !info.limits.customTheme) lines.push({ kind: 'THEME_UNLOCK', quantity: 1, amount: PRICING.themeUnlock, label: 'Theme customisation' })
    if (dto.randomAuction && !info.limits.randomAuction) lines.push({ kind: 'RANDOM_AUCTION', quantity: 1, amount: PRICING.randomAuction, label: 'Random auction' })
    if (dto.auctionFee && info.limits.auctionFeeDue) lines.push({ kind: 'AUCTION_FEE', quantity: 1, amount: PRICING.auctionFee, label: `Auction fee (auction #${info.sequence})` })
    return { info, lines, wantTeams }
  }

  @Post('tournaments/:id/checkout')
  @HttpCode(200)
  async checkout(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: CheckoutDto) {
    const t = await this.tournaments.owned(id, u.id)
    if (t.status === 'COMPLETED') throw new BadRequestException('This auction is complete')
    const { info, lines, wantTeams } = await this.lines(id, dto)
    if (info.plan === 'PRO') throw new BadRequestException('This auction already has everything unlocked')
    if (!lines.length) throw new BadRequestException('Nothing to buy — those add-ons are already active')
    this.charge()

    const subtotal = lines.reduce((a, l) => a + l.amount, 0)
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: u.id }, select: { rewardPoints: true } })
    const { pct, pointsUsed } = dto.usePoints ? rewardDiscount(user.rewardPoints) : { pct: 0, pointsUsed: 0 }

    await this.prisma.$transaction(async (tx) => {
      if (pointsUsed) {
        const r = await tx.user.updateMany({ where: { id: u.id, rewardPoints: { gte: pointsUsed } }, data: { rewardPoints: { decrement: pointsUsed } } })
        if (!r.count) throw new BadRequestException('Not enough reward points — refresh and try again')
      }
      await tx.tournament.update({
        where: { id },
        data: {
          extraTeams: wantTeams > info.purchases.extraTeams ? wantTeams : undefined,
          themeUnlocked: lines.some((l) => l.kind === 'THEME_UNLOCK') ? true : undefined,
          auctionFeePaid: lines.some((l) => l.kind === 'AUCTION_FEE') ? true : undefined,
          randomUnlocked: lines.some((l) => l.kind === 'RANDOM_AUCTION') ? true : undefined,
          ...(lines.some((l) => l.kind === 'TOURNAMENT_PRO') ? { plan: 'PRO' as const, planActivatedAt: new Date() } : {}),
        },
      })
      // Demo mode charges nothing, so the collected amount stays 0; list price and discount are kept for reference.
      for (const [i, l] of lines.entries()) {
        await tx.payment.create({
          data: {
            userId: u.id,
            tournamentId: id,
            kind: l.kind,
            source: 'DEMO',
            quantity: l.quantity,
            listPrice: l.amount,
            discountPct: pct,
            pointsUsed: i === 0 ? pointsUsed : 0,
            note: pct ? `${l.label} · ${pct}% reward discount → ₹${discounted(l.amount, pct)}` : l.label,
          },
        })
      }
    })
    this.realtime.stateChanged(id)
    const after = await this.prisma.user.findUniqueOrThrow({ where: { id: u.id }, select: { rewardPoints: true } })
    return {
      plan: await this.tournaments.plan(id),
      receipt: { lines, subtotal, discountPct: pct, pointsUsed, total: discounted(subtotal, pct), rewardPoints: after.rewardPoints },
    }
  }

  /** A one-time code from the BidWicket team: unlocks everything on this account until revoked. */
  @Post('redeem-code')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 8 } })
  async redeem(@CurrentUser() u: AuthUser, @Body() dto: RedeemDto) {
    const code = await this.prisma.planCode.findUnique({ where: { code: dto.code.trim().toUpperCase() } })
    if (!code || code.revokedAt) throw new NotFoundException('That code isn’t valid')
    if (code.redeemedById && code.redeemedById !== u.id) throw new BadRequestException('That code has already been used by another account')
    const already = await this.prisma.planCode.findUnique({ where: { redeemedById: u.id } })
    if (already && already.id !== code.id && !already.revokedAt) throw new BadRequestException('Your account already has full access from a plan code')
    await this.prisma.$transaction(async (tx) => {
      // A revoked code previously on this account is detached so the unique link can move.
      if (already && already.id !== code.id) await tx.planCode.update({ where: { id: already.id }, data: { redeemedById: null } })
      await tx.planCode.update({ where: { id: code.id }, data: { redeemedById: u.id, redeemedAt: code.redeemedAt ?? new Date() } })
      await tx.user.update({ where: { id: u.id }, data: { fullAccess: true } })
    })
    return { fullAccess: true }
  }

  @Get('me')
  async me(@CurrentUser() u: AuthUser) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: u.id }, select: { rewardPoints: true, fullAccess: true, auctionsCreated: true, planCode: { select: { code: true, redeemedAt: true } } } })
    return { ...user, pricing: PRICING }
  }
}
