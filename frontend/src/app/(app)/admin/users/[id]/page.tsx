'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Ban, CalendarPlus, ExternalLink, ShieldCheck, ShieldOff, Trash2, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog, fmtDate } from '@/components/admin'
import { Avatar, Badge, Button, Card, EmptyState, PageLoader, Select, StatusBadge } from '@/components/ui'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { money, timeAgo } from '@/lib/format'
import { AdminUserDetail, PAYMENT_KIND_LABEL, PAYMENT_SOURCE_META, actionLabel, useAdmin } from '@/lib/admin'

type Pending = null | 'suspend' | 'unsuspend' | 'promote' | 'demote' | 'grant' | 'revoke' | 'delete'

export default function AdminUserPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me } = useAuth()
  const { data: u, error, setData, reload } = useAdmin<AdminUserDetail>(`/admin/users/${id}`)
  const [pending, setPending] = useState<Pending>(null)
  const [busy, setBusy] = useState(false)
  const [months, setMonths] = useState('12')

  if (error && !u) return <EmptyState title="Couldn’t load this user">{error}</EmptyState>
  if (!u) return <PageLoader />
  const isMe = me?.id === u.id

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true)
    try {
      await fn()
      toast.success(success)
      setPending(null)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const patch = (body: Record<string, unknown>, msg: string) => run(async () => setData(await api<AdminUserDetail>(`/admin/users/${id}`, { method: 'PATCH', body })), msg)
  const pass = (body: Record<string, unknown>, msg: string) => run(async () => setData(await api<AdminUserDetail>(`/admin/users/${id}/season-pass`, { body })), msg)
  const setPlan = (tid: string, plan: 'FREE' | 'PRO') =>
    run(async () => {
      await api(`/admin/tournaments/${tid}/plan`, { method: 'PATCH', body: { plan } })
      reload()
    }, plan === 'PRO' ? 'Tournament upgraded to Pro' : 'Tournament moved to Free')

  return (
    <>
      <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-300 hover:text-white"><ArrowLeft className="h-4 w-4" /> All users</Link>

      <Card className="p-6">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar src={u.avatarUrl} name={u.name} size={72} color="#34405a" />
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-bold">
              {u.name}
              {u.isAdmin && <Badge color="#c8ff2e">Admin{u.adminViaEnv && ' (env)'}</Badge>}
              {u.suspendedAt && <Badge color="#ff4d6d">Suspended</Badge>}
              {u.seasonPassActive && <Badge color="#ffb020">Season Pass</Badge>}
            </h1>
            <p className="mt-1 text-sm text-ink-300">{u.email}</p>
            <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
              <Info label="Joined" value={fmtDate(u.createdAt)} />
              <Info label="Last login" value={u.lastLoginAt ? timeAgo(u.lastLoginAt) : '—'} />
              <Info label="Sign-in" value={[u.google && 'Google', u.hasPassword && 'Email'].filter(Boolean).join(' + ') || '—'} />
              <Info label="Season Pass" value={u.seasonPassActive ? `until ${fmtDate(u.seasonPassUntil)}` : u.seasonPassUntil ? `expired ${fmtDate(u.seasonPassUntil)}` : 'None'} />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-white/5 pt-5">
          <div className="flex items-center gap-2">
            <Select value={months} onChange={(e) => setMonths(e.target.value)} className="h-10 w-32">
              <option value="1">1 month</option>
              <option value="3">3 months</option>
              <option value="6">6 months</option>
              <option value="12">12 months</option>
            </Select>
            <Button variant="gold" onClick={() => setPending('grant')}><CalendarPlus className="h-4 w-4" /> {u.seasonPassActive ? 'Extend' : 'Grant'} Season Pass</Button>
          </div>
          {u.seasonPassActive && <Button variant="outline" onClick={() => setPending('revoke')}>Revoke pass</Button>}
          {!isMe && (u.isAdmin
            ? !u.adminViaEnv && <Button variant="outline" onClick={() => setPending('demote')}><ShieldOff className="h-4 w-4" /> Remove admin</Button>
            : <Button variant="outline" onClick={() => setPending('promote')}><ShieldCheck className="h-4 w-4" /> Make admin</Button>)}
          {!isMe && (u.suspendedAt
            ? <Button variant="secondary" onClick={() => setPending('unsuspend')}><UserCheck className="h-4 w-4" /> Reactivate</Button>
            : <Button variant="danger" onClick={() => setPending('suspend')}><Ban className="h-4 w-4" /> Suspend</Button>)}
          {!isMe && !u.adminViaEnv && <Button variant="danger" className="ml-auto" onClick={() => setPending('delete')}><Trash2 className="h-4 w-4" /> Delete user</Button>}
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="mb-3 font-semibold">Tournaments ({u.tournamentsList.length})</h2>
        {u.tournamentsList.length === 0 ? <p className="py-4 text-sm text-ink-400">No tournaments yet.</p> : (
          <div className="divide-y divide-white/5">
            {u.tournamentsList.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate font-medium">{t.name} <StatusBadge status={t.status} /></p>
                  <p className="text-xs text-ink-400">{t._count.teams} teams · {t._count.players} players · created {fmtDate(t.createdAt)}</p>
                </div>
                <a href={`/live/${t.liveToken}`} target="_blank" rel="noreferrer" className="text-xs text-ink-300 hover:text-white"><ExternalLink className="h-4 w-4" /></a>
                <Select value={t.plan} disabled={busy} onChange={(e) => setPlan(t.id, e.target.value as 'FREE' | 'PRO')} className="h-9 w-28">
                  <option value="FREE">Free</option>
                  <option value="PRO">Pro</option>
                </Select>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Payments & upgrades ({u.paymentsList.length})</h2>
          {u.paymentsList.length === 0 ? <p className="py-4 text-sm text-ink-400">No upgrades yet.</p> : (
            <div className="divide-y divide-white/5">
              {u.paymentsList.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{PAYMENT_KIND_LABEL[p.kind]}{p.tournament && <span className="text-ink-400"> · {p.tournament.name}</span>}</p>
                    <p className="text-xs text-ink-400">{fmtDate(p.createdAt, true)}{p.note && ` · ${p.note}`}</p>
                  </div>
                  <Badge color={PAYMENT_SOURCE_META[p.source].color}>{PAYMENT_SOURCE_META[p.source].label}</Badge>
                  <span className="w-16 text-right font-semibold">{money(p.amount, p.currency)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Admin activity on this user</h2>
          {u.activity.length === 0 ? <p className="py-4 text-sm text-ink-400">No admin changes yet.</p> : (
            <div className="divide-y divide-white/5">
              {u.activity.map((a) => (
                <div key={a.id} className="py-2.5 text-sm">
                  <p>{actionLabel(a.action)}</p>
                  <p className="text-xs text-ink-400">by {a.actorEmail} · {fmtDate(a.createdAt, true)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog open={pending === 'grant'} title={`${u.seasonPassActive ? 'Extend' : 'Grant'} Season Pass`} confirmLabel="Grant" loading={busy} onClose={() => setPending(null)}
        onConfirm={() => pass({ action: 'grant', months: Number(months) }, 'Season Pass granted')}>
        <p>Give <b className="text-white">{u.email}</b> Pro on every tournament for <b className="text-white">{months} month{months === '1' ? '' : 's'}</b>{u.seasonPassActive && ', added to their current pass'}. This is logged as an admin grant (₹0).</p>
      </ConfirmDialog>
      <ConfirmDialog open={pending === 'revoke'} title="Revoke Season Pass" confirmLabel="Revoke" danger loading={busy} onClose={() => setPending(null)}
        onConfirm={() => pass({ action: 'revoke' }, 'Season Pass revoked')}>
        <p>Their tournaments drop back to Free immediately, unless a tournament was upgraded to Pro on its own.</p>
      </ConfirmDialog>
      <ConfirmDialog open={pending === 'promote'} title="Make admin" confirmLabel="Make admin" loading={busy} onClose={() => setPending(null)}
        onConfirm={() => patch({ isAdmin: true }, 'User is now an admin')}>
        <p><b className="text-white">{u.email}</b> will be able to see all users and payments, change plans and settings, and suspend or delete accounts.</p>
      </ConfirmDialog>
      <ConfirmDialog open={pending === 'demote'} title="Remove admin" confirmLabel="Remove admin" danger loading={busy} onClose={() => setPending(null)}
        onConfirm={() => patch({ isAdmin: false }, 'Admin access removed')}>
        <p>{u.name} will lose access to the admin panel.</p>
      </ConfirmDialog>
      <ConfirmDialog open={pending === 'suspend'} title="Suspend user" confirmLabel="Suspend" danger loading={busy} onClose={() => setPending(null)}
        onConfirm={() => patch({ suspended: true }, 'User suspended')}>
        <p>{u.name} is signed out everywhere and can’t log in until reactivated. Their tournaments and live links keep working.</p>
      </ConfirmDialog>
      <ConfirmDialog open={pending === 'unsuspend'} title="Reactivate user" confirmLabel="Reactivate" loading={busy} onClose={() => setPending(null)}
        onConfirm={() => patch({ suspended: false }, 'User reactivated')}>
        <p>{u.name} will be able to log in again.</p>
      </ConfirmDialog>
      <ConfirmDialog open={pending === 'delete'} title="Delete user permanently" confirmLabel="Delete forever" danger loading={busy} requireText={u.email} onClose={() => setPending(null)}
        onConfirm={() => run(async () => { await api(`/admin/users/${id}`, { method: 'DELETE' }); router.replace('/admin/users') }, 'User deleted')}>
        <p>This deletes <b className="text-white">{u.email}</b> and all <b className="text-white">{u.tournamentsList.length} tournaments</b> they own, including teams, players, bids and payment history. <b className="text-rose-hot">This can’t be undone.</b></p>
      </ConfirmDialog>
    </>
  )
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-ink-400">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  )
}
