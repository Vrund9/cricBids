import type { Metadata } from 'next'
import { ForgotForm } from '@/components/auth-forms'

export const metadata: Metadata = { title: 'Forgot password', robots: { index: false } }

export default function Page() {
  return <ForgotForm />
}
