import type { Metadata } from 'next'
import { PlanCodeCard } from '@/components/account-sections'

export const metadata: Metadata = { title: 'Plan activation' }

export default function PlanPage() {
  return <PlanCodeCard />
}
