import type { Metadata } from 'next'
import { SignupForm } from '@/components/auth-forms'

export const metadata: Metadata = {
  title: 'Create your free account',
  description: 'Sign up for BidWicket and run a live, IPL-style player auction for your cricket tournament in minutes.',
  alternates: { canonical: '/signup' },
}

export default function Page() {
  return <SignupForm />
}
