import { ImageResponse } from 'next/og'
import { LOGO_DATA_URI } from '@/lib/brand-mark'
import { serverGet } from '@/lib/api'

export const alt = 'Player registration'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const c = await serverGet<{ tournament: { name: string; venue?: string | null }; open: boolean; registrations: number }>(`/public/register/${token}`, 60)
  const name = c?.tournament.name ?? 'Cricket tournament'
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 70, color: 'white', fontFamily: 'sans-serif', background: 'radial-gradient(900px 500px at 90% 0%, rgba(56,189,248,0.25), transparent 60%), #080b13' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 28, fontWeight: 800 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_DATA_URI} width={40} height={40} alt="" />
          Bid<span style={{ color: '#c8ff2e' }}>Wicket</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 30, color: '#38bdf8', letterSpacing: 4 }}>{`PLAYER REGISTRATION ${c && !c.open ? '· CLOSED' : 'OPEN'}`}</div>
          <div style={{ fontSize: name.length > 28 ? 70 : 88, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2, marginTop: 12 }}>{name}</div>
          {c?.tournament.venue && <div style={{ fontSize: 30, color: '#b8c0d4', marginTop: 12 }}>{c.tournament.venue}</div>}
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: '#e3e7f0' }}>Tap to register for the auction — takes under a minute</div>
      </div>
    ),
    size,
  )
}
