import { Controller, HttpCode, HttpException, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
import { AuthUser, CurrentUser, JwtAuthGuard } from '../auth/jwt.guard'
import { PrismaService } from '../prisma/prisma.service'
import { TournamentsService } from '../tournaments/tournaments.service'
import { RealtimeService } from '../realtime/realtime.service'
import { billingMode } from '../common/plans'

/**
 * Upgrades. In BILLING_MODE=demo (default outside production) upgrades activate instantly
 * without charging — swap `charge()` for Razorpay/Stripe checkout + webhook to go live.
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

  @Post('tournaments/:id/pro')
  @HttpCode(200)
  async tournamentPro(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    await this.tournaments.owned(id, u.id)
    this.charge()
    await this.prisma.tournament.update({ where: { id }, data: { plan: 'PRO', planActivatedAt: new Date() } })
    this.realtime.stateChanged(id)
    return this.tournaments.plan(id)
  }

  @Post('season-pass')
  @HttpCode(200)
  async seasonPass(@CurrentUser() u: AuthUser) {
    this.charge()
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: u.id } })
    const from = user.seasonPassUntil && user.seasonPassUntil > new Date() ? user.seasonPassUntil : new Date()
    const until = new Date(from)
    until.setFullYear(until.getFullYear() + 1)
    await this.prisma.user.update({ where: { id: u.id }, data: { seasonPassUntil: until } })
    return { seasonPassUntil: until }
  }
}
