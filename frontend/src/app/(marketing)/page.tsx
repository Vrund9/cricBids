import Link from 'next/link'
import {
  ArrowRight, ClipboardList, Dices, FileSpreadsheet, Gavel, HelpCircle, Layers, Link2, MessageSquareQuote, Moon, Presentation, Shuffle,
  ShieldCheck, Smartphone, Sparkles, Undo2, UserCheck, Users, Wallet, X,
} from 'lucide-react'
import { HeroAuctionDemo, LiveLinkVisual, Reveal, SoldTicker, SquadFieldVisual } from '@/components/marketing'
import { SITE_URL } from '@/lib/api'
import { PRICING } from '@/lib/plans'

const FAQ = [
  {
    q: 'How do players register for the auction?',
    a: 'Share your tournament’s registration link on WhatsApp or as a QR code. Players fill in name, mobile, role, photo and any custom questions you add — they appear in your player list instantly. You can also upload an existing Excel or Google Forms export.',
  },
  {
    q: 'Can I use my existing Excel sheet?',
    a: 'Yes. Upload any .xlsx, .xls or .csv file. BidWicket detects columns like name, role, mobile, photo and category automatically (including Google Forms exports and Google Drive photo links), and you can adjust the mapping before importing.',
  },
  {
    q: 'Do I still need to make a PowerPoint for auction day?',
    a: 'No. The live link is your presentation: a big-screen view with the player photo, role, base price, live bid, team purses and a SOLD animation. Put it on a projector or TV and share the same link with everyone.',
  },
  {
    q: 'How are players picked during the auction?',
    a: 'You choose: fully random (cryptographically shuffled, so nobody can predict the order), random within categories (marquee / A / B / C first), or in list order. Unsold players can be re-auctioned in another round. In a hurry? A one-click random auction deals every player to a team at base price, category by category.',
  },
  {
    q: 'Do I have to split players into categories?',
    a: 'No. When you create a tournament you pick category-wise (Marquee, A, B… with their own base prices and order) or one open pool. You can edit the category list any time before the auction starts.',
  },
  {
    q: 'Can teams keep retained players?',
    a: 'Yes. Mark retained players per team before the auction and choose whether their price comes out of the team’s purse. They show up in the squad straight away.',
  },
  {
    q: 'Can team owners bid from their own phones?',
    a: 'Yes. Turn on remote bidding and each team gets a private bidding link. The server checks every bid against the team’s purse and squad rules, and two bids at the same moment can never both win.',
  },
  {
    q: 'What stops a team from overspending?',
    a: 'Purse rules are enforced automatically. A team can only bid up to an amount that still leaves enough money to fill its minimum squad at base price, and it can’t exceed the maximum squad size. Each team’s squad page also shows which roles are still missing and who they can still afford.',
  },
  {
    q: 'How much does it cost?',
    a: `Your first ${PRICING.freeAuctions} auctions with up to ${PRICING.includedTeams} teams are free — the full product, not a trial. After that you pay per use (₹${PRICING.perExtraTeam} per extra team, ₹${PRICING.auctionFee} per auction), or ₹${PRICING.pro} for Pro with everything unlocked on one auction.`,
  },
]

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'BidWicket',
    applicationCategory: 'SportsApplication',
    operatingSystem: 'Web, Android, iOS',
    url: SITE_URL,
    description: 'Live cricket player auction software for tournaments: registration forms, Excel import, realtime big-screen auction link, team purses and results export.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    featureList: ['Player registration form', 'Excel import with auto column mapping', 'Category-wise or open player pool', 'Realtime live auction link', 'Remote team bidding', 'One-click random auction', 'Retained players', 'Team squad pages with role analysis and field view', 'Purse and squad rules', 'Excel and PDF results export'],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'BidWicket',
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
  },
]

