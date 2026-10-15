'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AdminHeader, FilterTabs, Pagination, StatCard, Table, fmtDate } from '@/components/admin'
import { Badge, EmptyState, PageLoader, Select } from '@/components/ui'
import { money } from '@/lib/format'
import { AdminPayment, PAYMENT_KIND_LABEL, PAYMENT_SOURCE_META, Paged, useAdmin } from '@/lib/admin'

type Kind = 'all' | 'TOURNAMENT_PRO' | 'SEASON_PASS'

interface PaymentsResponse extends Paged<AdminPayment> {
  amount: number
  breakdown: { kind: AdminPayment['kind']; source: AdminPayment['source']; count: number; amount: number }[]
}

export default function AdminPaymentsPage() {
  const [kind, setKind] = useState<Kind>('all')
  const [source, setSource] = useState('')
  const [page, setPage] = useState(1)
  const { data, error } = useAdmin<PaymentsResponse>(`/admin/payments?kind=${kind === 'all' ? '' : kind}&source=${source}&page=${page}`)

  const sum = (pred: (b: PaymentsResponse['breakdown'][number]) => boolean) => data?.breakdown.filter(pred).reduce((s, b) => s + b.count, 0) ?? 0

  return (
    <>
      <AdminHeader title="Payments" subtitle="Every plan activation: real payments, demo upgrades and admin grants." />

      {data && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Collected" value={money(data.breakdown.reduce((s, b) => s + b.amount, 0))} hint="Real payments only" accent="#c8ff2e" />
          <StatCard label="Pro tournaments" value={sum((b) => b.kind === 'TOURNAMENT_PRO')} hint="activations" accent="#ffb020" />
          <StatCard label="Season Passes" value={sum((b) => b.kind === 'SEASON_PASS')} hint="activations" accent="#38bdf8" />
          <StatCard label="Admin grants" value={sum((b) => b.source === 'ADMIN')} hint={`${sum((b) => b.source === 'DEMO')} demo upgrades`} accent="#a78bfa" />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs<Kind>
          value={kind}
          onChange={(v) => { setKind(v); setPage(1) }}
          options={[
            { value: 'all', label: 'All' },
            { value: 'TOURNAMENT_PRO', label: 'Tournament Pro' },
            { value: 'SEASON_PASS', label: 'Season Pass' },
          ]}
        />
        <Select value={source} onChange={(e) => { setSource(e.target.value); setPage(1) }} className="w-40">
          <option value="">Any source</option>
          <option value="GATEWAY">Paid</option>
          <option value="DEMO">Demo</option>
          <option value="ADMIN">Admin grant</option>
        </Select>
      </div>

      {error && !data ? (
        <EmptyState title="Couldn’t load payments">{error}</EmptyState>
      ) : !data ? (
        <PageLoader />
      ) : (
        <>
          <Table
            head={['Date', 'User', 'What', 'Source', 'Note', 'Amount']}
            empty={data.rows.length === 0 && <p className="py-12 text-center text-sm text-ink-400">No payments yet.</p>}
          >
            {data.rows.map((p) => (
              <tr key={p.id} className="hover:bg-white/[0.02]">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-300">{fmtDate(p.createdAt, true)}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/users/${p.user.id}`} className="hover:text-lime-glow">
                    <p className="max-w-48 truncate text-sm">{p.user.name}</p>
                    <p className="max-w-48 truncate text-xs text-ink-400">{p.user.email}</p>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <p>{PAYMENT_KIND_LABEL[p.kind]}</p>
                  {p.tournament && <p className="max-w-48 truncate text-xs text-ink-400">{p.tournament.name}</p>}
                </td>
                <td className="px-4 py-3"><Badge color={PAYMENT_SOURCE_META[p.source].color}>{PAYMENT_SOURCE_META[p.source].label}</Badge></td>
                <td className="max-w-56 truncate px-4 py-3 text-xs text-ink-400">{p.note ?? '—'}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(p.amount, p.currency)}</td>
              </tr>
            ))}
          </Table>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </>
      )}
    </>
  )
}
