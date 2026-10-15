import type { Metadata } from 'next'
import { AdminFrame } from './frame'

export const metadata: Metadata = { title: 'Admin' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminFrame>{children}</AdminFrame>
}
