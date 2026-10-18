import type { Metadata } from 'next'
import { PricingContent } from '@/components/pricing-content'
import { PRICING } from '@/lib/plans'

export const metadata: Metadata = { title: 'Pricing' }

export default function PlansPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-lime-glow">Pricing</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">Free to run. Pay only for extras.</h1>
        <p className="mt-3 text-ink-300">Every auction is free with up to {PRICING.includedTeams} teams. Buy single add-ons or Pro (₹{PRICING.pro}) per auction from its overview — you always see the total first.</p>
      </div>
      <PricingContent cta={{ href: '/dashboard', label: 'Go to my tournaments' }} inApp />
    </main>
  )
}
