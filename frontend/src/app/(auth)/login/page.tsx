import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth-forms'

export const metadata: Metadata = {
  title: 'Log in',
  description: 'Log in to BidWicket to manage your cricket tournament player auctions.',
  alternates: { canonical: '/login' },
}

export default function Page() {
  return <LoginForm />
}
