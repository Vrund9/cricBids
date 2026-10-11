import type { Metadata } from 'next'
import { TournamentFrame } from './frame'

export const metadata: Metadata = { title: 'Manage tournament' }

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TournamentFrame id={id}>{children}</TournamentFrame>
}
