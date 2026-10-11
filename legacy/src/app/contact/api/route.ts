import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

// IMPORTANT: set these env vars in your deployment (.env.local)
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CONTACT_TO (recipient)

export async function POST(req: NextRequest){
  try {
    const data = await req.json() as { name?:string; email?:string; subject?:string; message?:string }
    if(!data.name || !data.email || !data.subject || !data.message){
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT)||587,
      secure: (process.env.SMTP_SECURE||'false') === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })

    const to = process.env.CONTACT_TO || process.env.SMTP_USER

    await transporter.sendMail({
      from: `${data.name} <${data.email}>`,
      to,
      subject: `[Contact] ${data.subject}`,
      text: data.message,
      html: `<p><strong>Name:</strong> ${data.name}</p>
             <p><strong>Email:</strong> ${data.email}</p>
             <p><strong>Subject:</strong> ${data.subject}</p>
             <p><strong>Message:</strong><br/>${data.message.replace(/\n/g,'<br/>')}</p>`
    })

    return NextResponse.json({ ok: true })
  } catch(err){
    console.error('Contact form error', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
