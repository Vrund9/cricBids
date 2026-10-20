'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowRight, CalendarPlus, Check, Dices, FileSpreadsheet, Gavel, Gift, Link2, ListChecks, Palette, Shield, Smartphone, Timer, Trophy, UserCheck } from 'lucide-react'
import { CricketScene } from '@/components/cricket-scene'
import { PRICING } from '@/lib/plans'
import { cn } from '@/lib/cn'

interface Step {
  icon: typeof CalendarPlus
  title: string
  text: string
  points: string[]
  where: string
  color: string
  optional?: boolean
  Visual: () => React.ReactNode
}

const STEPS: Step[] = [
  {
    icon: CalendarPlus,
    title: 'Create the auction',
    text: 'Give it a name and the auction date. Add a logo or poster if you like.',
    points: ['Takes under a minute', 'Picture shows on every screen'],
    where: 'Tournaments → New auction',
    color: '#38bdf8',
    Visual: CreateVisual,
  },
  {
    icon: FileSpreadsheet,
    title: 'Add players',
    text: 'Upload the Excel you already have, share a registration link, or both — everyone lands in one list.',
    points: ['Odd column names are matched for you', 'Players register with their own photo'],
    where: 'Players tab',
    color: '#22c55e',
    Visual: PlayersVisual,
  },
  {
    icon: ListChecks,
    title: 'Set the auction rules',
    text: 'Answer a few questions — suggestions come from your player pool.',
    points: ['Teams, purse and base price', 'Squad size, bid steps, player order, timer'],
    where: 'Auction rules tab',
    color: '#a78bfa',
    Visual: RulesVisual,
  },
  {
    icon: Shield,
    title: 'Name teams & retain players',
    text: 'Add logos, owners and colours. Teams can keep players before the auction.',
    points: ['Retention price can come out of the purse — or not', 'Owners get a private bidding link'],
    where: 'Teams tab',
    color: '#f97316',
    Visual: TeamsVisual,
  },
  {
    icon: Palette,
    title: 'Pick a look',
    text: 'Colour themes, your brand colour and backgrounds like stadium lights or your own photo.',
    points: ['Preview everything for free', `₹${PRICING.themeUnlock} add-on to save a custom look`],
    where: 'Settings → Theme',
    color: '#ec4899',
    optional: true,
    Visual: ThemeVisual,
  },
  {
    icon: Gavel,
    title: 'Go live',
    text: 'Run the bidding from the control room and put the live link on the projector.',
    points: ['Keyboard shortcuts, undo and re-auction', 'Owners bid from their phones', 'One auction live at a time'],
    where: 'Control room',
    color: '#ff4d6d',
    Visual: LiveVisual,
  },
  {
    icon: Trophy,
    title: 'Share the results',
    text: 'Squads team by team, a designed PDF report and an Excel file with a sheet per team.',
    points: ['Results lock once the auction is complete'],
    where: 'Results tab',
    color: '#f59e0b',
    Visual: ResultsVisual,
  },
]

