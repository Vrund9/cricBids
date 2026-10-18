'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Check, Copy, KeyRound, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { AdminHeader, Table, fmtDate } from '@/components/admin'
import { Badge, Button, Card, EmptyState, Field, Input, PageLoader } from '@/components/ui'
import { useCopy } from '@/components/share'
import { api } from '@/lib/api'
import { AdminPlanCode, useAdmin } from '@/lib/admin'
import { useConfirm } from '@/components/confirm'

/**
 * Plan codes give one account full access for free — for early customers and exceptions.
 * Each code works for a single account; revoking it takes the access away again.
 */
export default function AdminPlanCodesPage() {
  const { data, error, reload } = useAdmin<AdminPlanCode[]>('/admin/plan-codes')
  const [form, setForm] = useState({ code: '', note: '' })
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const confirm = useConfirm()

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const row = await api<AdminPlanCode>('/admin/plan-codes', { body: { code: form.code || undefined, note: form.note || undefined } })
      toast.success(`Code ${row.code} created`)
      setForm({ code: '', note: '' })
      reload()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setCreating(false)
    }
  }
  const act = async (c: AdminPlanCode, action: 'revoke' | 'restore') => {
    if (action === 'revoke' && !(await confirm({ title: `Revoke ${c.code}?`, message: c.redeemedBy ? `${c.redeemedBy.name} loses full access straight away. You can restore the code later.` : 'Nobody can redeem this code after it’s revoked.', confirmLabel: 'Revoke code', danger: true }))) return
    setBusy(c.id)
    try {
      await api(`/admin/plan-codes/${c.id}/${action}`, { body: {} })
      toast.success(action === 'revoke' ? 'Code revoked' : 'Code restored')
      reload()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <AdminHeader title="Plan codes" subtitle="One-time codes that unlock everything for a single account. Revoke a code to take the access back." />
      <Card className="mb-6 p-5">
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)_auto] sm:items-end">
          <Field label="Code" hint="Leave empty to generate one">
            <Input placeholder="BW-XXXX-XXXX" className="uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} maxLength={40} />
          </Field>
          <Field label="Who it’s for (note)">
            <Input placeholder="e.g. Early customer — Surat Super Cup organiser" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={200} />
          </Field>
          <Button type="submit" loading={creating}><Plus className="h-4 w-4" /> Create code</Button>
        </form>
      </Card>
      {error && !data ? (
        <EmptyState title="Couldn’t load codes">{error}</EmptyState>
      ) : !data ? (
        <PageLoader />
      ) : data.length === 0 ? (
        <EmptyState icon={<KeyRound className="h-6 w-6" />} title="No plan codes yet">Create one above and send it to the organiser. They enter it on their account page.</EmptyState>
      ) : (
        <Table head={['Code', 'Note', 'Used by', 'Status', '']}>
          {data.map((c) => (
            <tr key={c.id} className="hover:bg-white/[0.02]">
              <td className="px-4 py-3"><CodeCell code={c.code} /></td>
              <td className="max-w-56 truncate px-4 py-3 text-xs text-ink-300">{c.note ?? '—'}</td>
              <td className="px-4 py-3">
                {c.redeemedBy ? (
                  <Link href={`/admin/users/${c.redeemedBy.id}`} className="hover:text-lime-glow">
                    <p className="max-w-48 truncate text-sm">{c.redeemedBy.name}</p>
                    <p className="text-xs text-ink-400">{fmtDate(c.redeemedAt)}</p>
                  </Link>
                ) : (
                  <span className="text-xs text-ink-400">Not used yet</span>
                )}
              </td>
              <td className="px-4 py-3">{c.revokedAt ? <Badge color="#ff4d6d">Revoked</Badge> : c.redeemedBy ? <Badge color="#22c55e">Active</Badge> : <Badge color="#38bdf8">Unused</Badge>}</td>
              <td className="px-4 py-3 text-right">
                <Button size="sm" variant={c.revokedAt ? 'secondary' : 'danger'} loading={busy === c.id} onClick={() => act(c, c.revokedAt ? 'restore' : 'revoke')}>
                  {c.revokedAt ? 'Restore' : 'Revoke'}
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  )
}

function CodeCell({ code }: { code: string }) {
  const { copied, copy } = useCopy()
  return (
    <button onClick={() => copy(code, 'Code copied')} className="inline-flex items-center gap-2 font-mono text-sm font-semibold hover:text-lime-glow">
      {code} {copied ? <Check className="h-3.5 w-3.5 text-lime-glow" /> : <Copy className="h-3.5 w-3.5 text-ink-400" />}
    </button>
  )
}
