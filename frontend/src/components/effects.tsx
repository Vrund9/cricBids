'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { roleMeta } from '@/lib/format'
import { sfx } from '@/lib/sound'
import { useCountdown } from '@/lib/live'
import type { PublicPlayer, Snapshot } from '@/lib/types'

type RoleKind = 'bat' | 'bowl' | 'keep' | 'all'

export function roleKind(role: string): RoleKind {
  const r = role.toLowerCase()
  if (r.includes('keep')) return 'keep'
  if (r.includes('all')) return 'all'
  if (r.includes('bowl')) return 'bowl'
  return 'bat'
}

const LABEL: Record<RoleKind, string> = { bat: 'Batter', bowl: 'Bowler', keep: 'Wicket-keeper', all: 'All-rounder' }

// ───────────────────────── Cricket SVG pieces ─────────────────────────

function Bat({ color }: { color: string }) {
  return (
    <g>
      <rect x="-5" y="-150" width="10" height="56" rx="5" fill="#2a2f3a" stroke={color} strokeWidth="2" />
      <path d="M-20 -96 h40 l4 150 q0 14 -24 14 h-0 q-24 0 -24 -14 z" fill="#f2d39b" stroke={color} strokeWidth="3" />
      <path d="M0 -90 v140" stroke="#d8b06a" strokeWidth="4" />
    </g>
  )
}

function Ball({ r = 22 }: { r?: number }) {
  return (
    <g>
      <circle r={r} fill="#d7263d" />
      <path d={`M${-r * 0.55} ${-r * 0.8} q${r * 0.5} ${r * 0.8} 0 ${r * 1.6}`} stroke="#fff" strokeWidth="2" fill="none" strokeDasharray="3 3" />
      <path d={`M${r * 0.55} ${-r * 0.8} q${-r * 0.5} ${r * 0.8} 0 ${r * 1.6}`} stroke="#fff" strokeWidth="2" fill="none" strokeDasharray="3 3" />
    </g>
  )
}

function Stump({ x }: { x: number }) {
  return <rect x={x - 5} y={-110} width="10" height="150" rx="4" fill="#f2d39b" />
}

function Glove({ flip, color }: { flip?: boolean; color: string }) {
  return (
    <g transform={flip ? 'scale(-1,1)' : undefined}>
      <rect x="-38" y="-30" width="76" height="70" rx="22" fill="#f5f5f0" stroke={color} strokeWidth="4" />
      {[-28, -10, 8, 26].map((x) => (
        <rect key={x} x={x - 7} y="-74" width="16" height="52" rx="8" fill="#f5f5f0" stroke={color} strokeWidth="3" />
      ))}
      <rect x="30" y="-8" width="34" height="18" rx="9" fill="#f5f5f0" stroke={color} strokeWidth="3" transform="rotate(-25 30 0)" />
      <rect x="-38" y="28" width="76" height="16" rx="6" fill={color} />
    </g>
  )
}

