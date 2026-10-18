import { BadRequestException, Body, Controller, Get, HttpCode, NotFoundException, Param, Post, UseGuards } from '@nestjs/common'
import { randomBytes } from 'crypto'
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator'
import { AdminGuard, AuthUser, CurrentUser, JwtAuthGuard } from '../auth/jwt.guard'
import { PrismaService } from '../prisma/prisma.service'

class CreateCodeDto {
  /** Leave empty to generate one like BW-7KQ2-M9XD */
  @IsOptional() @IsString() @Matches(/^[A-Za-z0-9-]{4,40}$/, { message: 'Codes use letters, numbers and dashes (4–40 characters)' }) code?: string
  @IsOptional() @IsString() @MaxLength(200) note?: string
}

// No 0/O/1/I so codes read cleanly over the phone.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function generate() {
  const b = randomBytes(8)
  const part = (o: number) => Array.from({ length: 4 }, (_, i) => ALPHABET[b[o + i] % ALPHABET.length]).join('')
  return `BW-${part(0)}-${part(4)}`
}

/**
 * Plan codes: one-time codes that give a single account full access (every add-on free)
 * — for early customers and exceptions. Revoking a code takes the access away again.
 */
@Controller('admin/plan-codes')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminPlanCodesController {
  constructor(private readonly prisma: PrismaService) {}

  private audit(actor: AuthUser, action: string, id: string, details: Record<string, unknown>) {
    return this.prisma.auditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, action, targetType: 'plan_code', targetId: id, details: details as any } })
  }

  @Get()
  list() {
    return this.prisma.planCode.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { redeemedBy: { select: { id: true, name: true, email: true } } },
    })
  }

  @Post()
  async create(@CurrentUser() actor: AuthUser, @Body() dto: CreateCodeDto) {
    const code = (dto.code?.trim() || generate()).toUpperCase()
    if (await this.prisma.planCode.findUnique({ where: { code } })) throw new BadRequestException('That code already exists')
    const row = await this.prisma.planCode.create({ data: { code, note: dto.note?.trim() || null, createdById: actor.id } })
    await this.audit(actor, 'plan_code.create', row.id, { code })
    return row
  }

  @Post(':id/revoke')
  @HttpCode(200)
  async revoke(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    const row = await this.prisma.planCode.findUnique({ where: { id } })
    if (!row) throw new NotFoundException('Code not found')
    await this.prisma.$transaction([
      this.prisma.planCode.update({ where: { id }, data: { revokedAt: new Date() } }),
      ...(row.redeemedById ? [this.prisma.user.update({ where: { id: row.redeemedById }, data: { fullAccess: false } })] : []),
    ])
    await this.audit(actor, 'plan_code.revoke', id, { code: row.code, user: row.redeemedById })
    return { ok: true }
  }

  @Post(':id/restore')
  @HttpCode(200)
  async restore(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    const row = await this.prisma.planCode.findUnique({ where: { id } })
    if (!row) throw new NotFoundException('Code not found')
    await this.prisma.$transaction([
      this.prisma.planCode.update({ where: { id }, data: { revokedAt: null } }),
      ...(row.redeemedById ? [this.prisma.user.update({ where: { id: row.redeemedById }, data: { fullAccess: true } })] : []),
    ])
    await this.audit(actor, 'plan_code.restore', id, { code: row.code })
    return { ok: true }
  }
}
