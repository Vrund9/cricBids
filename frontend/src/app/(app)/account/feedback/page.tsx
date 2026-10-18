import type { Metadata } from 'next'
import { FeedbackAndRewards } from '@/components/account-sections'

export const metadata: Metadata = { title: 'Feedback & rewards' }

export default function FeedbackPage() {
  return <FeedbackAndRewards />
}
