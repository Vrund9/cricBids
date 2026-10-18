'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Bug, Lightbulb } from 'lucide-react'
import { toast } from 'sonner'
import { AdminHeader, FilterTabs, Pagination, StatCard, fmtDate } from '@/components/admin'
import { Badge, Button, Card, EmptyState, Input, PageLoader, Select } from '@/components/ui'
import { api } from '@/lib/api'
import { AdminFeedback, Paged, useAdmin } from '@/lib/admin'
import { useConfirm } from '@/components/confirm'

type Type = 'all' | AdminFeedback['type']
type Status = AdminFeedback['status']

interface FeedbackResponse extends Paged<AdminFeedback> {
  counts: { type: AdminFeedback['type']; status: Status; count: number }[]
}

const STATUS: Record<Status, { label: string; color: string }> = {
  NEW: { label: 'New', color: '#38bdf8' },
  REVIEWED: { label: 'Reviewed', color: '#a78bfa' },
  RESOLVED: { label: 'Resolved', color: '#22c55e' },
  REJECTED: { label: 'Rejected', color: '#ff4d6d' },
}

export default function AdminFeedbackPage() {
  const [type, setType] = useState<Type>('all')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const { data, error, reload } = useAdmin<FeedbackResponse>(`/admin/feedback?type=${type === 'all' ? '' : type}&status=${status}&page=${page}`)
  const count = (pred: (c: FeedbackResponse['counts'][number]) => boolean) => data?.counts.filter(pred).reduce((a, c) => a + c.count, 0) ?? 0

  return (
    <>
      <AdminHeader title="Feedback" subtitle="Suggestions and bug reports from organisers. Each earns 5 reward points; rejecting one as spam takes its points back." />
      {data && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="New" value={count((c) => c.status === 'NEW')} hint="waiting for review" accent="#38bdf8" />
          <StatCard label="Suggestions" value={count((c) => c.type === 'SUGGESTION')} accent="#ffb020" />
          <StatCard label="Bugs" value={count((c) => c.type === 'BUG')} hint={`${count((c) => c.type === 'BUG' && c.status !== 'RESOLVED' && c.status !== 'REJECTED')} open`} accent="#ff4d6d" />
          <StatCard label="Resolved" value={count((c) => c.status === 'RESOLVED')} accent="#22c55e" />
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs<Type>
          value={type}
          onChange={(v) => { setType(v); setPage(1) }}
          options={[{ value: 'all', label: 'All' }, { value: 'SUGGESTION', label: 'Suggestions' }, { value: 'BUG', label: 'Bugs' }]}
        />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="w-40">
          <option value="">Any status</option>
          {(Object.keys(STATUS) as Status[]).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
        </Select>
      </div>
      {error && !data ? (
        <EmptyState title="Couldn’t load feedback">{error}</EmptyState>
      ) : !data ? (
        <PageLoader />
      ) : data.rows.length === 0 ? (
        <EmptyState title="No feedback yet">When organisers send suggestions or bug reports from their account page, they show up here.</EmptyState>
      ) : (
        <>
          <div className="space-y-3">
            {data.rows.map((f) => <FeedbackRow key={f.id} f={f} onChange={reload} />)}
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </>
      )}
    </>
  )
}

function FeedbackRow({ f, onChange }: { f: AdminFeedback; onChange: () => void }) {
  const [note, setNote] = useState(f.adminNote ?? '')
  const [busy, setBusy] = useState<string | null>(null)
  const confirm = useConfirm()
  const set = async (status: Status) => {
    if (status === 'REJECTED' && !(await confirm({ title: 'Reject as spam?', message: <>“{f.title}” will be rejected and <b>{f.user.name}</b> loses the {f.points} points it earned.</>, confirmLabel: 'Reject', danger: true }))) return
    setBusy(status)
    try {
      await api(`/admin/feedback/${f.id}`, { method: 'PATCH', body: { status, adminNote: note } })
      toast.success(`Marked ${STATUS[status].label.toLowerCase()}`)
      onChange()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start gap-3">
        {f.type === 'BUG' ? <Bug className="mt-0.5 h-5 w-5 shrink-0 text-rose-hot" /> : <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-gold" />}
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{f.title}</p>
          <p className="mt-0.5 text-xs text-ink-400">
            <Link href={`/admin/users/${f.user.id}`} className="hover:text-lime-glow">{f.user.name}</Link> · {f.user.email} · {fmtDate(f.createdAt, true)}{f.page ? ` · from ${f.page}` : ''}
          </p>
        </div>
        <Badge color={STATUS[f.status].color}>{STATUS[f.status].label}</Badge>
        <span className="font-mono text-xs text-gold">+{f.points} pts</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-ink-200">{f.message}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Input className="h-9 min-w-48 flex-1 text-xs" placeholder="Note shown to the organiser (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
        {(['REVIEWED', 'RESOLVED', 'REJECTED'] as Status[]).filter((s) => s !== f.status).map((s) => (
          <Button key={s} size="sm" variant={s === 'REJECTED' ? 'danger' : s === 'RESOLVED' ? 'primary' : 'secondary'} loading={busy === s} disabled={!!busy} onClick={() => set(s)}>
            {s === 'REVIEWED' ? 'Mark reviewed' : s === 'RESOLVED' ? 'Resolve' : 'Reject as spam'}
          </Button>
        ))}
      </div>
    </Card>
  )
}
