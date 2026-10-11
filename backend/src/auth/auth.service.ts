import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { MailService } from '../mail/mail.service'
import { randomToken, sha256 } from '../common/util'
import { ChangePasswordDto, LoginDto, ResetPasswordDto, SignupDto, UpdateProfileDto } from './auth.dto'
import type { User } from '../generated/prisma/client'

const RESET_TTL_MS = 60 * 60 * 1000
// Compared against when the email doesn't exist so timing is identical.
const DUMMY_HASH = bcrypt.hashSync('cricbid-timing-guard', 12)

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  private publicUser(u: User) {
    return { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl, createdAt: u.createdAt, seasonPassUntil: u.seasonPassUntil }
  }

  private async session(u: User) {
    const token = await this.jwt.signAsync({ sub: u.id, email: u.email })
    return { token, user: this.publicUser(u) }
  }

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (existing) throw new ConflictException('An account with this email already exists')
    const user = await this.prisma.user.create({
      data: { name: dto.name.trim(), email: dto.email, passwordHash: await bcrypt.hash(dto.password, 12) },
    })
    return this.session(user)
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
    // Always run bcrypt so response time doesn't reveal whether the email exists.
    const ok = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH)
    if (!user || !ok) throw new UnauthorizedException('Incorrect email or password')
    return this.session(user)
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found')
    return this.publicUser(user)
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { name: dto.name?.trim(), avatarUrl: dto.avatarUrl } })
    return this.publicUser(user)
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Current password is incorrect')
    }
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(dto.newPassword, 12) } })
    return { ok: true }
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (user) {
      const token = randomToken(32)
      await this.prisma.user.update({
        where: { id: user.id },
        data: { resetTokenHash: sha256(token), resetTokenExp: new Date(Date.now() + RESET_TTL_MS) },
      })
      const origin = (process.env.WEB_ORIGIN || 'http://localhost:3000').split(',')[0].trim()
      const link = `${origin}/reset-password?token=${token}`
      await this.mail.send(
        user.email,
        'Reset your CricBid password',
        `<p>Hi ${user.name},</p><p><a href="${link}">Click here to reset your password</a>. The link is valid for 1 hour.</p>`,
        `Hi ${user.name},\nReset your password: ${link}\nThe link is valid for 1 hour.`,
      )
    }
    // Same response either way so emails can't be enumerated.
    return { ok: true }
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { resetTokenHash: sha256(dto.token), resetTokenExp: { gt: new Date() } },
    })
    if (!user) throw new BadRequestException('This reset link is invalid or has expired')
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(dto.password, 12), resetTokenHash: null, resetTokenExp: null },
    })
    return this.session(user)
  }
}