export default function HowItWorks() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Hero */}
      <section className="card relative overflow-hidden p-7 sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full opacity-20 blur-3xl" style={{ background: 'var(--color-lime-bright)' }} />
        <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-lime-glow">How it works</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold leading-tight sm:text-5xl">From Excel to auction day in 7 steps</h1>
            <p className="mt-3 max-w-xl text-ink-300">The same order the app walks you through. Most organisers are ready in about ten minutes.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard" className="inline-flex h-11 items-center gap-2 rounded-xl bg-lime-bright px-5 font-semibold text-on-accent hover:bg-lime-hover">Start an auction <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/plans" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 px-5 font-semibold hover:bg-white/5">See pricing</Link>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <CricketScene variant="six" className="h-40" />
            <div className="grid w-full grid-cols-3 gap-2 text-center">
              {[['~10 min', 'to set up'], ['7', 'simple steps'], [`${PRICING.freeAuctions}`, 'auctions free']].map(([v, l]) => (
                <div key={l} className="rounded-xl bg-white/[0.04] px-2 py-3">
                  <p className="font-display text-xl font-black">{v}</p>
                  <p className="text-[11px] text-ink-400">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* At a glance */}
      <nav className="no-scrollbar mt-8 flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible" aria-label="Steps">
        {STEPS.map((s, i) => (
          <a key={s.title} href={`#step-${i + 1}`} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-3.5 text-sm font-medium hover:border-white/25">
            <span className="grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: s.color }}>{i + 1}</span>
            {s.title}
          </a>
        ))}
      </nav>

      {/* Steps */}
      <ol className="mt-10 space-y-6">
        {STEPS.map((s, i) => (
          <motion.li
            key={s.title}
            id={`step-${i + 1}`}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className="card scroll-mt-24 overflow-hidden"
          >
            <div className={cn('grid items-center gap-6 p-6 sm:p-8 md:grid-cols-2', i % 2 === 1 && 'md:[&>*:first-child]:order-2')}>
              <div>
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${s.color} 15%, transparent)`, color: s.color }}><s.icon className="h-5 w-5" /></span>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: s.color }}>Step {i + 1}{s.optional ? ' · optional' : ''}</span>
                </div>
                <h2 className="mt-4 font-display text-2xl font-bold">{s.title}</h2>
                <p className="mt-2 text-ink-300">{s.text}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {s.points.map((pt) => (
                    <li key={pt} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: s.color }} />{pt}</li>
                  ))}
                </ul>
                <p className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1 text-xs text-ink-300">Where: <b className="text-ink-100">{s.where}</b></p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-ink-950/40 p-5" aria-hidden>
                <s.Visual />
              </div>
            </div>
            {i === 5 && <RandomCallout />}
          </motion.li>
        ))}
      </ol>

      {/* Closing */}
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="card flex gap-4 p-6">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-live/10 text-sky-live"><Trophy className="h-5 w-5" /></span>
          <div>
            <p className="font-semibold">Free for your first {PRICING.freeAuctions} auctions</p>
            <p className="mt-1 text-sm text-ink-300">Up to {PRICING.includedTeams} teams and {PRICING.maxPlayers} players. Pay only for extras you choose.</p>
            <Link href="/plans" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-lime-glow">See pricing <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
        <div className="card flex gap-4 p-6">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold"><Gift className="h-5 w-5" /></span>
          <div>
            <p className="font-semibold">Earn reward points</p>
            <p className="mt-1 text-sm text-ink-300">5 points per suggestion or bug report. 100 points = 10% off any add-on.</p>
            <Link href="/account/feedback" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-lime-glow">Give feedback <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
      </div>

      <section className="card relative mt-6 overflow-hidden p-8 text-center sm:p-10">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: 'radial-gradient(600px 200px at 50% 120%, var(--color-lime-bright), transparent 70%)' }} />
        <div className="relative">
          <h2 className="font-display text-3xl font-bold">Ready for auction day?</h2>
          <p className="mt-2 text-ink-300">Create your auction now — you can finish the setup any time before the date.</p>
          <Link href="/dashboard" className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-lime-bright px-6 font-semibold text-on-accent hover:bg-lime-hover">Start an auction <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </main>
  )
}

function RandomCallout() {
  return (
    <div className="flex flex-col gap-3 border-t border-white/5 bg-sky-live/[0.06] px-6 py-4 sm:flex-row sm:items-center sm:px-8">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-live/15 text-sky-live"><Dices className="h-4 w-4" /></span>
      <p className="flex-1 text-sm text-ink-200">
        <b>No bidding night?</b> Run a <b>random auction</b> instead: one click shares every player out evenly at base price — grade by grade if players have categories, fully random if not.
      </p>
      <span className="shrink-0 self-start rounded-full border border-gold/40 px-2.5 py-0.5 text-xs font-bold text-gold sm:self-auto">₹{PRICING.randomAuction} add-on</span>
    </div>
  )
}

// ───────── Small pictures of each step (decorative) ─────────

function CreateVisual() {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">New auction</p>
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-xs font-black">GPL</div>
        <div className="rounded-lg border border-white/15 px-3 py-1.5 text-xs">Tournament picture</div>
      </div>
      {['Gully Premier League 2026', '10 Nov 2026 · 7:00 pm'].map((v) => (
        <div key={v} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">{v}</div>
      ))}
      <div className="rounded-lg bg-lime-bright py-2 text-center text-sm font-semibold text-on-accent">Create &amp; add players</div>
    </div>
  )
}

function PlayersVisual() {
  const rows = [['Plyer Nme', 'Player name', 'check'], ['Mobil No.', 'Mobile', 'check'], ['Speciality', 'Role', 'matched'], ['Jersey Size', 'Extra info', '']]
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg bg-lime-glow/10 px-3 py-2 text-xs text-lime-glow"><FileSpreadsheet className="h-3.5 w-3.5" /> players.xlsx · 3 of 4 columns matched</div>
      {rows.map(([from, to, tag]) => (
        <div key={from} className="flex items-center gap-2 text-xs">
          <span className="w-24 truncate text-ink-300">{from}</span>
          <ArrowRight className="h-3 w-3 shrink-0 text-ink-400" />
          <span className="flex-1 rounded-md border border-white/10 px-2 py-1">{to}</span>
          {tag && <span className={cn('rounded-full px-1.5 text-[9px] font-bold uppercase', tag === 'check' ? 'bg-gold/15 text-gold' : 'bg-lime-glow/10 text-lime-glow')}>{tag}</span>}
        </div>
      ))}
      <div className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-ink-300"><Link2 className="h-3.5 w-3.5 text-sky-live" /> bidwicket.app/register/… <span className="ml-auto text-sky-live">Share</span></div>
    </div>
  )
}

function RulesVisual() {
  return (
    <div className="space-y-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-lime-glow">Question 2 of 8</p>
      <p className="font-display text-lg font-bold">How much can each team spend?</p>
      <p className="font-display text-3xl font-black">₹1,00,000</p>
      <div className="flex flex-wrap gap-2">
        {['₹50K', '₹1L · suggested', '₹2L', '₹5L'].map((c, i) => <span key={c} className={cn('rounded-full border px-2.5 py-1 text-xs', i === 1 ? 'border-lime-glow/60 bg-lime-glow/10 text-lime-glow' : 'border-white/10 text-ink-300')}>{c}</span>)}
      </div>
      <div className="flex items-center gap-2 text-xs text-ink-400"><Timer className="h-3.5 w-3.5" /> Optional 15-second bid timer</div>
    </div>
  )
}

function TeamsVisual() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[['Royal Strikers', '#3B82F6', 'R. Shah'], ['Desert Kings', '#F59E0B', 'A. Mehta']].map(([n, c, r]) => (
        <div key={n} className="overflow-hidden rounded-xl border border-white/10">
          <div className="h-1" style={{ background: c }} />
          <div className="space-y-2 p-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[10px] font-black text-white" style={{ background: c }}>{n.split(' ').map((w) => w[0]).join('')}</span>
              <span className="truncate text-xs font-semibold">{n}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2 py-1 text-[11px]"><UserCheck className="h-3 w-3 shrink-0 text-gold" /> <span className="truncate">{r} · retained</span></div>
            <div className="flex items-center gap-1.5 text-[11px] text-sky-live"><Smartphone className="h-3 w-3" /> Bidding link</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ThemeVisual() {
  const themes = [['#c8ff2e', '#080b13'], ['#5b8cff', '#070b24'], ['#ff4d6d', '#14070b'], ['#2ee59d', '#04120c'], ['#b388ff', '#0b0716'], ['#22d3ee', '#041019']]
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {themes.map(([a, bg], i) => (
          <div key={a} className={cn('h-14 rounded-xl border-2', i !== 1 && 'border-transparent')} style={{ background: `radial-gradient(80px 40px at 80% 0%, ${a}66, transparent 70%), ${bg}`, borderColor: i === 1 ? a : undefined }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {['Stadium lights', 'Pitch stripes', 'Your image'].map((b, i) => <span key={b} className={cn('rounded-full border px-2.5 py-1 text-[11px]', i === 0 ? 'border-lime-glow/60 text-lime-glow' : 'border-white/10 text-ink-300')}>{b}</span>)}
      </div>
    </div>
  )
}

function LiveVisual() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold">Rohan Shah · All-rounder</span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-hot/15 px-2 py-0.5 text-[10px] font-bold text-rose-hot"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-hot" /> LIVE</span>
      </div>
      <p className="font-display text-4xl font-black">₹45,000</p>
      <div className="grid grid-cols-4 gap-1.5">
        {[['RS', '#3B82F6'], ['DK', '#F59E0B'], ['CT', '#EF4444'], ['HW', '#10B981']].map(([s, c], i) => (
          <div key={s} className={cn('rounded-lg border px-2 py-2 text-center text-[11px] font-bold', i === 0 ? 'border-2' : 'border-white/10')} style={{ borderColor: i === 0 ? c : undefined, background: `color-mix(in oklab, ${c} 12%, transparent)` }}>{s}</div>
        ))}
      </div>
      <div className="flex gap-2">
        <span className="flex-1 rounded-lg bg-gold-bright py-2 text-center text-xs font-bold text-on-gold">Sell · S</span>
        <span className="rounded-lg border border-white/10 px-3 py-2 text-xs">Undo · Z</span>
      </div>
    </div>
  )
}

function ResultsVisual() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="rounded-lg border border-white/10 px-2.5 py-1 text-xs">Royal Strikers ▾</span>
        <div className="flex gap-1.5">
          <span className="rounded-lg border border-white/10 px-2 py-1 text-[11px]">PDF</span>
          <span className="rounded-lg bg-lime-bright px-2 py-1 text-[11px] font-semibold text-on-accent">Excel</span>
        </div>
      </div>
      {[['Arjun Mehta', '₹1.45L', 'AM'], ['Kabir Khan', '₹82K', 'KK'], ['Dev Patel', '₹64K', 'DP']].map(([n, p, ini], i) => (
        <div key={n} className="flex items-center gap-3 text-sm">
          <span className="w-4 text-xs text-ink-400">{i + 1}</span>
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-[10px] font-bold">{ini}</span>
          <span className="flex-1">{n}</span>
          <span className="font-mono text-xs text-gold">{p}</span>
        </div>
      ))}
    </div>
  )
}
