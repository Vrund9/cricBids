import type { Metadata } from 'next'
import { AppShell } from '@/components/app-shell'

// Everything behind login: never indexed, always wrapped in the organiser shell.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
