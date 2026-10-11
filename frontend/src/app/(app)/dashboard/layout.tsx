import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Your tournaments' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
