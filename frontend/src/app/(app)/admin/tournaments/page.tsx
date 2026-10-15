'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { AdminHeader, FilterTabs, Pagination, SearchBox, Table, fmtDate } from '@/components/admin'
import { Badge, EmptyState, PageLoader, Select, StatusBadge } from '@/components/ui'
import { api } from '@/lib/api'
import { AdminTournamentRow, Paged, useAdmin } from '@/lib/admin'

type Status = 'all' | 'LIVE' | 'DRAFT' | 'READY' | 'PAUSED' | 'COMPLETED'

export default function AdminTournamentsPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<Status>('all')
  const [plan, setPlan] = useState('')
  const [page, setPage] = useState(1)
  const [saving, setSaving] = useState<string | null>(null)
  const { data, error, reload } = useAdmin<Paged<AdminTournamentRow>>(
    `/admin/tournaments?q=${encodeURIComponent(q)}&status=${status === 'all' ? '' : status}&plan=${plan}&page=${page}`,
  )

  const changePlan = async (t: AdminTournamentRow, next: 'FREE' | 'PRO') => {
    setSaving(t.id)
    try {
      await api(`/admin/tournaments/${t.id}/plan`, { method: 'PATCH', body: { plan: next } })
      toast.success(next === 'PRO' ? `${t.name} upgraded to Pro` : `${t.name} moved to Free`)
      reload()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(null)
    }
  }

  return (
    <>
      <AdminHeader title="Tournaments" subtitle={data ? `${data.total.toLocaleString()} found` : undefined} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs<Status>
          value={status}
          onChange={(v) => { setStatus(v); setPage(1) }}
          options={[
            { value: 'all', label: 'All' },
            { value: 'LIVE', label: 'Live' },
            { value: 'READY', label: 'Ready' },
            { value: 'DRAFT', label: 'Draft' },
            { value: 'PAUSED', label: 'Paused' },
            { value: 'COMPLETED', label: 'Completed' },
          ]}
        />
        <div className="flex w-full gap-2 sm:w-auto">
          <Select value={plan} onChange={(e) => { setPlan(e.target.value); setPage(1) }} className="w-32">
            <option value="">Any plan</option>
            <option value="PRO">Pro</option>
            <option value="FREE">Free</option>
          </Select>
          <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1) }} placeholder="Name or owner" />
        </div>
      </div>

      {error && !data ? (
        <EmptyState title="Couldn’t load tournaments">{error}</EmptyState>
      ) : !data ? (
        <PageLoader />
      ) : (
        <>
          <Table
            head={['Tournament', 'Owner', 'Status', 'Teams / players', 'Bids', 'Created', 'Plan']}
            empty={data.rows.length === 0 && <p className="py-12 text-center text-sm text-ink-400">No tournaments match.</p>}
          >
            {data.rows.map((t) => {
              const pass = !!t.owner.seasonPassUntil && new Date(t.owner.seasonPassUntil) > new Date()
              return (
                <tr key={t.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="max-w-56 truncate font-medium">{t.name}</p>
                      <a href={`/live/${t.liveToken}`} target="_blank" rel="noreferrer" className="text-ink-400 hover:text-white" aria-label="Open live screen"><ExternalLink className="h-3.5 w-3.5" /></a>
                    </div>
                    {t.venue && <p className="max-w-56 truncate text-xs text-ink-400">{t.venue}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${t.owner.id}`} className="hover:text-lime-glow">
                      <p className="max-w-48 truncate text-sm">{t.owner.name}</p>
                      <p className="max-w-48 truncate text-xs text-ink-400">{t.owner.email}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3 tabular-nums text-ink-200">{t._count.teams} / {t._count.players}</td>
                  <td className="px-4 py-3 tabular-nums text-ink-200">{t._count.bids}</td>
                  <td className="px-4 py-3 text-xs text-ink-300">{fmtDate(t.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Select value={t.plan} disabled={saving === t.id} onChange={(e) => changePlan(t, e.target.value as 'FREE' | 'PRO')} className="h-9 w-24">
                        <option value="FREE">Free</option>
                        <option value="PRO">Pro</option>
                      </Select>
                      {pass && t.plan === 'FREE' && <Badge color="#ffb020">Pass</Badge>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </Table>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </>
      )}
    </>
  )
}
