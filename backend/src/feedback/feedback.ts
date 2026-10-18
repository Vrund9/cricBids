import { Body, Controller, Get, Injectable, NotFoundException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { AdminGuard, AuthUser, CurrentUser, JwtAuthGuard } from '../auth/jwt.guard'
import { PrismaService } from '../prisma/prisma.service'
import { REWARDS } from '../common/rewards'
import type { Prisma } from '../generated/prisma/client'
import { FeedbackStatus, FeedbackType } from '../generated/prisma/enums'

class CreateFeedbackDto {
  @IsEnum(FeedbackType) type: FeedbackType
  @IsString() @MinLength(4) @MaxLength(120) title: string
  @IsString() @MinLength(15, { message: 'Tell us a little more — at least 15 characters' }) @MaxLength(4000) message: string
  @IsOptional() @IsString() @MaxLength(300) page?: string
}

class UpdateFeedbackDto {
  @IsOptional() @IsEnum(FeedbackStatus) status?: FeedbackStatus
  @IsOptional() @IsString() @MaxLength(1000) adminNote?: string
}

const PAGE_SIZE = 25
const DAY = 24 * 60 * 60 * 1000

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateFeedbackDto) {
    const rewardedToday = await this.prisma.feedback.count({
      where: { userId, points: { gt: 0 }, createdAt: { gte: new Date(Date.now() - DAY) } },
    })
    const points = rewardedToday < REWARDS.rewardedPerDay ? REWARDS.pointsPerEntry : 0
    const [entry, user] = await this.prisma.$transaction([
      this.prisma.feedback.create({
        data: { userId, type: dto.type, title: dto.title.trim(), message: dto.message.trim(), page: dto.page?.trim() || null, points },
      }),
      this.prisma.user.update({ where: { id: userId }, data: { rewardPoints: { increment: points } }, select: { rewardPoints: true } }),
    ])
    return { entry, points, rewardPoints: user.rewardPoints }
  }

  async mine(userId: string) {
    const [items, user] = await Promise.all([
      this.prisma.feedback.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { rewardPoints: true } }),
    ])
    return { items, rewardPoints: user.rewardPoints, rules: REWARDS }
  }

  async list(type?: string, status?: string, pageNo?: number) {
    const p = Math.max(1, Math.floor(Number(pageNo) || 1))
    const where: Prisma.FeedbackWhereInput = {
      ...(type && type in FeedbackType ? { type: type as FeedbackType } : {}),
      ...(status && status in FeedbackStatus ? { status: status as FeedbackStatus } : {}),
    }
    const [rows, total, counts] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { user: { select: { id: true, name: true, email: true, rewardPoints: true } } },
      }),
      this.prisma.feedback.count({ where }),
      this.prisma.feedback.groupBy({ by: ['type', 'status'], _count: true }),
    ])
    return { rows, total, page: p, pageSize: PAGE_SIZE, counts: counts.map((c) => ({ type: c.type, status: c.status, count: c._count })) }
  }

  /** Rejecting an entry takes its points back; un-rejecting gives them back. */
  async update(actor: AuthUser, id: string, dto: UpdateFeedbackDto) {
    const fb = await this.prisma.feedback.findUnique({ where: { id } })
    if (!fb) throw new NotFoundException('Feedback not found')
    const next = dto.status ?? fb.status
    const wasRejected = fb.status === 'REJECTED'
    const nowRejected = next === 'REJECTED'
    const delta = !wasRejected && nowRejected ? -fb.points : wasRejected && !nowRejected ? fb.points : 0
    return this.prisma.$transaction(async (tx) => {
      if (delta < 0) {
        // Never push a balance below zero if the points were already spent.
        const u = await tx.user.findUniqueOrThrow({ where: { id: fb.userId }, select: { rewardPoints: true } })
        await tx.user.update({ where: { id: fb.userId }, data: { rewardPoints: Math.max(0, u.rewardPoints + delta) } })
      } else if (delta > 0) {
        await tx.user.update({ where: { id: fb.userId }, data: { rewardPoints: { increment: delta } } })
      }
      await tx.auditLog.create({
        data: { actorId: actor.id, actorEmail: actor.email, action: 'feedback.update', targetType: 'feedback', targetId: id, details: { from: fb.status, to: next, pointsDelta: delta } },
      })
      return tx.feedback.update({ where: { id }, data: { status: next, adminNote: dto.adminNote === undefined ? undefined : dto.adminNote.trim() || null } })
    })
  }
}

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateFeedbackDto) {
    return this.feedback.create(u.id, dto)
  }

  @Get('mine')
  mine(@CurrentUser() u: AuthUser) {
    return this.feedback.mine(u.id)
  }
}

@Controller('admin/feedback')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminFeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Get()
  list(@Query('type') type?: string, @Query('status') status?: string, @Query('page') page?: string) {
    return this.feedback.list(type, status, Number(page))
  }

  @Patch(':id')
  update(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() dto: UpdateFeedbackDto) {
    return this.feedback.update(actor, id, dto)
  }
}
