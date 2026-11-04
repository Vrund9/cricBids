import { ImageResponse } from 'next/og'
import { LOGO_DATA_URI } from '@/lib/brand-mark'

// Home-screen icon for iPhones ("Add to Home Screen"); iOS ignores SVG favicons.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080b13' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_DATA_URI} width={132} height={132} alt="" />
      </div>
    ),
    size,
  )
}
