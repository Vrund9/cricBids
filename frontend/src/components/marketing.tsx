'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useInView } from 'motion/react'
import { useRef } from 'react'
import { Gavel, Radio, Users, Wifi } from 'lucide-react'
import { AnimatedNumber, Avatar, Badge } from './ui'
import { LogoMark } from './brand'
import { RoleAura } from './effects'
import { moneyShort, ROLE_META, roleMeta, tintText } from '@/lib/format'
import { themeStyle } from '@/lib/themes'
import { cn } from '@/lib/cn'

const DEMO_TEAMS = [
  { name: 'Royal Strikers', short: 'RS', color: '#3B82F6', purse: 620000, squad: 4 },
  { name: 'Desert Kings', short: 'DK', color: '#F59E0B', purse: 540000, squad: 5 },
  { name: 'Coastal Titans', short: 'CT', color: '#EF4444', purse: 710000, squad: 3 },
  { name: 'Hill Warriors', short: 'HW', color: '#10B981', purse: 480000, squad: 5 },
]
const DEMO_PURSE = 1000000
const DEMO_SQUAD = 11
const DEMO_PLAYERS = [
  { serial: 7, name: 'Arjun Mehta', role: 'All-rounder', facts: 'Right-hand bat · Off spin · Surat', base: 20000, sold: 145000 },
  { serial: 23, name: 'Kabir Khan', role: 'Bowler', facts: 'Left-arm fast · 24 yrs · Rajkot', base: 10000, sold: 82000 },
  { serial: 41, name: 'Ishaan Rao', role: 'Wicket-keeper', facts: 'Right-hand bat · 27 yrs · Vadodara', base: 15000, sold: 116000 },
  { serial: 12, name: 'Dev Patel', role: 'Batsman', facts: 'Left-hand bat · 22 yrs · Anand', base: 10000, sold: 64000 },
]
const DEMO_SOLD = [
  { name: 'Rohan Iyer', team: 0, price: 97000 },
  { name: 'Sameer Shaikh', team: 1, price: 102000 },
  { name: 'Vihaan Joshi', team: 2, price: 58000 },
]

type DemoBid = { team: number; amount: number }

/**
 * Self-playing mini version of the live big screen for the hero — same layout and dark "Royal"
 * theme as /live, so it reads as the product (and stays dark in light mode, like the real screen).
 */
