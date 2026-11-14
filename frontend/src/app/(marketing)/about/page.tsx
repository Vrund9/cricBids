import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Gavel, HeartHandshake, Mail, MonitorSmartphone, Scale, ShieldCheck, Trophy, Users, Zap } from 'lucide-react'
import { Reveal } from '@/components/marketing'
import { SITE_URL } from '@/lib/api'
import { CONTACT_EMAIL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'About us',
  description: 'BidWicket is cricket player auction software built in India for local leagues: box cricket, tennis-ball, corporate, society and college tournaments.',
  alternates: { canonical: '/about' },
  openGraph: { title: 'About BidWicket', url: '/about' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About BidWicket',
  url: `${SITE_URL}/about`,
  mainEntity: { '@type': 'Organization', name: 'BidWicket', url: SITE_URL, logo: `${SITE_URL}/logo.png`, email: CONTACT_EMAIL, areaServed: 'IN' },
}

const BELIEFS = [
  { icon: Scale, title: 'Fair to every team', text: 'Purse and squad rules are checked on every bid, the random order is truly random, and every bid is on the record. Nobody has to argue about the spreadsheet.', c: '#c8ff2e' },
  { icon: MonitorSmartphone, title: 'Works on what you already have', text: 'A phone, a laptop and a projector or TV. No app to install, for organisers, team owners or players.', c: '#38bdf8' },
  { icon: Zap, title: 'Set up in minutes', text: 'Collect players with one link, answer a few questions, and you’re ready. Smart defaults do the maths for purses and squad sizes.', c: '#ffb020' },
  { icon: ShieldCheck, title: 'Players’ details stay private', text: 'Mobile numbers and emails never appear on the big screen or bidding links, and every share link can be reset.', c: '#34d399' },
]

const FOR = ['Box cricket leagues', 'Tennis-ball tournaments', 'Corporate cricket cups', 'Society & apartment leagues', 'College & school fests', 'Club and community leagues']

export default function AboutPage() {
  return (
    <main className="relative overflow-hidden pt-32 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="grid-bg absolute inset-x-0 top-0 -z-10 h-[600px]" />

      <section className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-widest text-lime-glow">About us</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold sm:text-6xl">Auction night, the way it should feel.</h1>
          <p className="mt-6 text-lg text-ink-300">
            BidWicket is player auction software for cricket tournaments. We bring the excitement of a big league auction to local leagues, without the Excel sheets, slideshows and WhatsApp screenshots.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto mt-20 max-w-5xl px-4 sm:px-6">
        <Reveal className="card grid gap-8 p-7 sm:p-10 md:grid-cols-[1fr_1.4fr] md:items-center">
          <div>
            <Gavel className="h-8 w-8 text-gold" />
            <h2 className="mt-4 font-display text-3xl font-bold">Why we built it</h2>
          </div>
          <div className="space-y-4 text-ink-200">
            <p>
              Across India, thousands of local tournaments pick their teams through a player auction. It’s often the most exciting night of the season, and usually the most chaotic one too: a Google Form exported to Excel, a slide for every player, purses tracked on paper and arguments about who could still afford whom.
            </p>
            <p>
              BidWicket puts all of it in one place. Players sign up with one link, the auction runs live on any screen, team owners can bid from their phones, the rules are enforced automatically, and the squads are ready to share the moment the last player is sold.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto mt-20 max-w-5xl px-4 sm:px-6">
        <Reveal className="text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">What we believe in</h2>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {BELIEFS.map((b, i) => (
            <Reveal key={b.title} delay={0.05 * i}>
              <div className="card h-full p-6">
                <b.icon className="h-6 w-6" style={{ color: `color-mix(in oklab, ${b.c} var(--tint-strength), black)` }} />
                <h3 className="mt-4 font-display text-lg font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm text-ink-300">{b.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-5xl px-4 sm:px-6">
        <Reveal className="card p-7 sm:p-10">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-sky-live" />
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Who it’s for</h2>
          </div>
          <p className="mt-3 text-ink-300">Any tournament that picks teams by auction, from 4 teams in a society to a full corporate league.</p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {FOR.map((f) => (
              <li key={f} className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-ink-100">{f}</li>
            ))}
          </ul>
        </Reveal>
      </section>

      <section className="mx-auto mt-20 grid max-w-5xl gap-5 px-4 sm:px-6 md:grid-cols-2">
        <Reveal>
          <div className="card h-full p-7">
            <HeartHandshake className="h-6 w-6 text-rose-hot" />
            <h2 className="mt-4 font-display text-2xl font-bold">Built with organisers</h2>
            <p className="mt-2 text-ink-300">
              Many features started as a request from someone running a real auction. Every account has a feedback button in the app, and we read every message.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <div className="card h-full p-7">
            <Mail className="h-6 w-6 text-lime-glow" />
            <h2 className="mt-4 font-display text-2xl font-bold">Get in touch</h2>
            <p className="mt-2 text-ink-300">Questions, partnerships or help with your auction:</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="mt-3 inline-block text-lg font-semibold text-lime-glow hover:underline">{CONTACT_EMAIL}</a>
            <p className="mt-3 text-sm text-ink-400">BidWicket is built in India.</p>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto mt-20 max-w-3xl px-4 text-center sm:px-6">
        <Reveal>
          <Trophy className="mx-auto h-8 w-8 text-gold" />
          <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Ready for your auction night?</h2>
          <p className="mt-3 text-ink-300">Your first auctions are free. No card needed.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="inline-flex h-12 items-center gap-2 rounded-xl bg-lime-bright px-6 font-semibold text-on-accent hover:bg-lime-hover">
              Create your auction <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/pricing" className="inline-flex h-12 items-center rounded-xl border border-white/10 px-6 font-semibold hover:bg-white/5">See pricing</Link>
          </div>
        </Reveal>
      </section>
    </main>
  )
}
