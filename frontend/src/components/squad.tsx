'use client'

import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { AlertTriangle, CheckCircle2, Shuffle } from 'lucide-react'
import { Avatar, Button } from './ui'
import { moneyShort, roleMeta } from '@/lib/format'
import type { Player } from '@/lib/types'
import { cn } from '@/lib/cn'

export const ROLES = ['Wicket-keeper', 'Batsman', 'All-rounder', 'Bowler'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABEL: Record<Role, string> = { 'Wicket-keeper': 'Wicket keeper', Batsman: 'Batter', 'All-rounder': 'All rounder', Bowler: 'Bowler' }

/** The backend normalises roles to these four; anything else is treated as an all-rounder. */
export function normRole(role: string): Role {
  return (ROLES as readonly string[]).includes(role) ? (role as Role) : 'All-rounder'
}

/** Share of each role in a classic XI (1 keeper, 4 batters, 2 all-rounders, 4 bowlers). */
const XI_SHARE: Record<Role, number> = { 'Wicket-keeper': 1, Batsman: 4, 'All-rounder': 2, Bowler: 4 }

/** A balanced squad of `size` players, scaled from the classic XI so box-cricket squads work too. */
export function roleTargets(size: number): Record<Role, number> {
  const t = Object.fromEntries(ROLES.map((r) => [r, r === 'Wicket-keeper' ? Math.max(1, Math.round(size / 11)) : Math.round((size * XI_SHARE[r]) / 11)])) as Record<Role, number>
  let diff = size - ROLES.reduce((a, r) => a + t[r], 0)
  const grow: Role[] = ['Bowler', 'Batsman', 'All-rounder']
  for (let i = 0; diff > 0; i++, diff--) t[grow[i % 3]]++
  for (let i = 0; diff < 0; i++) {
    const r = grow[i % 3]
    if (t[r] > 0) {
      t[r]--
      diff++
    }
  }
  return t
}

export interface RoleNeed {
  role: Role
  have: number
  target: number
  gap: number
}

/** How far the squad is from a balanced one, biggest gaps first. A missing keeper is always top. */
export function squadNeeds(squad: Player[], maxSquad: number): RoleNeed[] {
  const targets = roleTargets(maxSquad)
  return ROLES.map((role) => {
    const have = squad.filter((p) => normRole(p.role) === role).length
    return { role, have, target: targets[role], gap: Math.max(0, targets[role] - have) }
  }).sort((a, b) => (a.role === 'Wicket-keeper' && a.gap ? -1 : b.role === 'Wicket-keeper' && b.gap ? 1 : b.gap - a.gap))
}

/** Bar per role: how many the team has against the suggested balance. */
export function RoleBalance({ needs }: { needs: RoleNeed[] }) {
  return (
    <ul className="space-y-3">
      {ROLES.map((role) => {
        const n = needs.find((x) => x.role === role)!
        const rm = roleMeta(role)
        const pct = n.target ? Math.min(100, (n.have / n.target) * 100) : n.have ? 100 : 0
        return (
          <li key={role}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2 font-medium">
                <span className="h-2 w-2 rounded-full" style={{ background: rm.color }} /> {ROLE_LABEL[role]}
              </span>
              <span className="tabular text-ink-300">
                <b className="text-ink-100">{n.have}</b> / {n.target}
                {n.gap > 0 ? <span className="ml-2 text-xs text-gold">need {n.gap}</span> : <CheckCircle2 className="ml-2 inline h-3.5 w-3.5 text-lime-glow" />}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <motion.div className="h-full rounded-full" style={{ background: rm.color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 80, damping: 20 }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ───────────────────────── Field view ─────────────────────────

interface XI {
  rows: { role: Role; players: Player[] }[]
  bench: Player[]
  captainId?: string
  viceId?: string
}

function shuffled<T>(list: T[]) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Picks a playing XI: the most expensive keeper is fixed behind the stumps, then batters,
 * all-rounders and bowlers fill a balanced side. With `random`, everyone except the keeper is
 * drawn in a random order (and placed randomly within their row) so each shuffle sets a new field.
 */
function pickXI(squad: Player[], random: boolean): XI {
  const byPrice = [...squad].sort((a, b) => (b.soldPrice ?? 0) - (a.soldPrice ?? 0))
  const keeper = byPrice.find((p) => normRole(p.role) === 'Wicket-keeper')
  const rest = (random ? shuffled : (x: Player[]) => x)(byPrice.filter((p) => p !== keeper))
  const size = Math.min(11, squad.length)
  const want = roleTargets(11)
  const picked = new Set<Player>(keeper ? [keeper] : [])
  // Spare keepers play as batters.
  const asRole = (p: Player): Role => (normRole(p.role) === 'Wicket-keeper' ? 'Batsman' : normRole(p.role))
  for (const role of ['Batsman', 'All-rounder', 'Bowler'] as Role[]) {
    for (const p of rest.filter((x) => asRole(x) === role).slice(0, want[role])) if (picked.size < size) picked.add(p)
  }
  for (const p of rest) if (picked.size < size) picked.add(p)

  const xi = [...picked]
  const row = (role: Role) => {
    const list = role === 'Wicket-keeper' ? (keeper ? [keeper] : []) : xi.filter((p) => p !== keeper && asRole(p) === role)
    return random ? shuffled(list) : list
  }
  const leaders = [...xi].sort((a, b) => (b.soldPrice ?? 0) - (a.soldPrice ?? 0))
  return {
    rows: ROLES.map((role) => ({ role, players: row(role) })),
    bench: byPrice.filter((p) => !picked.has(p)),
    captainId: leaders[0]?.id,
    viceId: leaders[1]?.id,
  }
}

const ON_FIELD = '#ffffff'

function FieldPlayer({ p, color, currency, tag }: { p: Player; color: string; currency: string; tag?: 'C' | 'VC' }) {
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }} className="flex w-[76px] flex-col items-center sm:w-[104px]">
      <div className="relative">
        <Avatar src={p.photoUrl} name={p.name} size={56} color={color} className="shadow-lg" />
        <span className="pointer-events-none absolute inset-0 rounded-full border-[3px]" style={{ borderColor: color }} />
        {tag && (
          <span className="absolute -left-2 -top-1 grid h-6 min-w-6 place-items-center rounded-full px-1 text-[10px] font-black shadow" style={{ background: tag === 'C' ? '#2563eb' : '#7c3aed', color: ON_FIELD }}>
            {tag}
          </span>
        )}
      </div>
      <span className="mt-1.5 line-clamp-2 max-w-full rounded-md px-2 py-0.5 text-center text-[11px] font-semibold leading-tight sm:text-xs" style={{ background: 'rgba(10,14,22,0.82)', color: ON_FIELD }}>
        {p.name}
      </span>
      <span className="mt-0.5 font-mono text-[11px] font-bold" style={{ color: ON_FIELD }}>
        {p.soldPrice ? moneyShort(p.soldPrice, currency) : p.retained ? 'Retained' : '—'}
      </span>
    </motion.div>
  )
}

/** The squad laid out on a cricket field, keeper at the top and bowlers at the bottom. */
export function FieldView({ squad, color, currency, maxSquad }: { squad: Player[]; color: string; currency: string; maxSquad: number }) {
  const [seed, setSeed] = useState(0)
  const xi = useMemo(() => pickXI(squad, seed > 0), [squad, seed])
  const count = xi.rows.reduce((a, r) => a + r.players.length, 0)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-300">
          Playing <b className="text-ink-100">{count}</b>/{Math.min(11, maxSquad)} · keeper fixed, everyone else can be shuffled
        </p>
        <Button size="sm" variant="secondary" onClick={() => setSeed((s) => s + 1)}>
          <Shuffle className="h-3.5 w-3.5" /> Shuffle field
        </Button>
      </div>
      <div
        className="relative overflow-hidden rounded-[2rem] px-2 py-6 sm:px-6"
        style={{ background: 'repeating-linear-gradient(90deg, #2f7a3a 0 44px, #2a7034 44px 88px)', boxShadow: 'inset 0 0 120px rgba(0,0,0,0.35)' }}
      >
        {/* Boundary rope and the pitch strip in the middle. */}
        <div className="pointer-events-none absolute inset-3 rounded-[50%] border-2 border-dashed" style={{ borderColor: 'rgba(255,255,255,0.18)' }} />
        <div className="pointer-events-none absolute left-1/2 top-[22%] h-[56%] w-[70px] -translate-x-1/2 rounded-sm sm:w-[110px]" style={{ background: 'rgba(214,196,150,0.32)' }}>
          <div className="absolute inset-x-2 top-[8%] h-px" style={{ background: 'rgba(255,255,255,0.45)' }} />
          <div className="absolute inset-x-2 bottom-[8%] h-px" style={{ background: 'rgba(255,255,255,0.45)' }} />
        </div>

        <div className="relative space-y-5">
          {xi.rows.map(({ role, players }) => (
            <section key={role} aria-label={ROLE_LABEL[role]}>
              <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {ROLE_LABEL[role]}
              </p>
              {players.length ? (
                <div className="flex flex-wrap justify-center gap-x-2 gap-y-4 sm:gap-x-6">
                  {players.map((p) => (
                    <FieldPlayer key={`${p.id}:${seed}`} p={p} color={color} currency={currency} tag={p.id === xi.captainId ? 'C' : p.id === xi.viceId ? 'VC' : undefined} />
                  ))}
                </div>
              ) : (
                <p className="mx-auto w-fit rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.75)' }}>
                  {role === 'Wicket-keeper' ? 'No keeper in this squad' : 'None picked'}
                </p>
              )}
            </section>
          ))}
        </div>
      </div>
      {xi.bench.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Bench ({xi.bench.length})</p>
          <div className="flex flex-wrap gap-2">
            {xi.bench.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3 text-xs">
                <Avatar src={p.photoUrl} name={p.name} size={22} />
                {p.name}
                <span className="font-bold" style={{ color: roleMeta(p.role).color }}>{roleMeta(p.role).short}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Small callout used when a squad has a hole that matters (no keeper, etc.). */
export function NeedCallout({ need, className }: { need: RoleNeed; className?: string }) {
  const critical = need.role === 'Wicket-keeper' && need.have === 0
  return (
    <div className={cn('flex items-start gap-2 rounded-xl border px-3 py-2 text-sm', critical ? 'border-rose-hot/30 bg-rose-hot/10 text-rose-hot' : 'border-gold/30 bg-gold/10 text-gold', className)}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        {critical ? 'No wicket keeper yet — pick one up before the pool runs dry.' : `Still looking for ${need.gap} more ${ROLE_LABEL[need.role].toLowerCase()}${need.gap > 1 ? 's' : ''}.`}
      </span>
    </div>
  )
}
