import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, Crown, X } from 'lucide-react'
import { Reveal } from '@/components/marketing'
import { COMPARISON, PLANS } from '@/lib/plans'
import { SITE_URL } from '@/lib/api'

export const metadata: Metadata = {
  title: 'Pricing — Free for small leagues, ₹1,499 per Pro auction',
  description: 'BidWicket pricing: start free with up to 6 teams and 60 players. Go Pro for ₹1,499 per tournament for remote bidding, 16 teams, 500 players and your own branding. Season Pass ₹4,999/year.',
  alternates: { canonical: '/pricing' },
  openGraph: { title: 'BidWicket pricing', description: 'Free for small leagues. ₹1,499 per Pro auction. ₹4,999/year Season Pass.', url: '/pricing' },
}

const FAQ = [
  { q: 'Do I pay per tournament or per month?', a: 'Per tournament. Most leagues run one auction a season, so Pro is a one-time ₹1,499 for that tournament — no subscription. Organisers running many events can take the yearly Season Pass instead.' },
  { q: 'Can I try everything before paying?', a: 'Yes. The Free plan has the full auction engine, registration form, Excel import, live link, themes, sounds and effects. Upgrade only when you need more teams/players, remote bidding or your own branding.' },
  { q: 'What happens if I upgrade in the middle of setup?', a: 'Everything you’ve done stays. Pro unlocks instantly for that tournament, even after registrations have started.' },
  { q: 'Do you provide GST invoices?', a: 'Yes — on the League plan, and on request for Pro and Season Pass.' },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'BidWicket cricket auction software',
  url: `${SITE_URL}/pricing`,
  description: 'Live cricket player auction software for tournaments.',
  offers: PLANS.filter((p) => p.price.startsWith('₹')).map((p) => ({
    '@type': 'Offer',
    name: p.name,
    price: p.price.replace(/[^\d]/g, ''),
    priceCurrency: 'INR',
    description: `${p.tagline} — ${p.priceNote}`,
  })),
}

export default function PricingPage() {
  return (
    <main className="relative overflow-hidden pt-32">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="grid-bg absolute inset-x-0 top-0 -z-10 h-[600px]" />
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-lime-glow">Pricing</p>
          <h1 className="mt-3 font-display text-5xl font-extrabold sm:text-6xl">Pay per auction, not per month</h1>
          <p className="mt-4 text-lg text-ink-300">Start free. Upgrade a single tournament when it gets serious — or grab a Season Pass if you run many.</p>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.06}>
              <div className={`card relative flex h-full flex-col p-6 ${p.highlight ? 'border-lime-glow/40 shadow-[0_0_80px_-30px_rgba(200,255,46,0.5)]' : ''}`}>
                {p.highlight && <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-lime-bright px-3 py-1 text-xs font-bold text-on-accent"><Crown className="h-3 w-3" /> Most popular</span>}
                <h2 className="font-display text-2xl font-bold">{p.name}</h2>
                <p className="mt-1 text-sm text-ink-400">{p.tagline}</p>
                <p className="mt-6 font-display text-5xl font-black">{p.price}</p>
                <p className="text-sm text-ink-400">{p.priceNote}</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {p.features.map((f) => <li key={f} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-lime-glow" />{f}</li>)}
                </ul>
                <Link
                  href={p.id === 'enterprise' ? 'mailto:hello@bidwicket.app?subject=BidWicket%20League%20plan' : '/signup'}
                  className={`mt-8 inline-flex h-11 items-center justify-center rounded-xl font-semibold ${p.highlight ? 'bg-lime-bright text-on-accent hover:bg-[#d6ff5c]' : 'border border-white/15 hover:bg-white/5'}`}
                >
                  {p.cta}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mx-auto mt-20 max-w-3xl">
          <h2 className="text-center font-display text-3xl font-bold">Free vs Pro</h2>
          <div className="card mt-8 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wider text-ink-400">
                <tr><th className="px-5 py-3 font-medium">Feature</th><th className="px-5 py-3 font-medium">Free</th><th className="px-5 py-3 font-medium text-lime-glow">Pro</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {COMPARISON.map((r) => (
                  <tr key={r.feature}>
                    <td className="px-5 py-3 text-ink-100">{r.feature}</td>
                    {[r.free, r.pro].map((v, i) => (
                      <td key={i} className="px-5 py-3">{v === true ? <Check className="h-4 w-4 text-lime-glow" aria-label="Included" /> : v === false ? <X className="h-4 w-4 text-ink-500" aria-label="Not included" /> : <b>{v}</b>}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <Reveal className="mx-auto mt-20 max-w-3xl pb-24">
          <h2 className="text-center font-display text-3xl font-bold">Billing questions</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="card group p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {f.q}
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/5 text-lg transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink-300">{f.a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </section>
    </main>
  )
}
