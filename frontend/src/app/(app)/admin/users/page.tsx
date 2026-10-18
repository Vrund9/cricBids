'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AdminHeader, FilterTabs, Pagination, SearchBox, Table, fmtDate } from '@/components/admin'
import { Avatar, Badge, EmptyState, PageLoader } from '@/components/ui'
import { timeAgo } from '@/lib/format'
import { AdminUserRow, Paged, useAdmin } from '@/lib/admin'

type Filter = 'all' | 'paid' | 'google' | 'admins' | 'suspended'

export default function AdminUsersPage() {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)
  const { data, error } = useAdmin<Paged<AdminUserRow>>(`/admin/users?q=${encodeURIComponent(q)}&filter=${filter}&page=${page}`)

  return (
    <>
      <AdminHeader title="Users" subtitle={data ? `${data.total.toLocaleString()} ${filter === 'all' ? 'total' : filter}` : undefined} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs<Filter>
          value={filter}
          onChange={(v) => { setFilter(v); setPage(1) }}
          options={[
            { value: 'all', label: 'All' },
            { value: 'paid', label: 'Paid' },
            { value: 'google', label: 'Google' },
            { value: 'admins', label: 'Admins' },
            { value: 'suspended', label: 'Suspended' },
          ]}
        />
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1) }} placeholder="Search name or email" />
      </div>

      {error && !data ? (
        <EmptyState title="Couldn’t load users">{error}</EmptyState>
      ) : !data ? (
        <PageLoader />
      ) : (
        <>
          <Table
            head={['User', 'Plan', 'Tournaments', 'Sign-in', 'Joined', 'Last login']}
            empty={data.rows.length === 0 && <p className="py-12 text-center text-sm text-ink-400">No users match.</p>}
          >
            {data.rows.map((u) => (
              <tr key={u.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3">
                    <Avatar src={u.avatarUrl} name={u.name} size={34} color="#34405a" />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate font-medium hover:text-lime-glow">
                        {u.name}
                        {u.isAdmin && <Badge color="var(--color-lime-glow)">Admin</Badge>}
                        {u.suspendedAt && <Badge color="#ff4d6d">Suspended</Badge>}
                      </p>
                      <p className="truncate text-xs text-ink-400">{u.email}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {u.seasonPassActive ? (
                    <Badge color="#ffb020">Season Pass</Badge>
                  ) : u.proTournaments > 0 ? (
                    <Badge color="#ffb020">Pro ×{u.proTournaments}</Badge>
                  ) : (
                    <span className="text-xs text-ink-400">Free</span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">{u.tournaments}</td>
                <td className="px-4 py-3 text-xs text-ink-300">{[u.google && 'Google', u.hasPassword && 'Email'].filter(Boolean).join(' + ') || '—'}</td>
                <td className="px-4 py-3 text-xs text-ink-300">{fmtDate(u.createdAt)}</td>
                <td className="px-4 py-3 text-xs text-ink-300">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : '—'}</td>
              </tr>
            ))}
          </Table>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </>
      )}
    </>
  )
}
