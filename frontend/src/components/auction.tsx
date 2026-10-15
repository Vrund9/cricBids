'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Gavel, Smartphone, Wifi, WifiOff } from 'lucide-react'
import { AnimatedNumber, Avatar, Badge } from './ui'
import { money, moneyShort, roleMeta } from '@/lib/format'
import { useCountdown, type ConnState } from '@/lib/live'
import type { AuctionEvent, PublicPlayer, Snapshot, SnapshotTeam } from '@/lib/types'
import { cn } from '@/lib/cn'

export function ConnIndicator({ conn, viewers }: { conn: ConnState; viewers?: number }) {
  const live = conn === 'live'
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold', live ? 'border-white/10 text-ink-200' : 'border-gold/40 bg-gold/10 text-gold')} role="status" aria-live="polite">
      {live ? <Wifi className="h-3.5 w-3.5 text-lime-glow" /> : <WifiOff className="h-3.5 w-3.5" />}
      {live ? (viewers ? `${viewers} watching` : 'Live') : conn === 'offline' ? 'Offline — waiting for network' : conn === 'error' ? 'Link unavailable' : 'Reconnecting…'}
    </span>
  )
}

export function LiveDot({ label = 'LIVE', color = '#ff4d6d' }: { label?: string; color?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold tracking-widest" style={{ background: `${color}22`, color }}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full" style={{ background: color }} />
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
      </span>
      {label}
    </span>
  )
}

/** Hero card for the player currently under the hammer. */
export function PlayerSpotlight({ player, basePrice, currency, size = 'lg' }: { player: PublicPlayer; basePrice: number; currency: string; size?: 'md' | 'lg' | 'xl' }) {
  const rm = roleMeta(player.role)
  const px = size === 'xl' ? 280 : size === 'lg' ? 180 : 112
  const facts = [player.battingStyle, player.bowlingStyle && player.bowlingStyle !== 'Does not bowl' ? player.bowlingStyle : null, player.age ? `${player.age} yrs` : null, player.city].filter(Boolean) as string[]
  return (
    <motion.div key={player.id} initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 20 }} className={cn('relative flex gap-6', size === 'xl' ? 'flex-col items-center text-center lg:flex-row lg:items-end lg:text-left' : 'flex-col items-center text-center sm:flex-row sm:items-end sm:text-left')}>
      <div className="relative shrink-0">
        <div className="absolute -inset-3 rounded-[2rem] opacity-60 blur-2xl" style={{ background: rm.color }} />
        <Avatar src={player.photoUrl} name={player.name} size={px} rounded="xl" className="relative rounded-[1.75rem] border-2 border-white/10 shadow-2xl" color="#222c41" />
        <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-ink-900 px-3 py-1 font-mono text-xs text-ink-200">#{player.serial}</span>
      </div>
      <div className="min-w-0 pb-2">
        <div className={cn('flex flex-wrap items-center gap-2', size === 'xl' ? 'justify-center lg:justify-start' : 'justify-center sm:justify-start')}>
          <Badge color={rm.color}>{player.role}</Badge>
          {player.category && <Badge color="#ffb020">Cat {player.category}</Badge>}
        </div>
        <h2 className={cn('mt-3 font-display font-extrabold leading-[0.95]', size === 'xl' ? 'text-5xl sm:text-7xl xl:text-8xl' : size === 'lg' ? 'text-4xl sm:text-5xl' : 'text-3xl')}>{player.name}</h2>
        {facts.length > 0 && <p className={cn('mt-3 text-ink-300', size === 'xl' ? 'text-lg' : 'text-sm')}>{facts.join(' · ')}</p>}
        <p className={cn('mt-2 text-ink-400', size === 'xl' ? 'text-base' : 'text-sm')}>Base price <b className="text-ink-100">{money(basePrice, currency)}</b></p>
      </div>
    </motion.div>
  )
}

