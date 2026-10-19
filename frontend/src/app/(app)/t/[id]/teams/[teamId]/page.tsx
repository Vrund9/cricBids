'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft, Gavel, Lock, Search, Sparkles, UserCheck, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { useTournament } from '@/components/tournament-context'
import { ConnIndicator } from '@/components/auction'
import { FieldView, NeedCallout, ROLE_LABEL, ROLES, RoleBalance, normRole, squadNeeds, type Role } from '@/components/squad'
import { Avatar, Badge, Button, Card, EmptyState, PageLoader } from '@/components/ui'
import { api } from '@/lib/api'
import { money, moneyShort, roleMeta } from '@/lib/format'
import { useLiveAuction } from '@/lib/live'
import type { Player, Team, Tournament } from '@/lib/types'
import { cn } from '@/lib/cn'

interface Results {
  tournament: Tournament
  teams: Team[]
  players: Player[]
}

/** Base price that applies to this player at the auction (own → category → tournament). */
function basePriceOf(p: Player, t: Tournament) {
  return p.basePrice ?? (p.category ? t.categoryBasePrices?.[p.category] : undefined) ?? t.basePrice
}

/**
 * One team's war room: who they've bought, what the squad still needs, and which players
 * left in the pool fill those gaps. Opens in its own tab from the control room and stays live.
 */
