import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Geist, Geist_Mono } from 'next/font/google'
import { SITE_URL } from '@/lib/api'
import { Providers } from './providers'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' })
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-bricolage', display: 'swap', weight: ['500', '600', '700', '800'] })

const description =
  'Run your cricket tournament player auction live — import players from Excel or a shareable registration form, answer a few questions, and auction on a big-screen live link with realtime bids, team purses and instant results. No more PPTs.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'CricBid — Live Cricket Player Auction Software for Tournaments',
    template: '%s · CricBid',
  },
  description,
  applicationName: 'CricBid',
  keywords: [
    'cricket auction software',
    'cricket player auction',
    'IPL style auction app',
    'tournament auction',
    'box cricket auction',
    'tennis ball cricket auction',
    'player registration form',
    'live auction link',
    'cricket league management',
    'online cricket auction',
  ],
  authors: [{ name: 'CricBid' }],
  creator: 'CricBid',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'CricBid',
    title: 'CricBid — Run an IPL-style player auction for your tournament',
    description,
    url: '/',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CricBid — Live Cricket Player Auctions',
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  category: 'sports',
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#080b13',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${bricolage.variable}`}>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
