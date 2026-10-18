'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Crown, FileDown, FileSpreadsheet, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { useTournament } from '@/components/tournament-context'
import { CricketScene } from '@/components/cricket-scene'
import { Avatar, Badge, Button, Card, EmptyState, PageLoader, Select, fadeUp, stagger } from '@/components/ui'
import { api } from '@/lib/api'
import { exportResults } from '@/lib/excel'
import { money, moneyShort, roleMeta } from '@/lib/format'
import type { Player, Team, Tournament } from '@/lib/types'

interface Results {
  tournament: Tournament
  teams: Team[]
  players: Player[]
  bidCount: number
}

/** '' = every team, 'unsold' = players nobody bought, otherwise a team id. */
type View = string

export default function ResultsPage() {
  const { t } = useTournament()
  const [r, setR] = useState<Results | null>(null)
  const [view, setView] = useState<View>('')
  useEffect(() => {
    api<Results>(`/tournaments/${t.id}/auction/results`).then(setR).catch((e) => toast.error(e.message))
  }, [t.id])

  const sold = useMemo(() => (r?.players.filter((p) => p.status === 'SOLD') ?? []).sort((a, b) => (b.soldPrice ?? 0) - (a.soldPrice ?? 0)), [r])
  if (!r) return <PageLoader />
  if (!sold.length) {
    return <EmptyState art={<CricketScene variant="trophy" />} title="No results yet">Once players are sold, squads and spending show up here — ready to export to Excel or PDF.</EmptyState>
  }

  const cur = t.currency
  const total = sold.reduce((a, p) => a + (p.soldPrice ?? 0), 0)
  const unsold = r.players.filter((p) => p.status !== 'SOLD' && p.approved)
  const team = r.teams.find((x) => x.id === view)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Results</h2>
          <p className="text-sm text-ink-400">{sold.length} sold · {unsold.length} not sold · {r.bidCount} bids · {money(total, cur)} spent</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select className="h-10 w-56" value={view} onChange={(e) => setView(e.target.value)} aria-label="Show results for">
            <option value="">All teams</option>
            {r.teams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            <option value="unsold">Unsold players ({unsold.length})</option>
          </Select>
          <a href={`/report/${t.id}${team ? `?team=${team.id}` : ''}`} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold hover:bg-white/5">
            <FileDown className="h-4 w-4" /> {team ? `${team.shortName} PDF` : 'PDF report'}
          </a>
          <Button onClick={() => exportResults(r.players, r.teams, r.tournament)}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
        </div>
      </div>

      {view === '' && (
        <>
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {sold.slice(0, 5).map((p, i) => {
              const tm = r.teams.find((x) => x.id === p.soldTeamId)
              return (
                <motion.div key={p.id} variants={fadeUp}>
                  <Card className="relative h-full p-5 text-center">
                    {i === 0 && <Crown className="absolute right-4 top-4 h-5 w-5 text-gold" />}
                    <p className="absolute left-4 top-4 font-display text-2xl font-black text-white/10">#{i + 1}</p>
                    <Avatar src={p.photoUrl} name={p.name} size={76} rounded="xl" className="mx-auto" />
                    <p className="mt-3 truncate font-semibold">{p.name}</p>
                    <p className="truncate text-xs" style={{ color: tm?.color }}>{tm?.name}</p>
                    <p className="mt-2 font-display text-2xl font-black text-gold">{moneyShort(p.soldPrice, cur)}</p>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {r.teams.map((tm) => {
              const squad = sold.filter((p) => p.soldTeamId === tm.id)
              const spent = squad.reduce((a, p) => a + (p.soldPrice ?? 0), 0)
              return (
                <Card key={tm.id} className="overflow-hidden">
                  <button className="flex w-full items-center gap-3 p-4 text-left hover:brightness-110" style={{ background: `linear-gradient(90deg, ${tm.color}2a, transparent)` }} onClick={() => setView(tm.id)}>
                    <Avatar src={tm.logoUrl} name={tm.shortName} size={44} rounded="xl" color={tm.color} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{tm.name}</p>
                      <p className="text-xs text-ink-400">{squad.length} players · spent {moneyShort(spent, cur)} · left {moneyShort(tm.purse, cur)}</p>
                    </div>
                  </button>
                  <ul className="divide-y divide-white/5">
                    {squad.map((p) => (
                      <li key={p.id} className="flex items-center gap-3 px-4 py-2">
                        <Avatar src={p.photoUrl} name={p.name} size={28} />
                        <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                        <span className="text-[10px] font-bold" style={{ color: roleMeta(p.role).color }}>{roleMeta(p.role).short}</span>
                        <span className="w-20 text-right font-mono text-xs text-gold">{money(p.soldPrice, cur)}</span>
                      </li>
                    ))}
                    {!squad.length && <li className="px-4 py-4 text-sm text-ink-400">No players</li>}
                  </ul>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {team && <TeamDetail team={team} squad={sold.filter((p) => p.soldTeamId === team.id)} currency={cur} />}

      {view === 'unsold' && (
        <Card className="overflow-hidden">
          <div className="border-b border-white/5 p-4"><p className="font-semibold">Unsold players</p></div>
          {unsold.length ? (
            <ul className="grid divide-y divide-white/5 sm:grid-cols-2 sm:divide-y-0">
              {unsold.map((p) => (
                <li key={p.id} className="flex items-center gap-3 border-white/5 px-4 py-2.5 sm:border-b">
                  <Avatar src={p.photoUrl} name={p.name} size={30} />
                  <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                  <span className="text-[10px] font-bold" style={{ color: roleMeta(p.role).color }}>{roleMeta(p.role).short}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-sm text-ink-400">Everyone was sold 🎉</p>
          )}
        </Card>
      )}
    </div>
  )
}

function TeamDetail({ team, squad, currency }: { team: Team; squad: Player[]; currency: string }) {
  const spent = squad.reduce((a, p) => a + (p.soldPrice ?? 0), 0)
  const roles = Object.entries(squad.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.role]: (acc[p.role] ?? 0) + 1 }), {}))
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 p-5" style={{ background: `linear-gradient(90deg, ${team.color}33, transparent)` }}>
        <Avatar src={team.logoUrl} name={team.shortName} size={60} rounded="xl" color={team.color} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl font-bold">{team.name}</p>
          <p className="text-sm text-ink-400">{team.ownerName ? `Owner: ${team.ownerName} · ` : ''}{squad.length} players</p>
        </div>
        <dl className="flex gap-6 text-right text-sm">
          <div><dt className="text-xs text-ink-400">Spent</dt><dd className="font-display text-xl font-bold text-gold">{money(spent, currency)}</dd></div>
          <div><dt className="text-xs text-ink-400">Purse left</dt><dd className="font-display text-xl font-bold">{money(team.purse, currency)}</dd></div>
        </dl>
      </div>
      {roles.length > 0 && (
        <div className="flex flex-wrap gap-2 border-y border-white/5 px-5 py-3">
          {roles.map(([role, n]) => <Badge key={role} color={roleMeta(role).color}>{n} {roleMeta(role).short}</Badge>)}
        </div>
      )}
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs text-ink-400">
            <tr className="border-b border-white/5">
              <th className="px-5 py-3 font-medium">#</th>
              <th className="px-2 py-3 font-medium">Player</th>
              <th className="px-2 py-3 font-medium">Role</th>
              <th className="px-2 py-3 font-medium">Category</th>
              <th className="px-5 py-3 text-right font-medium">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {squad.map((p, i) => (
              <tr key={p.id}>
                <td className="px-5 py-2.5 text-ink-400">{i + 1}</td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-3">
                    <Avatar src={p.photoUrl} name={p.name} size={32} />
                    <span className="font-medium">{p.name}</span>
                    {p.retained && <Badge color="#ffb020">retained</Badge>}
                  </div>
                </td>
                <td className="px-2 py-2.5"><Badge color={roleMeta(p.role).color}>{roleMeta(p.role).short}</Badge></td>
                <td className="px-2 py-2.5 text-ink-300">{p.category || '—'}</td>
                <td className="px-5 py-2.5 text-right font-mono text-gold">{money(p.soldPrice, currency)}</td>
              </tr>
            ))}
            {!squad.length && <tr><td colSpan={5} className="px-5 py-6 text-center text-ink-400">No players bought</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