export function BidTimer({ endsAt, skew, total }: { endsAt: string | null; skew: number; total: number }) {
  const left = useCountdown(endsAt, skew)
  if (left === null || !total) return null
  const pct = Math.max(0, Math.min(1, left / total))
  const label = left <= 0 ? 'Going… going…' : left <= total * 0.25 ? 'Going twice' : left <= total * 0.5 ? 'Going once' : `${Math.ceil(left)}s`
  const color = left <= total * 0.25 ? '#ff4d6d' : left <= total * 0.5 ? '#ffb020' : '#c8ff2e'
  return (
    <div className="flex items-center gap-3" role="timer" aria-label={label}>
      <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
        <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3.5" />
        <circle cx="18" cy="18" r="15" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="94.2" strokeDashoffset={94.2 * (1 - pct)} style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s' }} />
      </svg>
      <span className="text-sm font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
    </div>
  )
}

/** The big number. */
export function BidDisplay({ snap, skew, size = 'lg' }: { snap: Snapshot; skew: number; size?: 'md' | 'lg' | 'xl' }) {
  const c = snap.current!
  const cur = snap.tournament.currency
  const leader = snap.teams.find((t) => t.id === c.leadingTeamId)
  const amount = c.currentBid ?? c.basePrice
  const status = c.player.status
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-ink-950/60 p-6">
      {leader && <motion.div key={leader.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(600px 200px at 0% 100%, ${leader.color}33, transparent 70%)` }} />}
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-400">{c.currentBid === null ? (status === 'LIVE' ? 'Opening at' : status === 'UNSOLD' ? 'No bids' : 'Base') : status === 'SOLD' ? 'Sold for' : 'Current bid'}</p>
        {status === 'LIVE' && c.currentBid !== null && <BidTimer endsAt={c.timerEndsAt} skew={skew} total={snap.tournament.bidTimerSec} />}
      </div>
      <motion.p key={amount} initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }} className={cn('relative mt-1 origin-left font-display font-black tabular leading-none', status === 'SOLD' ? 'text-gold' : 'text-white', size === 'xl' ? 'text-7xl sm:text-8xl xl:text-[9rem]' : size === 'lg' ? 'text-6xl sm:text-7xl' : 'text-5xl')}>
        <AnimatedNumber value={amount} format={(n) => money(n, cur)} />
      </motion.p>
      <div className="relative mt-4 min-h-10">
        <AnimatePresence mode="popLayout">
          {leader ? (
            <motion.div key={leader.id + String(c.currentBid)} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -16, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className="inline-flex items-center gap-3 rounded-2xl py-1.5 pl-1.5 pr-4" style={{ background: `${leader.color}22` }}>
              <Avatar src={leader.logoUrl} name={leader.shortName} size={size === 'xl' ? 44 : 34} rounded="xl" color={leader.color} />
              <span className={cn('font-bold', size === 'xl' ? 'text-2xl' : 'text-lg')} style={{ color: leader.color }}>{leader.name}</span>
              {c.bids[0]?.source === 'REMOTE' && <Smartphone className="h-4 w-4 text-ink-300" aria-label="Bid from phone" />}
            </motion.div>
          ) : (
            <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-ink-400">
              {status === 'LIVE' ? 'Waiting for the first bid…' : status === 'UNSOLD' ? 'Went unsold' : ''}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export function BidHistory({ snap, limit = 8 }: { snap: Snapshot; limit?: number }) {
  const teams = useMemo(() => new Map(snap.teams.map((t) => [t.id, t])), [snap.teams])
  const bids = snap.current?.bids.slice(0, limit) ?? []
  if (!bids.length) return <p className="py-4 text-center text-sm text-ink-400">No bids yet</p>
  return (
    <ul className="space-y-1.5">
      <AnimatePresence initial={false}>
        {bids.map((b, i) => {
          const t = teams.get(b.teamId)
          return (
            <motion.li key={b.id} layout initial={{ opacity: 0, x: -16, height: 0 }} animate={{ opacity: i === 0 ? 1 : 0.65 - i * 0.05, x: 0, height: 'auto' }} exit={{ opacity: 0 }} className="flex items-center gap-3 rounded-xl px-3 py-2" style={i === 0 ? { background: `${t?.color}1f` } : undefined}>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: t?.color }} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{t?.name ?? 'Team'}</span>
              {b.source === 'REMOTE' && <Smartphone className="h-3.5 w-3.5 text-ink-400" />}
              <span className="font-mono text-sm tabular">{money(b.amount, snap.tournament.currency)}</span>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}

export function TeamPurses({ snap, compact, highlightId }: { snap: Snapshot; compact?: boolean; highlightId?: string | null }) {
  const cur = snap.tournament.currency
  return (
    <ul className={cn('grid gap-2', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
      {snap.teams.map((t) => {
        const pct = snap.tournament.teamPurse ? (t.purse / snap.tournament.teamPurse) * 100 : 0
        const leading = highlightId === t.id
        return (
          <motion.li key={t.id} layout animate={{ borderColor: leading ? t.color : 'rgba(255,255,255,0.06)' }} className="rounded-2xl border bg-white/[0.02] p-3">
            <div className="flex items-center gap-3">
              <Avatar src={t.logoUrl} name={t.shortName} size={34} rounded="xl" color={t.color} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{t.name}</p>
                <p className="text-[11px] text-ink-400">{t.squadSize}/{snap.tournament.maxSquad} players · max bid {moneyShort(t.maxBid, cur)}</p>
              </div>
              <p className="font-mono text-sm font-semibold tabular"><AnimatedNumber value={t.purse} format={(n) => moneyShort(n, cur)} /></p>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
              <motion.div className="h-full rounded-full" style={{ background: t.color }} initial={false} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 80, damping: 20 }} />
            </div>
          </motion.li>
        )
      })}
    </ul>
  )
}

export function RecentSales({ snap, limit = 6 }: { snap: Snapshot; limit?: number }) {
  const teams = useMemo(() => new Map(snap.teams.map((t) => [t.id, t])), [snap.teams])
  const sales = snap.sold.slice(0, limit)
  if (!sales.length) return <p className="py-4 text-center text-sm text-ink-400">No sales yet</p>
  return (
    <ul className="space-y-2">
      <AnimatePresence initial={false}>
        {sales.map((p) => {
          const t = teams.get(p.soldTeamId!)
          return (
            <motion.li key={p.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
              <Avatar src={p.photoUrl} name={p.name} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="truncate text-[11px]" style={{ color: t?.color }}>{t?.name}</p>
              </div>
              <span className="font-mono text-sm font-semibold text-gold">{moneyShort(p.soldPrice, snap.tournament.currency)}</span>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}

// ───────────────────────── SOLD / UNSOLD overlay ─────────────────────────

function Confetti({ color }: { color: string }) {
  const bits = useMemo(
    () => Array.from({ length: 36 }, (_, i) => ({ i, x: (Math.random() - 0.5) * 900, y: -Math.random() * 500 - 100, r: Math.random() * 720 - 360, c: i % 3 === 0 ? '#ffb020' : i % 3 === 1 ? color : '#ffffff', s: 6 + Math.random() * 8 })),
    [color],
  )
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2">
      {bits.map((b) => (
        <motion.span key={b.i} className="absolute block rounded-sm" style={{ width: b.s, height: b.s * 0.5, background: b.c }} initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }} animate={{ x: b.x, y: [0, b.y, b.y + 700], opacity: [1, 1, 0], rotate: b.r }} transition={{ duration: 2.4, ease: 'easeOut' }} />
      ))}
    </div>
  )
}

/** Full-screen moment when the hammer falls. Triggered by a new SOLD / UNSOLD event. */
export function HammerOverlay({ snap, duration = 3200 }: { snap: Snapshot | null; duration?: number }) {
  const [show, setShow] = useState<AuctionEvent | null>(null)
  const lastAt = useRef<number | null>(null)
  useEffect(() => {
    const e = snap?.lastEvent
    if (!e) return
    if (lastAt.current === null) {
      lastAt.current = e.at // don't replay the event that was already current when the page opened
      return
    }
    if (e.at === lastAt.current) return
    lastAt.current = e.at
    if (e.type === 'SOLD' || e.type === 'UNSOLD') {
      setShow(e)
      const id = setTimeout(() => setShow(null), duration)
      return () => clearTimeout(id)
    }
    setShow(null)
  }, [snap?.lastEvent, duration])

  const others = show && snap ? snap.sold.filter((p) => p.id !== show.playerId).map((p) => p.soldPrice ?? 0) : []
  const record = !!show && show.type === 'SOLD' && others.length > 0 && (show.amount ?? 0) >= Math.max(...others)
  const player = show && snap ? (snap.current && snap.current.player.id === show.playerId ? snap.current.player : snap.sold.find((p) => p.id === show.playerId)) : null
  const team = show?.teamId ? snap?.teams.find((t) => t.id === show.teamId) : null
  const sold = show?.type === 'SOLD'
  const color = team?.color ?? '#ffb020'

  return (
    <AnimatePresence>
      {show && player && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-ink-950/85 p-6 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShow(null)}>
          {sold && <Confetti color={color} />}
          {record && <Confetti color="#ffffff" />}
          <motion.div initial={{ scale: 0.7, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }} className="relative flex flex-col items-center text-center">
            <div className="relative">
              <div className="absolute -inset-6 rounded-[2.5rem] opacity-60 blur-3xl" style={{ background: sold ? color : '#ff4d6d' }} />
              <Avatar src={player.photoUrl} name={player.name} size={220} rounded="xl" className="relative rounded-[2rem] border-4 border-white/15" color="#222c41" />
              <motion.div initial={{ scale: 3, rotate: -25, opacity: 0 }} animate={{ scale: 1, rotate: -10, opacity: 1 }} transition={{ delay: 0.25, type: 'spring', stiffness: 300, damping: 12 }} className={cn('absolute -right-10 -top-6 rounded-2xl border-[5px] bg-ink-950/80 px-5 py-1 font-display text-5xl font-black tracking-widest sm:text-6xl', sold ? 'border-gold text-gold' : 'border-rose-hot text-rose-hot')}>
                {sold ? 'SOLD' : 'UNSOLD'}
              </motion.div>
              {sold && (
                <motion.div initial={{ rotate: -60, x: -40, opacity: 0 }} animate={{ rotate: [-60, 15, 0], x: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.5 }} className="absolute -bottom-6 -left-8 grid h-16 w-16 place-items-center rounded-2xl bg-gold-bright text-on-accent shadow-2xl">
                  <Gavel className="h-8 w-8" />
                </motion.div>
              )}
            </div>
            {record && (
              <motion.p initial={{ scale: 0, rotate: -6 }} animate={{ scale: [0, 1.25, 1], rotate: -3 }} transition={{ delay: 0.55, duration: 0.5 }} className="mt-10 rounded-full bg-gold-bright px-5 py-1.5 font-display text-lg font-black uppercase tracking-[0.25em] text-on-accent shadow-[0_0_40px_rgba(255,176,32,0.6)]">
                Record buy
              </motion.p>
            )}
            <h2 className={cn('font-display text-5xl font-extrabold sm:text-6xl', record ? 'mt-4' : 'mt-10')}>{player.name}</h2>
            {sold && team ? (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="mt-5 flex flex-col items-center gap-3">
                <div className="inline-flex items-center gap-3 rounded-2xl py-2 pl-2 pr-5" style={{ background: `${color}2a` }}>
                  <Avatar src={team.logoUrl} name={team.shortName} size={44} rounded="xl" color={color} />
                  <span className="text-2xl font-bold" style={{ color }}>{team.name}</span>
                </div>
                <p className="font-display text-6xl font-black text-gold tabular">{money(show.amount, snap!.tournament.currency)}</p>
              </motion.div>
            ) : (
              <p className="mt-4 text-xl text-ink-300">No team picked this player — they may return in the re-auction round.</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function teamById(teams: SnapshotTeam[], id?: string | null) {
  return id ? teams.find((t) => t.id === id) : undefined
}
