import type { Metadata } from 'next'
import { Reveal } from '@/components/marketing'
import { PricingContent } from '@/components/pricing-content'
import { PRICING } from '@/lib/plans'
import { SITE_URL } from '@/lib/api'
import { ordinal } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Pricing — Free cricket auctions, pay only for extras',
  description: `BidWicket is free for up to ${PRICING.includedTeams} teams and ${PRICING.maxPlayers} players. Pay ₹${PRICING.perExtraTeam} per extra team, ₹${PRICING.themeUnlock} for a custom theme and ₹${PRICING.auctionFee} per auction after your ${ordinal(PRICING.freeAuctions)}.`,
  alternates: { canonical: '/pricing' },
  openGraph: { title: 'BidWicket pricing', description: `Free for ${PRICING.includedTeams} teams. Pay only for extra teams, custom themes and auctions after your ${ordinal(PRICING.freeAuctions)}.`, url: '/pricing' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'BidWicket cricket auction software',
  url: `${SITE_URL}/pricing`,
  description: 'Live cricket player auction software for tournaments.',
  offers: [
    { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'INR' },
    { '@type': 'Offer', name: 'Extra team', price: String(PRICING.perExtraTeam), priceCurrency: 'INR' },
    { '@type': 'Offer', name: 'Theme customisation', price: String(PRICING.themeUnlock), priceCurrency: 'INR' },
    { '@type': 'Offer', name: 'Auction fee', price: String(PRICING.auctionFee), priceCurrency: 'INR' },
    { '@type': 'Offer', name: 'Pro (one auction)', price: String(PRICING.pro), priceCurrency: 'INR' },
  ],
}

export default function PricingPage() {
  return (
    <main className="relative overflow-hidden pt-32">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="grid-bg absolute inset-x-0 top-0 -z-10 h-[600px]" />
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-lime-glow">Pricing</p>
          <h1 className="mt-3 font-display text-5xl font-extrabold sm:text-6xl">Free to run. Pay only for extras.</h1>
          <p className="mt-4 text-lg text-ink-300">No subscription. Every auction is free with up to {PRICING.includedTeams} teams — add single extras when you need them, or go Pro on an auction for ₹{PRICING.pro}.</p>
        </Reveal>
        <PricingContent cta={{ href: '/signup', label: 'Start free' }} />
      </section>
    </main>
  )
}