export function HeroAuctionDemo() {
  const [pi, setPi] = useState(0)
  const [bids, setBids] = useState<DemoBid[]>([])
  const [sold, setSold] = useState(false)
  const [viewers, setViewers] = useState(214)
  const [teams, setTeams] = useState(DEMO_TEAMS)
  const [sales, setSales] = useState(DEMO_SOLD)

  const p = DEMO_PLAYERS[pi]
  const top = bids[0]
  const bid = top?.amount ?? p.base

  useEffect(() => {
    if (sold) {
      const t = setTimeout(() => {
        setPi((i) => (i + 1) % DEMO_PLAYERS.length)
        setBids([])
        setSold(false)
      }, 2600)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      if (top && bid >= p.sold) {
        setSold(true)
        setTeams((ts) => ts.map((tm, i) => (i === top.team ? { ...tm, purse: Math.max(0, tm.purse - bid), squad: Math.min(DEMO_SQUAD, tm.squad + 1) } : tm)))
        setSales((s) => [{ name: p.name, team: top.team, price: bid }, ...s].slice(0, 3))
        return
      }
      const next = top ? Math.min(p.sold, bid + (bid < 50000 ? 5000 : 10000) + (Math.random() > 0.6 ? 5000 : 0)) : p.base
      let team = Math.floor(Math.random() * DEMO_TEAMS.length)
      if (team === top?.team) team = (team + 1) % DEMO_TEAMS.length
      setBids((b) => [{ team, amount: next }, ...b].slice(0, 4))
      setViewers((v) => v + Math.floor(Math.random() * 4))
    }, 700 + Math.random() * 500)
    return () => clearTimeout(t)
  }, [bids, sold, pi, top, bid, p])

  const lead = top ? teams[top.team] : null
  const rm = roleMeta(p.role)

  return (
    <div className="relative">
      <div className="absolute -inset-10 -z-10 rounded-[3rem] blur-3xl" style={{ background: 'radial-gradient(closest-side, rgb(91 140 255 / 0.28), transparent)' }} />
      {/* Browser frame around the "projector" screen. */}
      <div className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-ink-800 shadow-[0_30px_80px_-30px_rgb(4_6_26/0.6)]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-3 truncate rounded-md border border-white/10 bg-ink-950/60 px-2.5 py-0.5 font-mono text-[11px] text-ink-300">bidwicket.app/live/premier-league</span>
        </div>

        <div className="screen-perf relative" style={themeStyle({ preset: 'royal' })}>
          <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" />
          {/* Header */}
          <div className="relative flex items-center gap-2.5 border-b border-white/5 bg-ink-900/70 px-4 py-2.5">
            <LogoMark className="h-7 w-7" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-bold">Premier League 2026</p>
              <p className="truncate text-[10px] text-ink-400">{14 + sales.length - DEMO_SOLD.length} sold · 2 unsold · 31 to go</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-hot/15 px-2 py-0.5 text-[10px] font-bold text-rose-hot">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-hot" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-hot" />
              </span>
              LIVE
            </span>
            <span className="hidden items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-ink-200 sm:inline-flex">
              <Wifi className="h-3 w-3 text-lime-glow" /> <AnimatedNumber value={viewers} format={(n) => `${n} watching`} />
            </span>
          </div>

          <div className="relative space-y-3 p-3 sm:p-4">
            {/* Purse board */}
            <div className="grid grid-cols-4 gap-2">
              {teams.map((tm, i) => {
                const leading = top?.team === i && !sold
                return (
                  <div key={tm.short} className={cn('rounded-xl border bg-ink-850/80 px-2 py-1.5 transition-colors', leading ? 'border-gold' : 'border-white/5')}>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="inline-flex items-center gap-1 font-bold"><span className="h-1.5 w-1.5 rounded-full" style={{ background: tm.color }} />{tm.short}</span>
                      <span className="text-ink-400">{tm.squad}/{DEMO_SQUAD}</span>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] font-bold tabular">{moneyShort(tm.purse)}</p>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                      <motion.div className="h-full rounded-full" style={{ background: tm.color }} animate={{ width: `${(tm.purse / DEMO_PURSE) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <div className="min-w-0 space-y-3">
                {/* Player spotlight */}
                <div className="card relative overflow-hidden p-3.5">
                  <RoleAura role={p.role} />
                  {/* Fixed height: with mode="wait" the old player unmounts before the next mounts. */}
                  <div className="relative h-[92px]">
                    <AnimatePresence mode="wait">
                      <motion.div key={p.name} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }} className="absolute inset-0 flex items-center gap-3.5">
                        <div className="relative shrink-0">
                          <div className="absolute -inset-2 rounded-2xl opacity-50 blur-xl" style={{ background: rm.color }} />
                          <Avatar name={p.name} size={78} rounded="xl" color="#222c41" className="relative rounded-2xl border-2 border-white/10" />
                          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-ink-900 px-1.5 font-mono text-[9px] text-ink-200">#{p.serial}</span>
                        </div>
                        <div className="min-w-0">
                          <Badge color={rm.color}>{p.role}</Badge>
                          <h3 className="mt-1 truncate font-display text-2xl font-extrabold leading-none sm:text-[1.7rem]">{p.name}</h3>
                          <p className="mt-1 truncate text-[11px] text-ink-300">{p.facts}</p>
                          <p className="text-[11px] text-ink-400">Base price <b className="text-ink-100">{moneyShort(p.base)}</b></p>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>

                {/* Current bid */}
                <div className="card relative overflow-hidden p-3.5" style={lead ? { background: `linear-gradient(120deg, ${lead.color}26, transparent 70%)` } : undefined}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-ink-400">{top ? 'Current bid' : 'Opening at base'}</p>
                  <p className="font-display text-[2.6rem] font-black leading-tight tabular sm:text-5xl">
                    <AnimatedNumber value={bid} format={(n) => moneyShort(n)} />
                  </p>
                  <div className="relative h-7">
                    <AnimatePresence>
                      {lead && (
                        <motion.span key={lead.short + bid} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="absolute left-0 top-0 inline-flex max-w-full items-center gap-2 rounded-lg px-2 py-1 text-sm font-bold" style={{ background: `${lead.color}2e`, color: lead.color }}>
                          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-[8px] font-black text-white" style={{ background: lead.color }}>{lead.short}</span>
                          <span className="truncate">{lead.name}</span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  <AnimatePresence>
                    {sold && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 grid place-items-center bg-ink-950/70 backdrop-blur-[2px]">
                        <motion.div initial={{ scale: 2.4, rotate: -18, opacity: 0 }} animate={{ scale: 1, rotate: -8, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} className="rounded-xl border-4 border-gold px-5 py-1 font-display text-3xl font-black tracking-widest text-gold">
                          SOLD
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Bidding + recent sales (the right-hand column of the big screen) */}
              <div className="hidden min-w-0 flex-col gap-3 sm:flex">
                <div className="card p-3">
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.25em] text-ink-400">Bidding</p>
                  {/* Fixed height for 4 rows: a growing list used to resize the demo and shift the hero text. */}
                  <ul className="h-[108px] space-y-1 overflow-hidden">
                    {bids.map((b, i) => (
                      <motion.li key={`${p.name}-${b.amount}`} initial={i === 0 ? { opacity: 0, x: 12 } : false} animate={{ opacity: 1, x: 0 }} className={cn('flex h-6 items-center gap-1.5 rounded-lg px-2 text-[11px]', i === 0 ? 'bg-white/10 font-semibold' : 'text-ink-300')}>
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: DEMO_TEAMS[b.team].color }} />
                        <span className="min-w-0 flex-1 truncate">{DEMO_TEAMS[b.team].name}</span>
                        <span className="font-mono tabular">{moneyShort(b.amount)}</span>
                      </motion.li>
                    ))}
                    {bids.length === 0 && <li className="flex h-6 items-center px-2 text-[11px] text-ink-400">Waiting for the first paddle…</li>}
                  </ul>
                </div>
                <div className="card p-3">
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.25em] text-ink-400">Recent sales</p>
                  <ul className="space-y-1.5">
                    {sales.map((s) => (
                      <li key={s.name} className="flex items-center gap-2 text-[11px]">
                        <Avatar name={s.name} size={20} color="#34405a" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate leading-tight">{s.name}</span>
                          <span className="block truncate text-[9px] leading-tight" style={{ color: DEMO_TEAMS[s.team].color }}>{DEMO_TEAMS[s.team].name}</span>
                        </span>
                        <span className="font-mono font-bold text-gold">{moneyShort(s.price)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SoldTicker() {
  const items = [
    ['Arjun Mehta', 'Royal Strikers', '₹1.45L'],
    ['Kabir Khan', 'Desert Kings', '₹82K'],
    ['Ishaan Rao', 'Coastal Titans', '₹1.16L'],
    ['Dev Patel', 'Hill Warriors', '₹64K'],
    ['Rohan Iyer', 'Royal Strikers', '₹97K'],
    ['Sameer Shaikh', 'Desert Kings', '₹1.02L'],
    ['Vihaan Joshi', 'Coastal Titans', '₹58K'],
  ]
  return (
    // Same width as the sections around it (max-w-7xl + gutters), not edge to edge.
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-ink-950/50 py-3 [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
      <div className="flex w-max animate-marquee gap-10 pr-10">
        {[...items, ...items].map(([n, t, p], i) => (
          <span key={i} className="inline-flex items-center gap-2 text-sm text-ink-300">
            <Gavel className="h-3.5 w-3.5 text-gold" />
            <b className="font-semibold text-white">{n}</b> sold to {t} for <b className="text-gold">{p}</b>
          </span>
        ))}
      </div>
    </div>
    </div>
  )
}

export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div ref={ref} className={className} initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : undefined} transition={{ type: 'spring', stiffness: 110, damping: 20, delay }}>
      {children}
    </motion.div>
  )
}

/** Small live-link visual for the bento grid. */
export function LiveLinkVisual() {
  return (
    <div className="mt-5 space-y-2">
      {[
        { icon: Radio, label: 'Projector at the venue', c: '#22c55e' },
        { icon: Users, label: 'Team owners on phones', c: '#38bdf8' },
        { icon: Wifi, label: 'Players watching from home', c: '#ffb020' },
      ].map(({ icon: Icon, label, c }, i) => (
        <motion.div key={label} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 * i }} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-sm">
          <Icon className="h-4 w-4" style={{ color: c }} />
          <span className="text-ink-200">{label}</span>
          <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: c, boxShadow: `0 0 10px ${c}` }} />
        </motion.div>
      ))}
    </div>
  )
}

