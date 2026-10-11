'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, Download, ExternalLink, QrCode, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Modal } from './ui'
import { cn } from '@/lib/cn'

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
  const downloadQr = () => {
    const svg = document.getElementById(`qr-${title}`)
    if (!svg) return
    const xml = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = c.height = 1024
      const ctx = c.getContext('2d')!
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, 1024, 1024)
      ctx.drawImage(img, 64, 64, 896, 896)
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
      <Modal open={qr} onClose={() => setQr(false)} title={title}>
        <div className="flex flex-col items-center gap-5">
          <div className="rounded-2xl bg-white p-5">
            <QRCodeSVG id={`qr-${title}`} value={url} size={240} level="M" />
          </div>
          <p className="text-center text-sm text-ink-300">Put this on the venue screen or print it — anyone can scan to open the link.</p>
          <Button onClick={downloadQr} variant="secondary">
            <Download className="h-4 w-4" /> Download PNG
          </Button>
        </div>
      </Modal>
    </div>
  )
}
