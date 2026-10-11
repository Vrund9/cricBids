'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Crown, FileSpreadsheet, Printer, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { useTournament } from '@/components/tournament-context'
import { Avatar, Button, Card, EmptyState, PageLoader, fadeUp, stagger } from '@/components/ui'
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

export default function ResultsPage() {
  const { t } = useTournament()
  const [r, setR] = useState<Results | null>(null)
  useEffect(() => {
    api<Results>(`/tournaments/${t.id}/auction/results`).then(setR).catch((e) => toast.error(e.message))
  }, [t.id])

  const sold = useMemo(() => r?.players.filter((p) => p.status === 'SOLD') ?? [], [r])
  if (!r) return <PageLoader />
  if (!sold.length) {
    return <EmptyState icon={<Trophy className="h-6 w-6" />} title="No results yet">Once players are sold, squads and spending show up here — ready to export to Excel.</EmptyState>
  }

  const cur = t.currency
  const total = sold.reduce((a, p) => a + (p.soldPrice ?? 0), 0)
  const top = sold.slice(0, 5)

  return (
    <div className="space-y-8 print:space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Results</h2>
          <p className="text-sm text-ink-400">{sold.length} sold · {r.players.length - sold.length} not sold · {r.bidCount} bids · {money(total, cur)} spent</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
          <Button onClick={() => exportResults(r.players, r.teams, r.tournament)}><FileSpreadsheet className="h-4 w-4" /> Download Excel</Button>
        </div>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {top.map((p, i) => {
          const team = r.teams.find((x) => x.id === p.soldTeamId)
          return (
            <motion.div key={p.id} variants={fadeUp}>
              <Card className="relative h-full p-5 text-center">
                {i === 0 && <Crown className="absolute right-4 top-4 h-5 w-5 text-gold" />}
                <p className="absolute left-4 top-4 font-display text-2xl font-black text-white/10">#{i + 1}</p>
                <Avatar src={p.photoUrl} name={p.name} size={76} rounded="xl" className="mx-auto" />
                <p className="mt-3 truncate font-semibold">{p.name}</p>
                <p className="truncate text-xs" style={{ color: team?.color }}>{team?.name}</p>
                <p className="mt-2 font-display text-2xl font-black text-gold">{moneyShort(p.soldPrice, cur)}</p>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {r.teams.map((team) => {
          const squad = sold.filter((p) => p.soldTeamId === team.id)
          const spent = squad.reduce((a, p) => a + (p.soldPrice ?? 0), 0)
          return (
            <Card key={team.id} className="overflow-hidden break-inside-avoid">
              <div className="flex items-center gap-3 p-4" style={{ background: `linear-gradient(90deg, ${team.color}2a, transparent)` }}>
                <Avatar src={team.logoUrl} name={team.shortName} size={44} rounded="xl" color={team.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{team.name}</p>
                  <p className="text-xs text-ink-400">{squad.length} players · spent {moneyShort(spent, cur)} · left {moneyShort(team.purse, cur)}</p>
                </div>
              </div>
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
    </div>
  )
}