/** Scene per role, drawn in a 600×400 viewBox. */
function Scene({ kind, color }: { kind: RoleKind; color: string }) {
  if (kind === 'bat') {
    return (
      <>
        {[...Array(9)].map((_, i) => (
          <motion.line key={i} x1={-50} x2={650} y1={60 + i * 34} y2={20 + i * 34} stroke={color} strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0, opacity: 0.8 }} animate={{ pathLength: 1, opacity: 0 }} transition={{ duration: 0.7, delay: 0.25 + i * 0.03 }} />
        ))}
        <motion.g initial={{ rotate: -95, x: 230, y: 280 }} animate={{ rotate: [-95, 40, 25] }} transition={{ duration: 0.55, times: [0, 0.6, 1], ease: 'easeOut' }}>
          <Bat color={color} />
        </motion.g>
        <motion.g initial={{ x: 330, y: 240, scale: 1 }} animate={{ x: [330, 360, 720], y: [240, 230, -60], scale: [1, 1, 0.4] }} transition={{ duration: 1, times: [0, 0.35, 1], ease: 'easeIn' }}>
          <Ball />
        </motion.g>
        <motion.text x="430" y="120" fontSize="96" fontWeight="900" fill={color} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: [0, 1, 0], scale: [0.4, 1.2, 1.4] }} transition={{ duration: 1, delay: 0.45 }}>6</motion.text>
      </>
    )
  }
  if (kind === 'bowl') {
    return (
      <>
        <g transform="translate(400 270)">
          <motion.g initial={{ rotate: 0, x: 0, y: 0 }} animate={{ rotate: -40, x: -30, y: -40, opacity: [1, 1, 0.6] }} transition={{ delay: 0.62, duration: 0.6 }}><Stump x={-26} /></motion.g>
          <motion.g initial={{ rotate: 0 }} animate={{ rotate: 25, y: -30 }} transition={{ delay: 0.62, duration: 0.6 }}><Stump x={0} /></motion.g>
          <motion.g initial={{ rotate: 0 }} animate={{ rotate: 50, x: 35, y: -20 }} transition={{ delay: 0.62, duration: 0.6 }}><Stump x={26} /></motion.g>
          {[-13, 13].map((x, i) => (
            <motion.rect key={x} x={x - 13} y={-118} width="26" height="7" rx="3" fill="#f2d39b" initial={{ x: 0, y: 0, rotate: 0 }} animate={{ x: i ? 120 : -110, y: -160, rotate: i ? 260 : -300 }} transition={{ delay: 0.62, duration: 0.8, ease: 'easeOut' }} />
          ))}
        </g>
        <motion.g initial={{ x: -40, y: 120 }} animate={{ x: [-40, 260, 400], y: [120, 330, 210] }} transition={{ duration: 0.65, times: [0, 0.65, 1], ease: 'easeIn' }}>
          <motion.g animate={{ rotate: 720 }} transition={{ duration: 0.65, ease: 'linear' }}><Ball /></motion.g>
        </motion.g>
        {[0, 1, 2].map((i) => (
          <motion.circle key={i} cx="400" cy="200" r="20" fill="none" stroke={color} strokeWidth="4" initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 4 + i, opacity: [0, 0.9, 0] }} transition={{ delay: 0.62 + i * 0.08, duration: 0.7 }} />
        ))}
      </>
    )
  }
  if (kind === 'keep') {
    return (
      <>
        <motion.g initial={{ x: 120, y: 220, rotate: -30 }} animate={{ x: 262, rotate: -8 }} transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.25 }}>
          <Glove color={color} />
        </motion.g>
        <motion.g initial={{ x: 480, y: 220, rotate: 30 }} animate={{ x: 338, rotate: 8 }} transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.25 }}>
          <Glove flip color={color} />
        </motion.g>
        <motion.g initial={{ x: 680, y: 40, scale: 0.6 }} animate={{ x: 300, y: 205, scale: 1 }} transition={{ duration: 0.38, ease: 'easeIn' }}>
          <Ball r={18} />
        </motion.g>
        {[0, 1, 2].map((i) => (
          <motion.circle key={i} cx="300" cy="205" r="30" fill="none" stroke={color} strokeWidth="3" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 3.5 + i, opacity: [0, 0.8, 0] }} transition={{ delay: 0.45 + i * 0.1, duration: 0.8 }} />
        ))}
        <motion.text x="300" y="70" textAnchor="middle" fontSize="54" fontWeight="900" fill={color} initial={{ opacity: 0, y: 90 }} animate={{ opacity: [0, 1, 0], y: 70 }} transition={{ delay: 0.5, duration: 1.1 }}>HOWZAT!</motion.text>
      </>
    )
  }
  // all-rounder: bat and ball orbit with a lightning split
  return (
    <>
      <motion.path d="M300 0 L270 150 L320 160 L280 400" stroke={color} strokeWidth="8" fill="none" strokeLinejoin="round" initial={{ pathLength: 0, opacity: 1 }} animate={{ pathLength: 1, opacity: [1, 1, 0] }} transition={{ duration: 0.6, delay: 0.1 }} />
      <motion.g initial={{ rotate: 0 }} animate={{ rotate: 360 }} transition={{ duration: 1.3, ease: 'easeInOut' }}>
        <g transform="translate(180 200) rotate(-30) scale(0.75)"><Bat color={color} /></g>
        <g transform="translate(430 200)"><Ball r={24} /></g>
      </motion.g>
      <motion.circle cx="300" cy="200" r="60" fill="none" stroke={color} strokeWidth="3" strokeDasharray="8 10" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 2.4, opacity: [0, 0.8, 0], rotate: 180 }} transition={{ duration: 1.2 }} />
    </>
  )
}

/**
 * Entrance moment when a new player comes up. Distinct for each role:
 * batter → a six, bowler → stumps flying, keeper → a catch, all-rounder → bat & ball orbit.
 */
