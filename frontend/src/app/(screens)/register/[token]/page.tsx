import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { serverGet } from '@/lib/api'
import type { RegField } from '@/lib/types'
import type { ThemeConfig } from '@/lib/themes'
import { RegistrationForm } from './form'

export interface FormConfig {
  tournament: { name: string; logoUrl?: string | null; venue?: string | null; auctionDate?: string | null; description?: string | null }
  open: boolean
  requireApproval: boolean
  fields: RegField[]
  registrations: number
  theme?: ThemeConfig
}

type Props = { params: Promise<{ token: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const c = await serverGet<FormConfig>(`/public/register/${token}`, 30)
  if (!c) return { title: 'Player registration', robots: { index: false } }
  const title = `Register for ${c.tournament.name} Player Auction`
  const description = c.open
    ? `Sign up as a player for the ${c.tournament.name} auction${c.tournament.venue ? ` in ${c.tournament.venue}` : ''}. Takes under a minute — add your role and photo.`
    : `Registrations for ${c.tournament.name} are closed.`
  return {
    title: { absolute: title },
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: 'website', siteName: 'BidWicket' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function RegisterPage({ params }: Props) {
  const { token } = await params
  const config = await serverGet<FormConfig>(`/public/register/${token}`, 0)
  if (!config) notFound()
  return <RegistrationForm token={token} config={config} />
}