const STEPS = [
  { icon: ClipboardList, title: 'Collect players', text: 'Share a registration link or upload your Excel. Go category-wise (Marquee, A, B…) or keep one open pool.' },
  { icon: Sparkles, title: 'Answer a few questions', text: 'Teams, purse, retained players, base prices, squad size, order. Smart defaults from your player pool.' },
  { icon: Gavel, title: 'Go live', text: 'Run the control room, put the live link on the projector, and open each team’s squad page as it fills up.' },
  { icon: FileSpreadsheet, title: 'Export results', text: 'Team-wise Excel and a printable PDF report with every squad, price and unsold player.' },
]

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden pt-28 sm:pt-36">
          <div className="grid-bg absolute inset-0 -z-10" />
          {/* grid-cols-1 = minmax(0,1fr): without it the mobile column grows to fit the live demo's widest bid and the hero reflows on every bid. */}
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:pb-28">
            <div className="min-w-0">
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full border border-lime-glow/25 bg-lime-glow/10 px-3 py-1 text-xs font-semibold text-lime-glow">
                  <Sparkles className="h-3.5 w-3.5" /> New · Team squad pages with a live field view
                </span>
              </Reveal>
              <Reveal delay={0.05}>
                <h1 className="mt-6 font-display text-[2.6rem] font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">
                  Run your cricket auction <span className="text-gradient">like the IPL.</span>
                </h1>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-6 max-w-xl text-lg text-ink-200">
                  Stop juggling Excel sheets, PPT slides and WhatsApp screenshots. Collect players with a link, answer a few questions, and run a live auction everyone can watch in realtime.
                </p>
              </Reveal>
              <Reveal delay={0.15} className="mt-9 flex flex-wrap items-center gap-3">
                <Link href="/signup" className="group inline-flex h-12 items-center gap-2 rounded-xl bg-lime-bright px-6 font-semibold text-on-accent shadow-[0_8px_40px_-8px_color-mix(in_oklab,var(--color-lime-bright)_60%,transparent)] hover:bg-lime-hover">
                  Create your auction <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
                <Link href="/pricing" className="inline-flex h-12 items-center rounded-xl border border-white/15 px-6 font-semibold text-white hover:bg-white/5">
                  See pricing
                </Link>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="mt-6 text-sm text-ink-400">First {PRICING.freeAuctions} auctions free · Works on any phone, laptop or projector · No app install</p>
              </Reveal>
            </div>
            <Reveal delay={0.15}>
              <HeroAuctionDemo />
            </Reveal>
          </div>
          <SoldTicker />
        </section>

        {/* Before / after */}
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-4xl font-bold sm:text-5xl">From spreadsheet chaos to auction night</h2>
            <p className="mt-4 text-ink-300">Most local tournaments still run auctions off a static sheet and a slideshow. BidWicket makes the whole thing dynamic.</p>
          </Reveal>
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            <Reveal>
              <div className="card h-full p-7">
                <p className="text-sm font-semibold uppercase tracking-widest text-rose-hot">The old way</p>
                <ul className="mt-5 space-y-4 text-ink-200">
                  {[
                    'Google Form → download Excel → clean columns by hand',
                    'Copy every player into a PPT slide, one by one',
                    'Track bids and purses on paper or a second sheet',
                    'Screenshot results into WhatsApp groups all night',
                    'Late entries? Redo the slides.',
                  ].map((t) => (
                    <li key={t} className="flex gap-3"><X className="mt-0.5 h-5 w-5 shrink-0 text-rose-hot" />{t}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="card h-full border-lime-glow/20 p-7 shadow-[0_0_80px_-30px_color-mix(in_oklab,var(--color-lime-bright)_40%,transparent)]">
                <p className="text-sm font-semibold uppercase tracking-widest text-lime-glow">With BidWicket</p>
                <ul className="mt-5 space-y-4 text-ink-100">
                  {[
                    'Players register themselves via your link — or drop in any Excel',
                    'Every player becomes a live auction card automatically',
                    'Purses, squad limits and bid steps enforced for you',
                    'One live link updates every screen in under a second',
                    'Late entries join the queue even mid-auction',
                  ].map((t) => (
                    <li key={t} className="flex gap-3"><Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-lime-glow" />{t}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-y border-white/5 bg-ink-950/40 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Reveal className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-widest text-lime-glow">How it works</p>
              <h2 className="mt-3 font-display text-4xl font-bold sm:text-5xl">Ready for auction day in 15 minutes</h2>
            </Reveal>
            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <Reveal key={s.title} delay={i * 0.06}>
                  <div className="card relative h-full p-6">
                    <span className="absolute right-5 top-4 font-display text-5xl font-black text-white/5">0{i + 1}</span>
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-lime-glow/10 text-lime-glow">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 font-display text-xl font-semibold">{s.title}</h3>
                    <p className="mt-2 text-sm text-ink-300">{s.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* What's new */}
        <section id="new" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-24 sm:px-6">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-lime-glow">New this season</p>
            <h2 className="mt-3 font-display text-4xl font-bold sm:text-5xl">Build squads, not spreadsheets</h2>
            <p className="mt-4 text-ink-300">Every team now gets its own live page, and setting up an auction fits how your league actually works.</p>
          </Reveal>
          <div className="mt-14 grid gap-5 lg:grid-cols-5">
            <Reveal className="lg:col-span-3">
              <div className="card h-full border-lime-glow/20 p-7">
                <Users className="h-6 w-6 text-lime-glow" />
                <h3 className="mt-4 font-display text-2xl font-semibold">A live squad page for every team</h3>
                <p className="mt-2 text-ink-300">
                  Open any team from the control room to see its bought players, how the squad balances against a playing XI, which available players it can still afford by role, and the XI laid out on a cricket field once the squad is complete.
                </p>
                <SquadFieldVisual />
              </div>
            </Reveal>
            <div className="grid gap-5 lg:col-span-2">
              {[
                { icon: Layers, title: 'Category-wise or one open pool', text: 'Choose when you create the tournament. Categories carry their own base prices and draw order through registration, import, the auction and exports.', c: '#38bdf8' },
                { icon: Dices, title: 'One-click random auction', text: 'No time for a full auction? Deal every player to a team at base price, grade by grade, in one click.', c: '#ffb020' },
                { icon: UserCheck, title: 'Retained players', text: 'Lock in each team’s retentions before bidding starts, with or without deducting them from the purse.', c: '#a78bfa' },
              ].map((f, i) => (
                <Reveal key={f.title} delay={0.05 * (i + 1)}>
                  <div className="card flex h-full gap-4 p-6">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${f.c} 14%, transparent)` }}>
                      <f.icon className="h-5 w-5" style={{ color: `color-mix(in oklab, ${f.c} var(--tint-strength), black)` }} />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                      <p className="mt-1.5 text-sm text-ink-300">{f.text}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Features bento */}
        <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-4xl font-bold sm:text-5xl">Everything auction night needs</h2>
            <p className="mt-4 text-ink-300">Built with organisers of box cricket, tennis-ball, corporate, society and college leagues.</p>
          </Reveal>
          <div className="mt-14 grid gap-5 md:grid-cols-6">
            <Reveal className="md:col-span-3">
              <div className="card h-full p-7">
                <Link2 className="h-6 w-6 text-lime-glow" />
                <h3 className="mt-4 font-display text-2xl font-semibold">One live link, every screen</h3>
                <p className="mt-2 text-ink-300">Realtime updates over websockets with automatic reconnect. Rich preview when you paste it in WhatsApp. Shows a live viewer count.</p>
                <LiveLinkVisual />
              </div>
            </Reveal>
            <Reveal className="md:col-span-3" delay={0.05}>
              <div className="card h-full p-7">
                <Presentation className="h-6 w-6 text-sky-live" />
                <h3 className="mt-4 font-display text-2xl font-semibold">Big-screen mode replaces the PPT</h3>
                <p className="mt-2 text-ink-300">Player photo, role, base price, live bid, leading team, countdown and a SOLD stamp — designed to be read from the back of the hall.</p>
                <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs text-ink-300">
                  {['Player card', 'Team purses', 'Recent sales'].map((t) => (
                    <div key={t} className="rounded-xl border border-white/5 bg-white/[0.03] px-2 py-6">{t}</div>
                  ))}
                </div>
              </div>
            </Reveal>
            {[
              { icon: Smartphone, title: 'Remote bidding paddles', text: 'Each team owner gets a private link. Bids are validated server-side — no double bids, ever.', c: '#38bdf8' },
              { icon: Wallet, title: 'Purse & squad rules', text: 'Max bid automatically keeps money for the minimum squad. Tiered bid increments.', c: '#ffb020' },
              { icon: Shuffle, title: 'Fair random draw', text: 'Crypto-random order, or random within marquee/A/B/C categories. Re-auction unsold players.', c: '#c8ff2e' },
              { icon: MessageSquareQuote, title: 'Custom registration form', text: 'Add your own questions — jersey size, availability, fees paid. Approve entries if you want.', c: '#a78bfa' },
              { icon: FileSpreadsheet, title: 'Results your way', text: 'Team-wise Excel with auto-sized columns, a summary and unsold sheet, plus a printable PDF report.', c: '#0ea5e9' },
              { icon: Moon, title: 'Light & dark, your theme', text: 'Stadium, pitch or your own image behind the live screen, in your colours. Readable in a bright hall or a dark one.', c: '#f472b6' },
              { icon: Gavel, title: 'Control room built for speed', text: 'Keyboard shortcuts, every team’s purse at a glance under the bid buttons, pause and re-auction unsold.', c: '#c8ff2e' },
              { icon: Undo2, title: 'Undo anything', text: 'Undo a bid, reverse a sale with automatic purse refund, skip a player, pause the room.', c: '#ff4d6d' },
              { icon: ShieldCheck, title: 'Private by default', text: 'Phone numbers and emails never appear on public screens. Links can be reset any time.', c: '#34d399' },
            ].map((f, i) => (
              <Reveal key={f.title} className="md:col-span-2" delay={0.04 * i}>
                <div className="card h-full p-6">
                  <f.icon className="h-6 w-6" style={{ color: `color-mix(in oklab, ${f.c} var(--tint-strength), black)` }} />
                  <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-ink-300">{f.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-24 sm:px-6">
          <Reveal className="text-center">
            <HelpCircle className="mx-auto h-8 w-8 text-lime-glow" />
            <h2 className="mt-4 font-display text-4xl font-bold">Questions organisers ask</h2>
          </Reveal>
          <div className="mt-12 space-y-3">
            {FAQ.map((f, i) => (
              <Reveal key={f.q} delay={i * 0.03}>
                <details className="card group p-5 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    {f.q}
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/5 text-lg transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-ink-300">{f.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-24 sm:px-6">
          <Reveal className="mx-auto max-w-5xl">
            <div className="grain relative overflow-hidden rounded-[2rem] border border-lime-glow/20 bg-gradient-to-br from-lime-glow/15 via-ink-800 to-ink-900 p-10 text-center sm:p-16">
              <h2 className="font-display text-4xl font-extrabold sm:text-5xl">Your next auction, without the PPT.</h2>
              <p className="mx-auto mt-4 max-w-xl text-ink-200">Set up in minutes. Share one link. Let the bidding wars begin — your first {PRICING.freeAuctions} auctions are on us.</p>
              <Link href="/signup" className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-lime-bright px-7 font-semibold text-on-accent hover:bg-lime-hover">
                Create your auction <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </section>
      </main>
    </>
  )
}