const DEMO_XI = [
  { role: 'Batsman', names: ['Rohan', 'Dev', 'Aarav', 'Neel'] },
  { role: 'All-rounder', names: ['Arjun', 'Vihaan', 'Kunal'] },
  { role: 'Bowler', names: ['Kabir', 'Yash', 'Om'] },
  { role: 'Wicket-keeper', names: ['Ishaan'] },
]
const DEMO_BALANCE = [
  { role: 'Wicket-keeper', label: 'Keeper', have: 1, need: 1 },
  { role: 'Batsman', label: 'Batters', have: 4, need: 4 },
  { role: 'All-rounder', label: 'All rounders', have: 3, need: 3 },
  { role: 'Bowler', label: 'Bowlers', have: 3, need: 4 },
]

/** Miniature of the team squad page: the XI on a cricket ground plus role balance. */
export function SquadFieldVisual() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div
        className="relative flex min-h-[260px] flex-col justify-around overflow-hidden rounded-[1.75rem] px-3 py-6"
        style={{ background: 'repeating-linear-gradient(180deg, #2f7a3a 0 32px, #2a7034 32px 64px)', boxShadow: 'inset 0 0 80px rgba(0,0,0,0.35)' }}
      >
        <div className="pointer-events-none absolute inset-2.5 rounded-[50%] border border-dashed" style={{ borderColor: 'rgba(255,255,255,0.2)' }} />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[42%] w-9 -translate-x-1/2 -translate-y-1/2 rounded" style={{ background: 'rgba(214,196,150,0.32)' }} />
        {DEMO_XI.map((row, r) => (
          <div key={row.role} className="relative flex justify-center gap-2.5">
            {row.names.map((n, i) => (
              <motion.span
                key={n}
                initial={{ opacity: 0, scale: 0.6 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.08 * (r * 4 + i), type: 'spring', stiffness: 260, damping: 18 }}
                className="flex flex-col items-center gap-1"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold" style={{ color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)', background: ROLE_META[row.role].color + '55', boxShadow: `0 0 0 2px ${ROLE_META[row.role].color}` }}>
                  {n[0]}
                </span>
                <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>{n}</span>
              </motion.span>
            ))}
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-[1.75rem] border border-white/5 bg-white/[0.03] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Squad balance</p>
        {DEMO_BALANCE.map((b, i) => {
          const c = ROLE_META[b.role].color
          return (
            <div key={b.role}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-200">{b.label}</span>
                <span className="tabular font-semibold" style={{ color: b.have < b.need ? 'var(--color-rose-hot)' : tintText(c) }}>{b.have}/{b.need}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                <motion.div className="h-full rounded-full" style={{ background: c }} initial={{ width: 0 }} whileInView={{ width: `${(b.have / b.need) * 100}%` }} viewport={{ once: true }} transition={{ delay: 0.1 * i, duration: 0.6 }} />
              </div>
            </div>
          )
        })}
        <p className="rounded-xl bg-rose-hot/10 px-3 py-2 text-xs font-medium text-rose-hot">Needs 1 more bowler · ₹40K left to spend</p>
      </div>
    </div>
  )
}
