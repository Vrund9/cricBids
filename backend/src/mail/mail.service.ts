import { Global, Injectable, Logger, Module } from '@nestjs/common'
import nodemailer, { Transporter } from 'nodemailer'

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private readonly transport?: Transporter

  constructor() {
    if (process.env.SMTP_HOST) {
      this.transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      })
    }
  }

  async send(to: string, subject: string, html: string, text: string) {
    if (!this.transport) {
      this.logger.warn(`SMTP not configured. Mail to ${to} — ${subject}\n${text}`)
      return
    }
    await this.transport.sendMail({ from: process.env.MAIL_FROM || 'BidWicket <no-reply@bidwicket.app>', to, subject, html, text })
  }
}

@Global()
@Module({ providers: [MailService], exports: [MailService] })
export class MailModule {}
