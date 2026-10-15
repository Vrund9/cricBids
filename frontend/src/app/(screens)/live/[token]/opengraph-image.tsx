import { ImageResponse } from 'next/og'
import { LOGO_DATA_URI } from '@/lib/brand-mark'
import { serverGet } from '@/lib/api'
import { moneyShort } from '@/lib/format'
import { palette, type ThemeConfig } from '@/lib/themes'

export const alt = 'Live cricket player auction'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface Meta {
  name: string
  status: string
  currency: string
  venue?: string | null
  teams: number
  players: number
  sold: number
  totalSpent: number
  topBuy?: { name: string; soldPrice: number } | null
  theme?: ThemeConfig
}

/** Link preview card for WhatsApp / X / Slack — shows live status and progress. */
export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const m = await serverGet<Meta>(`/public/live/${token}/meta`, 15)
  const live = m && (m.status === 'LIVE' || m.status === 'PAUSED')
  const badge = !m ? 'AUCTION' : live ? '● LIVE NOW' : m.status === 'COMPLETED' ? 'RESULTS' : 'COMING UP'
  const p = palette(m?.theme)
  const badgeColor = live ? '#ff4d6d' : m?.status === 'COMPLETED' ? p.gold : p.accent
  const stats = m
    ? [
        [String(m.players), 'players'],
        [String(m.teams), 'teams'],
        [m.sold ? moneyShort(m.totalSpent, m.currency) : String(m.sold), m.sold ? `spent on ${m.sold}` : 'sold'],
      ]
    : []
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 70, color: 'white', fontFamily: 'sans-serif', background: `radial-gradient(900px 500px at 90% 0%, ${p.accent}38, transparent 60%), radial-gradient(700px 400px at 0% 100%, ${p.second}2e, transparent 60%), ${p.ink[1]}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 28, fontWeight: 800 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_DATA_URI} width={40} height={40} alt="" />
            Bid<span style={{ color: p.accent }}>Wicket</span>
          </div>
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 800, color: badgeColor, border: `3px solid ${badgeColor}`, borderRadius: 999, padding: '8px 22px', letterSpacing: 3 }}>{badge}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 30, color: '#b8c0d4' }}>{`Player Auction${m?.venue ? ` · ${m.venue}` : ''}`}</div>
          <div style={{ fontSize: m && m.name.length > 28 ? 68 : 86, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2, marginTop: 8 }}>{m?.name ?? 'Live auction'}</div>
          {m?.topBuy && (
            <div style={{ display: 'flex', fontSize: 30, color: p.gold, marginTop: 18 }}>
              {`Top buy: ${m.topBuy.name} · ${moneyShort(m.topBuy.soldPrice, m.currency)}`}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {stats.map(([v, l]) => (
            <div key={l} style={{ display: 'flex', flexDirection: 'column', padding: '16px 26px', borderRadius: 22, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 46, fontWeight: 800 }}>{v}</div>
              <div style={{ fontSize: 22, color: '#8a94ad' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  )
}
