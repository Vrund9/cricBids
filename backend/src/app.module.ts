import { Controller, Get, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ServeStaticModule } from '@nestjs/serve-static'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { PrismaModule, PrismaService } from './prisma/prisma.service'
import { MailModule } from './mail/mail.service'
import { RealtimeModule } from './realtime/realtime.service'
import { AuthModule } from './auth/auth.module'
import { TournamentsController } from './tournaments/tournaments.controller'
import { TournamentsService } from './tournaments/tournaments.service'
import { TeamsService } from './tournaments/teams.service'
import { PlayersService } from './tournaments/players.service'
import { AuctionController } from './auction/auction.controller'
import { AuctionService } from './auction/auction.service'
import { SnapshotService } from './auction/snapshot.service'
import { AuctionGateway } from './auction/auction.gateway'
import { PublicController } from './public/public.controller'
import { UPLOAD_DIR, UploadsController } from './uploads/uploads'
import { BillingController } from './billing/billing.controller'

@Controller('health')
class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async health() {
    await this.prisma.$queryRaw`SELECT 1`
    return { ok: true, time: new Date().toISOString() }
  }
}

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    ServeStaticModule.forRoot({ rootPath: UPLOAD_DIR, serveRoot: '/uploads', serveStaticOptions: { maxAge: '30d', index: false } }),
    PrismaModule,
    MailModule,
    RealtimeModule,
    AuthModule,
  ],
  controllers: [HealthController, TournamentsController, AuctionController, PublicController, UploadsController, BillingController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    TournamentsService,
    TeamsService,
    PlayersService,
    AuctionService,
    SnapshotService,
    AuctionGateway,
  ],
})
export class AppModule {}
