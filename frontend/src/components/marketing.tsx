'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useInView } from 'motion/react'
import { useRef } from 'react'
import { Gavel, Radio, Users, Wifi } from 'lucide-react'
import { AnimatedNumber, Avatar } from './ui'
import { moneyShort } from '@/lib/format'

const DEMO_TEAMS = [
  { name: 'Royal Strikers', short: 'RS', color: '#3B82F6' },
  { name: 'Desert Kings', short: 'DK', color: '#F59E0B' },
  { name: 'Coastal Titans', short: 'CT', color: '#EF4444' },
  { name: 'Hill Warriors', short: 'HW', color: '#10B981' },
]
const DEMO_PLAYERS = [
  { name: 'Arjun Mehta', role: 'All-rounder', base: 20000, sold: 145000 },
  { name: 'Kabir Khan', role: 'Bowler', base: 10000, sold: 82000 },
  { name: 'Ishaan Rao', role: 'Wicket-keeper', base: 15000, sold: 116000 },
]

/** Self-playing mini auction for the hero — shows the product instead of describing it. */
export function HeroAuctionDemo() {
  const [pi, setPi] = useState(0)
  const [bid, setBid] = useState(DEMO_PLAYERS[0].base)
  const [leader, setLeader] = useState<number | null>(null)
  const [sold, setSold] = useState(false)
  const [viewers, setViewers] = useState(214)

  useEffect(() => {
    const p = DEMO_PLAYERS[pi]
    if (sold) {
      const t = setTimeout(() => {
        const n = (pi + 1) % DEMO_PLAYERS.length
        setPi(n)
        setBid(DEMO_PLAYERS[n].base)
        setLeader(null)
        setSold(false)
      }, 2400)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      if (bid >= p.sold) {
        setSold(true)
        return
      }
      setBid((b) => Math.min(p.sold, b + (b < 50000 ? 5000 : 10000) + (Math.random() > 0.6 ? 5000 : 0)))
      setLeader((l) => {
        let n = Math.floor(Math.random() * DEMO_TEAMS.length)
        if (n === l) n = (n + 1) % DEMO_TEAMS.length
        return n
      })
      setViewers((v) => v + Math.floor(Math.random() * 4))
    }, 650 + Math.random() * 500)
    return () => clearTimeout(t)
  }, [bid, sold, pi])

  const p = DEMO_PLAYERS[pi]
  const lead = leader !== null ? DEMO_TEAMS[leader] : null

  return (
    <div className="relative">
      <div className="absolute -inset-10 -z-10 rounded-[3rem] bg-lime-glow/10 blur-3xl" />
      <div className="card grain relative overflow-hidden p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-2 rounded-full bg-rose-hot/15 px-2.5 py-1 font-semibold text-rose-hot">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-hot" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-hot" />
            </span>
            LIVE
          </span>
          <span className="inline-flex items-center gap-1.5 text-ink-300">
            <Wifi className="h-3.5 w-3.5" /> <AnimatedNumber value={viewers} format={(n) => `${n} watching`} />
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={p.name} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ type: 'spring', stiffness: 200, damping: 24 }} className="flex items-center gap-4">
            <Avatar name={p.name} size={76} color="#34405a" rounded="xl" />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-300">{p.role}</p>
              <h3 className="font-display text-2xl font-bold sm:text-3xl">{p.name}</h3>
              <p className="text-xs text-ink-400">Base {moneyShort(p.base)}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="relative mt-6 overflow-hidden rounded-2xl border border-white/10 bg-ink-950/60 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Current bid</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <span className="font-display text-5xl font-extrabold text-white sm:text-6xl">
              <AnimatedNumber value={bid} format={(n) => moneyShort(n)} />
            </span>
            <AnimatePresence mode="popLayout">
              {lead && (
                <motion.span key={lead.short + bid} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} className="mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold" style={{ background: `${lead.color}22`, color: lead.color }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: lead.color }} />
                  {lead.name}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {sold && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 grid place-items-center bg-ink-950/70 backdrop-blur-[2px]">
                <motion.div initial={{ scale: 2.4, rotate: -18, opacity: 0 }} animate={{ scale: 1, rotate: -8, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} className="rounded-xl border-4 border-gold px-6 py-1.5 font-display text-4xl font-black tracking-widest text-gold">
                  SOLD
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {DEMO_TEAMS.map((t, i) => (
            <motion.div key={t.short} animate={{ scale: leader === i ? 1.04 : 1, borderColor: leader === i ? t.color : 'rgba(255,255,255,0.08)' }} className="rounded-xl border bg-white/[0.02] p-2 text-center">
              <div className="mx-auto mb-1 grid h-7 w-7 place-items-center rounded-lg text-[10px] font-black text-white" style={{ background: t.color }}>
                {t.short}
              </div>
              <p className="truncate text-[10px] text-ink-300">{t.name}</p>
            </motion.div>
          ))}
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
    <div className="relative overflow-hidden border-y border-white/5 bg-ink-950/50 py-3 [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
      <div className="flex w-max animate-marquee gap-10">
        {[...items, ...items].map(([n, t, p], i) => (
          <span key={i} className="inline-flex items-center gap-2 text-sm text-ink-300">
            <Gavel className="h-3.5 w-3.5 text-gold" />
            <b className="font-semibold text-white">{n}</b> sold to {t} for <b className="text-gold">{p}</b>
          </span>
        ))}
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
        { icon: Radio, label: 'Projector at the venue', c: '#c8ff2e' },
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
