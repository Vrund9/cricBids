'use client'

import { useId, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, Download, ExternalLink, QrCode, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Modal } from './ui'
import { cn } from '@/lib/cn'

/** CricBid mark for the centre of QR codes (level H error correction keeps them scannable). */
const QR_LOGO = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9ff9a"/><stop offset="1" stop-color="#9fd400"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="#0c1019"/><circle cx="16" cy="16" r="9" fill="url(#g)"/><path d="M10.2 11.5c3.2 2.4 3.2 6.6 0 9M21.8 11.5c-3.2 2.4-3.2 6.6 0 9" stroke="#0c1019" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-dasharray="1.6 1.4"/></svg>',
)}`

export function useCopy() {
  const [copied, setCopied] = useState(false)
  const copy = async (text: string, msg = 'Link copied') => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    toast.success(msg)
    setTimeout(() => setCopied(false), 1600)
  }
  return { copied, copy }
}

/** A share link with copy, native share / WhatsApp, open and QR — for venue screens and group chats. */
export function ShareLink({ url, title, message, className, compact }: { url: string; title: string; message: string; className?: string; compact?: boolean }) {
  const { copied, copy } = useCopy()
  const [qr, setQr] = useState(false)
  const qrId = `qr-${useId().replace(/:/g, '')}`
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: message, url })
        return
      } catch {
        /* cancelled */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${message}\n${url}`)}`, '_blank', 'noopener')
  }
  /** Printable poster: title on top, QR in the middle, "scan to open" + link underneath. */
  const downloadQr = () => {
    const svg = document.getElementById(qrId)
    if (!svg) return
    const xml = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    img.onload = () => {
      const W = 1080, H = 1350
      const c = document.createElement('canvas')
      c.width = W
      c.height = H
      const ctx = c.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#0c1019'
      ctx.textAlign = 'center'
      ctx.font = '800 64px system-ui, -apple-system, sans-serif'
      ctx.fillText(title, W / 2, 150, W - 120)
      ctx.drawImage(img, 140, 230, 800, 800)
      ctx.font = '600 40px system-ui, -apple-system, sans-serif'
      ctx.fillText('Scan with your phone camera', W / 2, 1130)
      ctx.fillStyle = '#5b6783'
      ctx.font = '400 30px ui-monospace, monospace'
      ctx.fillText(url.replace(/^https?:\/\//, ''), W / 2, 1190, W - 120)
      ctx.fillStyle = '#9fd400'
      ctx.font = '800 32px system-ui, -apple-system, sans-serif'
      ctx.fillText('CricBid', W / 2, 1290)
      const a = document.createElement('a')
      a.download = `${title.replace(/\W+/g, '_')}_qr.png`
      a.href = c.toDataURL('image/png')
      a.click()
    }
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`
  }
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-950/60 p-1.5 pl-3">
        <code className="min-w-0 flex-1 truncate text-xs text-ink-200">{url}</code>
        <Button size="sm" variant="secondary" onClick={() => copy(url)} aria-label="Copy link">
          {copied ? <Check className="h-3.5 w-3.5 text-lime-glow" /> : <Copy className="h-3.5 w-3.5" />}
          {!compact && (copied ? 'Copied' : 'Copy')}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={share}>
          <Share2 className="h-3.5 w-3.5" /> Share
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setQr(true)}>
          <QrCode className="h-3.5 w-3.5" /> QR code
        </Button>
        <a href={url} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-ink-200 hover:bg-white/[0.06] hover:text-white">
          <ExternalLink className="h-3.5 w-3.5" /> Open
        </a>
      </div>
      <Modal open={qr} onClose={() => setQr(false)} title={title} className="sm:max-w-md">
        <div className="flex flex-col items-center">
          <p className="-mt-3 mb-6 self-start text-sm text-ink-300">Scan with any phone camera to open. Show it on the venue screen or print it.</p>
          <div className="relative">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-lime-glow/15 blur-2xl" aria-hidden />
            <div className="relative rounded-3xl bg-snow p-4 shadow-[0_20px_60px_-20px_rgba(200,255,46,0.45)] ring-1 ring-black/5 sm:p-5">
              <QRCodeSVG
                id={qrId}
                value={url}
                size={232}
                level="H"
                marginSize={0}
                className="h-auto w-[min(232px,62vw)]"
                imageSettings={{ src: QR_LOGO, height: 44, width: 44, excavate: true }}
              />
            </div>
          </div>
          <div className="mt-7 flex w-full items-center gap-2 rounded-xl border border-white/10 bg-ink-950/60 p-1.5 pl-3">
            <code className="min-w-0 flex-1 truncate text-xs text-ink-200">{url.replace(/^https?:\/\//, '')}</code>
            <Button size="sm" variant="secondary" onClick={() => copy(url)} aria-label="Copy link">
              {copied ? <Check className="h-3.5 w-3.5 text-lime-glow" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <div className="mt-3 grid w-full grid-cols-2 gap-2">
            <Button onClick={downloadQr}>
              <Download className="h-4 w-4" /> Download
            </Button>
            <Button onClick={share} variant="secondary">
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