export function RoleIntro({ snap, sound, compact }: { snap: Snapshot | null; sound?: boolean; compact?: boolean }) {
  const [show, setShow] = useState<PublicPlayer | null>(null)
  const last = useRef<number | null>(null)
  useEffect(() => {
    const e = snap?.lastEvent
    const p = snap?.current?.player
    if (!e) return
    if (last.current === null) {
      last.current = e.at
      return
    }
    if (e.at === last.current) return
    last.current = e.at
    if ((e.type === 'NEXT' || e.type === 'STARTED' || e.type === 'REAUCTION') && p && p.id === e.playerId) {
      setShow(p)
      if (sound) sfx.intro(p.role)
      const id = setTimeout(() => setShow(null), compact ? 1400 : 2000)
      return () => clearTimeout(id)
    }
  }, [snap?.lastEvent, snap?.current?.player, sound, compact])

  const kind = show ? roleKind(show.role) : 'bat'
  const color = show ? roleMeta(show.role).color : '#fff'
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="pointer-events-none fixed inset-0 z-40 grid place-items-center overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.35 } }}>
          <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" />
          <motion.div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 45%, ${color}33, transparent 60%)` }} initial={{ scale: 0.6 }} animate={{ scale: 1.2 }} transition={{ duration: 1.6 }} />
          <div className="relative flex w-full max-w-3xl flex-col items-center px-6">
            <svg viewBox="0 0 600 400" className={compact ? 'w-[min(80vw,420px)]' : 'w-[min(90vw,640px)]'} aria-hidden>
              <Scene kind={kind} color={color} />
            </svg>
            <motion.p initial={{ y: 30, opacity: 0, letterSpacing: '0.6em' }} animate={{ y: 0, opacity: 1, letterSpacing: '0.25em' }} transition={{ delay: 0.35, type: 'spring', stiffness: 160, damping: 18 }} className="font-display text-xl font-black uppercase sm:text-3xl" style={{ color }}>
              {LABEL[kind]}
            </motion.p>
            <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="mt-2 text-center font-display text-4xl font-extrabold text-white sm:text-6xl">
              {show.name}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Subtle, persistent role-themed backdrop for the player card. */
export function RoleAura({ role }: { role: string }) {
  const kind = roleKind(role)
  const color = roleMeta(role).color
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
      <div className="absolute inset-0" style={{ background: `radial-gradient(520px 260px at 85% 20%, ${color}1f, transparent 70%)` }} />
      <svg className="absolute -right-10 -top-10 h-[130%] w-1/2 opacity-[0.09]" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
        {kind === 'bat' && [...Array(10)].map((_, i) => <line key={i} x1={-40 + i * 26} y1="220" x2={60 + i * 26} y2="-20" stroke={color} strokeWidth="8" />)}
        {kind === 'bowl' && [...Array(6)].map((_, i) => <circle key={i} cx="140" cy="60" r={20 + i * 22} fill="none" stroke={color} strokeWidth="3" strokeDasharray="6 8" />)}
        {kind === 'keep' && [...Array(8)].flatMap((_, r) => [...Array(8)].map((__, c) => <circle key={`${r}-${c}`} cx={12 + c * 25} cy={12 + r * 25} r="5" fill={color} />))}
        {kind === 'all' && (
          <>
            {[...Array(6)].map((_, i) => <line key={i} x1={-40 + i * 34} y1="220" x2={60 + i * 34} y2="-20" stroke={color} strokeWidth="6" />)}
            {[...Array(4)].map((_, i) => <circle key={`c${i}`} cx="150" cy="50" r={25 + i * 25} fill="none" stroke={color} strokeWidth="3" />)}
          </>
        )}
      </svg>
    </div>
  )
}

/**
 * All auction audio for a screen: bids, hammer, unsold, role intros are handled by RoleIntro,
 * plus "going once / twice" ticks in the last 3 seconds of the bid timer.
 */
export function useAuctionAudio(enabled: boolean, snap: Snapshot | null, skew: number) {
  const last = useRef<number | null>(null)
  useEffect(() => {
    const e = snap?.lastEvent
    if (!e) return
    if (last.current === null || !enabled) {
      last.current = e.at
      return
    }
    if (e.at === last.current) return
    last.current = e.at
    if (e.type === 'BID') sfx.bid()
    else if (e.type === 'SOLD') {
      const others = snap!.sold.filter((p) => p.id !== e.playerId).map((p) => p.soldPrice ?? 0)
      sfx.sold((e.amount ?? 0) > 0 && (e.amount ?? 0) >= Math.max(0, ...others) && others.length > 0)
    } else if (e.type === 'UNSOLD') sfx.unsold()
    else if (e.type === 'PAUSED') sfx.pause()
  }, [snap?.lastEvent, snap, enabled])

  const live = snap?.current?.player.status === 'LIVE' && snap?.current?.currentBid !== null
  const left = useCountdown(live ? snap?.current?.timerEndsAt : null, skew)
  const ticked = useRef<number | null>(null)
  useEffect(() => {
    if (!enabled || left === null) {
      ticked.current = null
      return
    }
    const s = Math.ceil(left)
    if (left > 0 && s <= 3 && ticked.current !== s) {
      ticked.current = s
      sfx.tick(s === 1)
    }
  }, [left, enabled])
}
