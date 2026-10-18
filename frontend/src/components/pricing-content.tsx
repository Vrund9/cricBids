'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Check, Crown, Dices, Gift, KeyRound, Minus, Palette, Plus, Shield, Ticket } from 'lucide-react'
import { Reveal } from './marketing'
import { CricketScene } from './cricket-scene'
import { ADD_ONS, FREE_FEATURES, PRICING, PRICING_FAQ, PRO_FEATURES } from '@/lib/plans'
import { cn } from '@/lib/cn'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { TournamentSummary } from '@/lib/types'
import { ordinal } from '@/lib/format'

const META = {
  teams: { icon: Shield, color: '#38bdf8' },
  theme: { icon: Palette, color: '#ec4899' },
  random: { icon: Dices, color: '#a78bfa' },
  auction: { icon: Ticket, color: '#f59e0b' },
} as const

/** What Pro saves on the biggest auction (16 teams, every add-on). */
const MAX_PRO_SAVING = (PRICING.maxTeams - PRICING.includedTeams) * PRICING.perExtraTeam + PRICING.themeUnlock + PRICING.randomAuction + PRICING.auctionFee - PRICING.pro

/** Pay-per-use pricing, shared by the public /pricing page and the in-app /plans page. */
/** `inApp`: signed-in page — the calculator can send the picks straight to one of your auctions' checkout. */
/** The signed-in organiser's reward discount — same rule as checkout: 10% per 100 points, up to 50%. */
function useRewardDiscount() {
  const { user } = useAuth()
  const points = user?.rewardPoints ?? 0
  const pct = Math.min(50, Math.floor(points / 100) * 10)
  return { points, pct, apply: (amount: number) => Math.round((amount * (100 - pct)) / 100) }
}

