'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AdminHeader, Pagination, Table, fmtDate } from '@/components/admin'
import { EmptyState, PageLoader } from '@/components/ui'
import { AuditEntry, Paged, actionLabel, useAdmin } from '@/lib/admin'

const show = (v: unknown) => (v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v))

/** Human-readable summary of what an audit entry changed. */
function Details({ entry }: { entry: AuditEntry }) {
  const d = entry.details ?? {}
  if (entry.action === 'settings.update') {
    return (
      <ul className="space-y-0.5">
        {Object.entries(d as Record<string, { from: unknown; to: unknown }>).map(([k, v]) => (
          <li key={k}><span className="text-ink-400">{k}:</span> {show(v.from)} → <b className="text-white">{show(v.to)}</b></li>
        ))}
      </ul>
    )
  }
  const { email, name, ...rest } = d as Record<string, unknown>
  return (
    <span>
      {typeof email === 'string' && (entry.targetType === 'user' && entry.action !== 'user.delete'
        ? <Link href={`/admin/users/${entry.targetId}`} className="text-white hover:text-lime-glow">{email}</Link>
        : <b className="text-white">{email}</b>)}
      {typeof name === 'string' && !email && <b className="text-white">{name}</b>}
      {Object.keys(rest).length > 0 && <span className="text-ink-400"> · {Object.entries(rest).map(([k, v]) => `${k}: ${show(v)}`).join(' · ')}</span>}
    </span>
  )
}

export default function AdminActivityPage() {
  const [page, setPage] = useState(1)
  const { data, error } = useAdmin<Paged<AuditEntry>>(`/admin/audit?page=${page}`)

  return (
    <>
      <AdminHeader title="Activity log" subtitle="Every change made from the admin panel: who, what and when." />
      {error && !data ? (
        <EmptyState title="Couldn’t load the activity log">{error}</EmptyState>
      ) : !data ? (
        <PageLoader />
      ) : (
        <>
          <Table head={['When', 'Admin', 'Action', 'Details']} empty={data.rows.length === 0 && <p className="py-12 text-center text-sm text-ink-400">No admin activity yet.</p>}>
            {data.rows.map((a) => (
              <tr key={a.id} className="align-top hover:bg-white/[0.02]">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-300">{fmtDate(a.createdAt, true)}</td>
                <td className="px-4 py-3 text-xs">{a.actorEmail}</td>
                <td className="whitespace-nowrap px-4 py-3 font-medium">{actionLabel(a.action)}</td>
                <td className="px-4 py-3 text-xs text-ink-200"><Details entry={a} /></td>
              </tr>
            ))}
          </Table>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </>
      )}
    </>
  )
}