export default function TeamSquadPage() {
  const { t } = useTournament()
  const { teamId } = useParams<{ teamId: string }>()
  const { state: snap, conn, viewers } = useLiveAuction({ ownerTournamentId: t.id })
  const [r, setR] = useState<Results | null>(null)
  const [scout, setScout] = useState<Role | null>(null)
  const [preview, setPreview] = useState(false)

  const load = useCallback(() => api<Results>(`/tournaments/${t.id}/auction/results`).then(setR).catch((e) => toast.error((e as Error).message)), [t.id])
  // Refetch only when a sale, unsold call or new player changes the picture — not on every bid.
  const changeKey = snap ? `${snap.counts.sold}|${snap.counts.unsold}|${snap.counts.available}|${snap.tournament.status}|${snap.current?.player.id ?? ''}|${snap.current?.player.status ?? ''}` : ''
  useEffect(() => {
    void load()
  }, [load, changeKey])

  const team = r?.teams.find((x) => x.id === teamId)
  const live = snap?.teams.find((x) => x.id === teamId)
  const squad = useMemo(() => (r?.players.filter((p) => p.status === 'SOLD' && p.soldTeamId === teamId) ?? []).sort((a, b) => (b.soldPrice ?? 0) - (a.soldPrice ?? 0)), [r, teamId])
  const pool = useMemo(() => (r ? r.players.filter((p) => p.approved && (p.status === 'AVAILABLE' || p.status === 'UNSOLD' || p.status === 'LIVE')) : []), [r])
  const maxSquad = r?.tournament.maxSquad ?? t.maxSquad
  const needs = useMemo(() => squadNeeds(squad, maxSquad), [squad, maxSquad])
  const open = needs.filter((n) => n.gap > 0)

  if (!r) return <PageLoader />
  if (!team) {
    return (
      <EmptyState title="Team not found" action={<Link href={`/t/${t.id}/teams`} className="text-sm font-semibold text-lime-glow">Back to teams</Link>}>
        This team may have been removed.
      </EmptyState>
    )
  }

  const cur = r.tournament.currency
  const tour = r.tournament
  const spent = squad.reduce((a, p) => a + (p.soldPrice ?? 0), 0)
  const slots = Math.max(0, maxSquad - squad.length)
  const maxBid = live?.maxBid ?? team.purse
  const squadDone = tour.status === 'COMPLETED' || squad.length >= maxSquad
  const onBlock = snap?.current?.player.status === 'LIVE' ? snap.current : null
  const blockNeed = onBlock ? needs.find((n) => n.role === normRole(onBlock.player.role)) : undefined
  const activeRole: Role = scout ?? open[0]?.role ?? 'Wicket-keeper'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/t/${t.id}/teams`} className="inline-flex items-center gap-1 text-xs text-ink-400 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> All teams
        </Link>
        {(tour.status === 'LIVE' || tour.status === 'PAUSED') && <ConnIndicator conn={conn} viewers={viewers} />}
      </div>

      {/* Team header */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 p-5 sm:p-6" style={{ background: `linear-gradient(90deg, ${team.color}38, transparent)` }}>
          <Avatar src={team.logoUrl} name={team.shortName} size={68} rounded="xl" color={team.color} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-3xl font-extrabold">{team.name}</h2>
            <p className="text-sm text-ink-400">{team.ownerName ? `Owner: ${team.ownerName} · ` : ''}{team.shortName}</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 border-t border-white/5 text-center sm:grid-cols-4">
          <Stat label="Squad" value={`${squad.length}/${maxSquad}`} />
          <Stat label="Spent" value={moneyShort(spent, cur)} tone="text-gold" />
          <Stat label="Purse left" value={moneyShort(team.purse, cur)} />
          <Stat label={slots ? 'Max bid now' : 'Squad full'} value={slots ? moneyShort(maxBid, cur) : '—'} />
        </dl>
      </Card>

      {onBlock && (
        <Card className={cn('flex flex-wrap items-center gap-4 p-4', blockNeed?.gap ? 'border-lime-glow/40' : '')}>
          <Gavel className="h-5 w-5 text-gold" />
          <Avatar src={onBlock.player.photoUrl} name={onBlock.player.name} size={40} />
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-400">On the block now</p>
            <p className="truncate font-semibold">
              {onBlock.player.name} <span className="text-xs font-bold" style={{ color: roleMeta(onBlock.player.role).color }}>{roleMeta(onBlock.player.role).short}</span>
            </p>
          </div>
          <p className={cn('text-sm font-semibold', blockNeed?.gap ? 'text-lime-glow' : 'text-ink-400')}>
            {!slots ? 'Squad is full' : blockNeed?.gap ? `Fills a need · ${blockNeed.gap} ${ROLE_LABEL[blockNeed.role].toLowerCase()} short` : 'Role already covered'}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Squad analysis */}
        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-400"><Sparkles className="h-3.5 w-3.5" /> Squad balance</h3>
          <RoleBalance needs={needs} />
          <div className="mt-5 space-y-2">
            {open.length ? open.slice(0, 2).map((n) => <NeedCallout key={n.role} need={n} />) : (
              <p className="rounded-xl border border-lime-glow/30 bg-lime-glow/10 px-3 py-2 text-sm text-lime-glow">Balanced squad — every role is covered.</p>
            )}
          </div>
          {slots > 0 && (
            <p className="mt-4 flex items-center gap-2 text-sm text-ink-300">
              <Wallet className="h-4 w-4 text-ink-400" /> {slots} slot{slots > 1 ? 's' : ''} left · about <b className="text-ink-100">{moneyShort(Math.floor(team.purse / slots), cur)}</b> per player
            </p>
          )}
          <p className="mt-4 text-xs text-ink-400">Suggested balance is scaled from a classic XI (1 keeper, 4 batters, 2 all-rounders, 4 bowlers). Player performance stats will appear here once they’re tracked.</p>
        </Card>

        {/* Scouting: players still in the pool, by role */}
        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-400"><Search className="h-3.5 w-3.5" /> Still available</h3>
          <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto" role="tablist">
            {ROLES.map((role) => {
              const n = needs.find((x) => x.role === role)!
              const count = pool.filter((p) => normRole(p.role) === role).length
              return (
                <button
                  key={role}
                  role="tab"
                  aria-selected={activeRole === role}
                  onClick={() => setScout(role)}
                  className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition', activeRole === role ? 'border-white/25 bg-white/10 text-white' : 'border-white/10 text-ink-300 hover:text-white')}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: roleMeta(role).color }} />
                  {ROLE_LABEL[role]}s <span className="text-ink-400">{count}</span>
                  {n.gap > 0 && <span className="rounded-full bg-gold/20 px-1.5 text-[10px] text-gold">need {n.gap}</span>}
                </button>
              )
            })}
          </div>
          <ScoutList players={pool.filter((p) => normRole(p.role) === activeRole)} t={tour} maxBid={slots ? maxBid : null} currency={cur} />
        </Card>
      </div>

      {/* Bought players */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Bought players ({squad.length})</h3>
          <div className="flex flex-wrap gap-1.5">
            {ROLES.map((role) => {
              const n = squad.filter((p) => normRole(p.role) === role).length
              return n ? <Badge key={role} color={roleMeta(role).color}>{n} {roleMeta(role).short}</Badge> : null
            })}
          </div>
        </div>
        {squad.length ? (
          <ul className="grid divide-y divide-white/5 sm:grid-cols-2 sm:divide-y-0">
            {squad.map((p, i) => (
              <motion.li key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }} className="flex items-center gap-3 border-white/5 px-5 py-3 sm:border-b">
                <Avatar src={p.photoUrl} name={p.name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium">
                    {p.name}
                    {p.retained && <UserCheck className="h-3.5 w-3.5 shrink-0 text-gold" aria-label="Retained" />}
                  </p>
                  <p className="truncate text-[11px] text-ink-400">{[ROLE_LABEL[normRole(p.role)], p.category && `Cat ${p.category}`, p.battingStyle].filter(Boolean).join(' · ')}</p>
                </div>
                <span className="font-mono text-sm font-semibold text-gold">{p.soldPrice ? money(p.soldPrice, cur) : 'free'}</span>
              </motion.li>
            ))}
          </ul>
        ) : (
          <p className="p-8 text-center text-sm text-ink-400">No players yet — they’ll appear here the moment the hammer falls.</p>
        )}
      </Card>

      {/* Field view */}
      <Card className="p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">On the field</h3>
        {squadDone || preview ? (
          squad.length ? <FieldView squad={squad} color={team.color} currency={cur} maxSquad={maxSquad} /> : <p className="py-6 text-center text-sm text-ink-400">No players to put on the field.</p>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-10 text-center">
            <Lock className="h-6 w-6 text-ink-400" />
            <p className="max-w-sm text-sm text-ink-300">The field view unlocks once {team.shortName} completes their squad ({squad.length}/{maxSquad}) or the auction finishes.</p>
            {squad.length > 0 && <Button size="sm" variant="secondary" onClick={() => setPreview(true)}>Preview current squad</Button>}
          </div>
        )}
      </Card>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="border-white/5 p-3 [&:not(:last-child)]:border-r">
      <dt className="text-xs text-ink-400">{label}</dt>
      <dd className={cn('mt-0.5 font-display text-xl font-bold tabular', tone)}>{value}</dd>
    </div>
  )
}

/** `maxBid` is null once the squad is full: nothing is affordable, so nothing is flagged. */
function ScoutList({ players, t, maxBid, currency }: { players: Player[]; t: Tournament; maxBid: number | null; currency: string }) {
  const [all, setAll] = useState(false)
  // Highest base price first: the closest thing to a quality signal until stats exist.
  const sorted = useMemo(() => [...players].sort((a, b) => basePriceOf(b, t) - basePriceOf(a, t) || (a.category ?? '~').localeCompare(b.category ?? '~') || a.serial - b.serial), [players, t])
  if (!sorted.length) return <p className="py-6 text-center text-sm text-ink-400">Nobody left in the pool for this role.</p>
  const shown = all ? sorted : sorted.slice(0, 8)
  return (
    <>
      <ul className="divide-y divide-white/5">
        {shown.map((p) => {
          const base = basePriceOf(p, t)
          const affordable = maxBid === null || base <= maxBid
          return (
            <li key={p.id} className={cn('flex items-center gap-3 py-2', !affordable && 'opacity-50')}>
              <Avatar src={p.photoUrl} name={p.name} size={32} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-medium">
                  {p.name}
                  {p.status === 'LIVE' && <Badge color="#ff4d6d">on the block</Badge>}
                  {p.status === 'UNSOLD' && <span className="text-[10px] text-ink-400">unsold</span>}
                </p>
                <p className="truncate text-[11px] text-ink-400">{[p.category && `Cat ${p.category}`, p.battingStyle, p.bowlingStyle && p.bowlingStyle !== 'Does not bowl' ? p.bowlingStyle : null].filter(Boolean).join(' · ') || `#${p.serial}`}</p>
              </div>
              <span className="text-right">
                <span className="block font-mono text-xs font-semibold">{moneyShort(base, currency)}</span>
                {!affordable && <span className="block text-[10px] text-rose-hot">over budget</span>}
              </span>
            </li>
          )
        })}
      </ul>
      {sorted.length > 8 && (
        <button className="mt-2 text-xs font-semibold text-lime-glow hover:underline" onClick={() => setAll((a) => !a)}>
          {all ? 'Show fewer' : `Show all ${sorted.length}`}
        </button>
      )}
    </>
  )
}
