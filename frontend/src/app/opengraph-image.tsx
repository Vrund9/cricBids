import { ImageResponse } from 'next/og'

export const alt = 'CricBid — Live cricket player auctions for your tournament'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: 'radial-gradient(900px 500px at 85% 0%, rgba(200,255,46,0.25), transparent 60%), #080b13',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: '#c8ff2e' }} />
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 800 }}>
            Cric<span style={{ color: '#c8ff2e' }}>Bid</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 82, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>Your tournament.</div>
          <div style={{ fontSize: 82, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2, color: '#c8ff2e' }}>An IPL-style auction.</div>
          <div style={{ fontSize: 30, color: '#b8c0d4', marginTop: 10 }}>Excel or form → a few questions → live big-screen auction. No PPTs.</div>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {['Realtime live link', 'Team purses', 'Remote bidding', 'Instant Excel results'].map((t) => (
            <div key={t} style={{ fontSize: 22, padding: '10px 18px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.18)', color: '#e3e7f0' }}>
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  )
}
