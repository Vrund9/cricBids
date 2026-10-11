import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { serverGet } from '@/lib/api'
import { moneyShort } from '@/lib/format'
import type { Snapshot } from '@/lib/types'
import { LiveView } from './live-view'

interface Meta {
  name: string
  logoUrl?: string | null
  venue?: string | null
  auctionDate?: string | null
  status: string
  currency: string
  teams: number
  players: number
  sold: number
  totalSpent: number
  topBuy?: { name: string; soldPrice: number } | null
}

type Props = { params: Promise<{ token: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const m = await serverGet<Meta>(`/public/live/${token}/meta`, 15)
  if (!m) return { title: 'Live auction', robots: { index: false } }
  const status = m.status === 'LIVE' || m.status === 'PAUSED' ? '🔴 LIVE' : m.status === 'COMPLETED' ? 'Results' : 'Coming up'
  const title = `${status}: ${m.name} Player Auction`
  const description =
    m.sold > 0
      ? `${m.sold} of ${m.players} players sold for ${moneyShort(m.totalSpent, m.currency)} across ${m.teams} teams.${m.topBuy ? ` Top buy: ${m.topBuy.name} (${moneyShort(m.topBuy.soldPrice, m.currency)}).` : ''} Watch every bid live.`
      : `${m.players} players, ${m.teams} teams${m.venue ? ` · ${m.venue}` : ''}. Watch every bid of the ${m.name} auction live.`
  return {
    title: { absolute: title },
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: 'website', siteName: 'CricBid' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function LivePage({ params }: Props) {
  const { token } = await params
  const initial = await serverGet<Snapshot>(`/public/live/${token}`, 0)
  if (!initial) notFound()
  return <LiveView token={token} initial={initial} />
}
