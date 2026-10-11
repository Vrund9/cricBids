import type { Metadata } from 'next'
import { Paddle } from './paddle'

export const metadata: Metadata = {
  title: 'Team bidding paddle',
  description: 'Private bidding link for a team owner.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <Paddle token={token} />
}
