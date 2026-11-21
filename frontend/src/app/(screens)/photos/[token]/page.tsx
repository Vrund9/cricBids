import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { serverGet } from '@/lib/api'
import type { ThemeConfig } from '@/lib/themes'
import { PhotoUploader } from './uploader'

export interface PhotoPlayer {
  id: string
  serial: number
  name: string
  photoUrl: string | null
}

export interface PhotoConfig {
  tournament: { name: string; logoUrl?: string | null }
  open: boolean
  players: PhotoPlayer[]
  theme?: ThemeConfig
}

type Props = { params: Promise<{ token: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const c = await serverGet<PhotoConfig>(`/public/photos/${token}`, 30)
  if (!c) return { title: 'Upload your photo', robots: { index: false } }
  const title = `Upload your photo · ${c.tournament.name}`
  const description = `Pick your name and add your photo for the ${c.tournament.name} player auction.`
  return {
    title: { absolute: title },
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: 'website', siteName: 'BidWicket' },
  }
}

export default async function PhotosPage({ params }: Props) {
  const { token } = await params
  const config = await serverGet<PhotoConfig>(`/public/photos/${token}`, 0)
  if (!config) notFound()
  return <PhotoUploader token={token} config={config} />
}
