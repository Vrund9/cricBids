import { ImageResponse } from 'next/og'
import { LOGO_DATA_URI } from '@/lib/brand-mark'

// 512px PNG logo for the web app manifest and the Organization logo in search results
// (Google wants a raster logo; the favicon is SVG).
export const dynamic = 'force-static'

export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080b13' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_DATA_URI} width={380} height={380} alt="" />
      </div>
    ),
    { width: 512, height: 512 },
  )
}