export function PricingContent({ cta, inApp }: { cta: { href: string; label: string }; inApp?: boolean }) {
  const reward = useRewardDiscount()
  return (
    <>
      {reward.pct > 0 && (
        <Reveal className="mt-10">
          <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-gold/30 bg-gold/10 px-5 py-3 text-center text-sm text-gold">
            <Gift className="h-4 w-4" /> You have <b>{reward.points} reward points</b> — <b>{reward.pct}% off</b> any purchase. Prices below include it.
          </div>
        </Reveal>
      )}
      {/* Free vs Pro */}
      <div className="mt-14 grid gap-5 lg:grid-cols-2">
        <Reveal>
          <div className="card relative flex h-full flex-col overflow-hidden p-7 sm:p-9">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-20 blur-3xl" style={{ background: 'var(--color-lime-bright)' }} />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full bg-lime-glow/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-lime-glow">Free</span>
                <p className="mt-4 font-display text-6xl font-black tracking-tight">₹0</p>
                <p className="mt-1 text-sm text-ink-300">for your first {PRICING.freeAuctions} auctions — the full product, not a trial.</p>
              </div>
              <CricketScene variant="six" className="hidden h-24 shrink-0 sm:block" />
            </div>
            <ul className="relative mt-6 grid flex-1 content-start gap-3 text-sm sm:grid-cols-2">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex gap-2.5"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lime-glow/15"><Check className="h-3 w-3 text-lime-glow" /></span>{f}</li>
              ))}
            </ul>
            <Link href={cta.href} className="relative mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-lime-bright px-6 font-semibold text-on-accent hover:bg-lime-hover">
              {cta.label} <ArrowRight className="h-4 w-4" />
            </Link>
            {/* Same height as the note under the Pro button, so both buttons line up. */}
            <p className="relative mt-3 text-center text-xs text-ink-400">No card needed · add extras any time</p>
          </div>
        </Reveal>
        <Reveal delay={0.06}>
          <div className="card relative flex h-full flex-col overflow-hidden border-gold/40 p-7 sm:p-9 shadow-[0_0_80px_-30px_color-mix(in_oklab,var(--color-gold-bright)_55%,transparent)]">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-25 blur-3xl" style={{ background: 'var(--color-gold-bright)' }} />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-gold"><Crown className="h-3.5 w-3.5" /> Pro</span>
                <p className="mt-4 flex flex-wrap items-baseline gap-2">
                  <span className="font-display text-6xl font-black tracking-tight">₹{reward.apply(PRICING.pro)}</span>
                  {reward.pct > 0 && <span className="text-lg font-semibold text-ink-400 line-through">₹{PRICING.pro}</span>}
                  <span className="text-sm text-ink-400">per auction{reward.pct > 0 ? ` · −${reward.pct}% with your points` : ''}</span>
                </p>
                <p className="mt-1 text-sm text-ink-300">Every add-on unlocked for one auction — one price, no maths.</p>
              </div>
              <span className="hidden shrink-0 rounded-full border border-gold/40 px-3 py-1 text-xs font-bold text-gold sm:inline-flex">Save up to ₹{MAX_PRO_SAVING}</span>
            </div>
            <ul className="relative mt-6 grid flex-1 content-start gap-3 text-sm sm:grid-cols-2">
              <li className="flex gap-2.5 sm:col-span-2"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold/15"><Check className="h-3 w-3 text-gold" /></span>Everything in Free, plus:</li>
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex gap-2.5"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold/15"><Check className="h-3 w-3 text-gold" /></span>{f}</li>
              ))}
            </ul>
            <a href={inApp ? '#calculator' : cta.href} className="relative mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gold-bright px-6 font-semibold text-on-gold hover:brightness-110">
              <Crown className="h-4 w-4" /> Go Pro on an auction
            </a>
            <p className="relative mt-3 text-center text-xs text-ink-400">{inApp ? 'Pick the auction below and pay.' : 'Buy it from any auction’s overview → Add-ons.'}</p>
          </div>
        </Reveal>
      </div>

      {/* Add-ons */}
      <Reveal className="mt-16 text-center">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">Or add only what you need</h2>
        <p className="mt-2 text-ink-300">Single add-ons, bought per auction from its overview. Nothing renews.</p>
      </Reveal>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {ADD_ONS.map((a, i) => {
          const m = META[a.id]
          return (
            <Reveal key={a.id} delay={0.05 * i}>
              <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className="card relative flex h-full flex-col overflow-hidden p-6">
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: m.color }} />
                <div className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${m.color} 14%, transparent)`, color: m.color }}><m.icon className="h-5 w-5" /></div>
                <h3 className="mt-4 font-display text-xl font-bold">{a.name}</h3>
                <p className="mt-3 flex items-baseline gap-1.5"><span className="font-display text-4xl font-black">{a.price}</span><span className="text-sm text-ink-400">{a.unit}</span></p>
                <p className="mt-3 text-sm leading-relaxed text-ink-300">{a.text}</p>
              </motion.div>
            </Reveal>
          )
        })}
      </div>

      <Reveal className="mt-16">
        <Calculator inApp={inApp} signupHref={cta.href} />
      </Reveal>

      {/* Ways to pay less */}
      <div className="mt-16 grid gap-5 md:grid-cols-2">
        <Reveal>
          <div className="card flex h-full gap-4 p-6">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold"><Gift className="h-5 w-5" /></div>
            <div>
              <h3 className="font-semibold">Reward points</h3>
              <p className="mt-1 text-sm text-ink-300">Send a suggestion or report a bug: 5 points each. Every 100 points takes 10% off any purchase, up to 50%.</p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <div className="card flex h-full gap-4 p-6">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-live/10 text-sky-live"><KeyRound className="h-5 w-5" /></div>
            <div>
              <h3 className="font-semibold">Plan codes</h3>
              <p className="mt-1 text-sm text-ink-300">Got a code from the BidWicket team? It unlocks every add-on on your account. Enter it under Account → Plan activation.</p>
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal className="mx-auto mt-16 max-w-3xl pb-24">
        <h2 className="text-center font-display text-3xl font-bold">Billing questions</h2>
        <div className="mt-8 space-y-3">
          {PRICING_FAQ.map((f) => (
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
    </>
  )
}

/** Live total for one auction, using the same rules as the checkout. */
function Calculator({ inApp, signupHref }: { inApp?: boolean; signupHref: string }) {
  const reward = useRewardDiscount()
  const [teams, setTeams] = useState(8)
  const [theme, setTheme] = useState(false)
  const [random, setRandom] = useState(false)
  const [later, setLater] = useState(false)
  const extra = Math.max(0, teams - PRICING.includedTeams)
  const lines = [
    { label: `${extra} extra team${extra === 1 ? '' : 's'}`, amount: extra * PRICING.perExtraTeam, on: extra > 0 },
    { label: 'Theme customisation', amount: PRICING.themeUnlock, on: theme },
    { label: 'Random auction', amount: PRICING.randomAuction, on: random },
    { label: `Auction fee (${ordinal(PRICING.freeAuctions + 1)} auction or later)`, amount: PRICING.auctionFee, on: later },
  ].filter((l) => l.on)
  const total = lines.reduce((a, l) => a + l.amount, 0)

  return (
    <div id="calculator" className="card grid scroll-mt-24 overflow-hidden lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="space-y-6 p-7 sm:p-9">
        <div>
          <h2 className="font-display text-2xl font-bold sm:text-3xl">What would my auction cost?</h2>
          <p className="mt-1 text-sm text-ink-400">Set it up like your tournament.</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Teams</p>
            <p className="text-xs text-ink-400">{PRICING.includedTeams} free, then ₹{PRICING.perExtraTeam} each</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-30" disabled={teams <= 2} onClick={() => setTeams((n) => n - 1)} aria-label="Fewer teams"><Minus className="h-4 w-4" /></button>
            <span className="w-10 text-center font-display text-3xl font-black tabular">{teams}</span>
            <button className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-30" disabled={teams >= PRICING.maxTeams} onClick={() => setTeams((n) => n + 1)} aria-label="More teams"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
        <input type="range" min={2} max={PRICING.maxTeams} value={teams} onChange={(e) => setTeams(Number(e.target.value))} className="w-full accent-lime-glow" aria-label="Number of teams" />
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { on: theme, set: setTheme, label: 'Custom theme', price: PRICING.themeUnlock },
            { on: random, set: setRandom, label: 'Random auction', price: PRICING.randomAuction },
            { on: later, set: setLater, label: `My ${ordinal(PRICING.freeAuctions + 1)}+ auction`, price: PRICING.auctionFee },
          ].map((o) => (
            <button key={o.label} onClick={() => o.set(!o.on)} aria-pressed={o.on} className={cn('rounded-xl border p-3 text-left text-sm transition', o.on ? 'border-lime-glow/60 bg-lime-glow/10' : 'border-white/10 hover:bg-white/[0.03]')}>
              <span className="flex items-center justify-between font-semibold">{o.label}<span className={cn('grid h-4 w-4 place-items-center rounded border', o.on ? 'border-lime-glow bg-lime-bright text-on-accent' : 'border-white/20')}>{o.on && <Check className="h-3 w-3" />}</span></span>
              <span className="text-xs text-ink-400">+₹{o.price}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col justify-between gap-6 border-t border-white/5 bg-white/[0.02] p-7 sm:p-9 lg:border-l lg:border-t-0">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Your total</p>
          <motion.p key={total} initial={{ scale: 0.92, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} className="mt-1 font-display text-6xl font-black tabular">
            {total ? `₹${total}` : 'Free'}
          </motion.p>
          <p className="text-sm text-ink-400">one-time, for this auction</p>
          {reward.pct > 0 && total > 0 && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-gold/10 px-2.5 py-1 text-sm font-semibold text-gold">
              <Gift className="h-3.5 w-3.5" /> ₹{reward.apply(total)} with your points (−{reward.pct}%)
            </p>
          )}
        </div>
        <ul className="space-y-1.5 text-sm">
          {lines.length ? lines.map((l) => <li key={l.label} className="flex justify-between gap-3"><span className="text-ink-300">{l.label}</span><span className="font-semibold">₹{l.amount}</span></li>) : <li className="text-ink-300">Everything you picked is included free.</li>}
        </ul>
        {total > PRICING.pro ? (
          <p className="flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-gold"><Crown className="h-4 w-4 shrink-0" /> Pro is cheaper: everything for ₹{PRICING.pro} (save ₹{total - PRICING.pro}).</p>
        ) : reward.pct ? null : (
          <p className="text-xs text-ink-400">Have 100+ reward points? Take another 10–50% off at checkout.</p>
        )}
        <Checkout inApp={inApp} signupHref={signupHref} total={total} picks={[teams > PRICING.includedTeams && `teams:${teams}`, theme && 'theme', random && 'random', later && 'fee'].filter(Boolean) as string[]} />
      </div>
    </div>
  )
}

/**
 * Turns the calculator into a purchase. Add-ons belong to one auction, so in the app you pick which
 * auction, and its checkout opens with these picks filled in. On the public page it leads to sign-up.
 */
function Checkout({ inApp, signupHref, total, picks }: { inApp?: boolean; signupHref: string; total: number; picks: string[] }) {
  const reward = useRewardDiscount()
  const [auctions, setAuctions] = useState<TournamentSummary[] | null>(null)
  const [id, setId] = useState('')
  useEffect(() => {
    if (!inApp) return
    api<TournamentSummary[]>('/tournaments')
      .then((rows) => {
        const open = rows.filter((t) => t.status === 'DRAFT' || t.status === 'READY')
        setAuctions(open)
        setId(open[0]?.id ?? '')
      })
      .catch(() => setAuctions([]))
  }, [inApp])

  if (!inApp) {
    return (
      <Link href={signupHref} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-lime-bright px-6 font-semibold text-on-accent hover:bg-lime-hover">
        {total ? `Sign up to pay ₹${total}` : 'Start free'} <ArrowRight className="h-4 w-4" />
      </Link>
    )
  }
  if (!auctions) return <div className="h-12 animate-pulse rounded-xl bg-white/5" />
  if (!auctions.length) {
    return (
      <Link href="/dashboard" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 px-6 text-sm font-semibold hover:bg-white/5">
        Create an auction first <ArrowRight className="h-4 w-4" />
      </Link>
    )
  }
  const go = (hash: string) => (window.location.href = `/t/${id}#addons=${hash}`)
  return (
    <div className="space-y-2">
      <select value={id} onChange={(e) => setId(e.target.value)} aria-label="Auction to buy for" className="h-11 w-full rounded-xl border border-white/10 bg-ink-850 px-3 text-sm">
        {auctions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <div className="flex flex-wrap gap-2">
        <button disabled={!total} onClick={() => go(picks.join(','))} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-lime-bright px-4 text-sm font-semibold text-on-accent hover:bg-lime-hover disabled:opacity-40">
          {total ? `Pay ₹${reward.apply(total)}` : 'Nothing to pay'}
        </button>
        <button onClick={() => go('pro')} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gold-bright px-4 text-sm font-semibold text-on-gold hover:brightness-110">
          <Crown className="h-4 w-4" /> Go Pro · ₹{reward.apply(PRICING.pro)}
        </button>
      </div>
      <p className="text-xs text-ink-400">Only auctions that haven’t started are listed.</p>
    </div>
  )
}
