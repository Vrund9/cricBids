'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { CreditCard, ExternalLink, Gavel, Radio, Trophy, UserPlus, Users, Wallet } from 'lucide-react'
import { AdminHeader, BarChart, StatCard } from '@/components/admin'
import { Avatar, Badge, Card, EmptyState, PageLoader, StatusBadge } from '@/components/ui'
import { money, timeAgo } from '@/lib/format'
import { AdminOverview, PAYMENT_KIND_LABEL, PAYMENT_SOURCE_META, useAdmin } from '@/lib/admin'

export default function AdminOverviewPage() {
  const { data, error, reload } = useAdmin<AdminOverview>('/admin/overview')

  // Keep the "live now" list fresh while the page is open.
  useEffect(() => {
    const t = setInterval(reload, 15_000)
    return () => clearInterval(t)
  }, [reload])

  if (error && !data) return <EmptyState title="Couldn’t load the overview">{error}</EmptyState>
  if (!data) return <PageLoader />

  const s = data.tournaments.byStatus
  return (
    <>
      <AdminHeader
        title="Overview"
        subtitle={<>Everything happening on CricBid. Billing mode: <b className={data.billingMode === 'demo' ? 'text-gold' : 'text-white'}>{data.billingMode}</b></>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Users" value={data.users.total.toLocaleString()} hint={`+${data.users.new7d} this week · +${data.users.new30d} in 30 days`} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Paid users" value={data.paid.users.toLocaleString()} hint={`${data.paid.seasonPasses} Season Passes · ${data.paid.proTournaments} Pro tournaments`} icon={<Wallet className="h-5 w-5" />} accent="#ffb020" />
        <StatCard label="Revenue" value={money(data.revenue.total)} hint={`${money(data.revenue.last30d)} in 30 days · ${data.revenue.payments30d} activations`} icon={<CreditCard className="h-5 w-5" />} accent="#38bdf8" />
        <StatCard label="Tournaments" value={data.tournaments.total.toLocaleString()} hint={`+${data.tournaments.new30d} in 30 days · ${data.players.toLocaleString()} players · ${data.bids.toLocaleString()} bids`} icon={<Trophy className="h-5 w-5" />} accent="#a78bfa" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5"><BarChart label="New sign-ups" data={data.charts.signups} /></Card>
        <Card className="p-5"><BarChart label="Tournaments created" data={data.charts.tournaments} color="#a78bfa" /></Card>
      </div>

      <Card className="mt-4 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold"><Radio className="h-4 w-4 text-rose-hot" /> Live right now</h2>
          <div className="flex flex-wrap gap-2 text-xs text-ink-300">
            {['DRAFT', 'READY', 'LIVE', 'PAUSED', 'COMPLETED'].map((k) => (
              <span key={k} className="rounded-lg bg-white/[0.04] px-2 py-1">{k.toLowerCase()}: <b className="text-white">{s[k] ?? 0}</b></span>
            ))}
          </div>
        </div>
        {data.live.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-400">No auctions are live at the moment. This list refreshes every 15 seconds.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.live.map((t) => (
              <div key={t.id} className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{t.name}</p>
                    <StatusBadge status={t.status} />
                    {t.plan === 'PRO' && <Badge color="#ffb020">Pro</Badge>}
                  </div>
                  <p className="mt-1 truncate text-xs text-ink-400">
                    {t.owner.name} · {t._count.teams} teams · {t._count.players} players · {t._count.bids} bids
                    {t.state?.startedAt && ` · started ${timeAgo(t.state.startedAt)}`}
                  </p>
                </div>
                <a href={`/live/${t.liveToken}`} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/5">
                  Watch <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold"><UserPlus className="h-4 w-4 text-lime-glow" /> Newest users</h2>
            <Link href="/admin/users" className="text-xs text-ink-300 hover:text-white">View all</Link>
          </div>
          <div className="divide-y divide-white/5">
            {data.recentUsers.map((u) => (
              <Link key={u.id} href={`/admin/users/${u.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/[0.03]">
                <Avatar src={u.avatarUrl} name={u.name} size={34} color="#34405a" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="truncate text-xs text-ink-400">{u.email}</p>
                </div>
                {u.google && <Badge color="#38bdf8">Google</Badge>}
                <span className="shrink-0 text-xs text-ink-400">{timeAgo(u.createdAt)}</span>
              </Link>
            ))}
            {data.recentUsers.length === 0 && <p className="py-6 text-center text-sm text-ink-400">No users yet.</p>}
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold"><Gavel className="h-4 w-4 text-gold" /> Latest upgrades</h2>
            <Link href="/admin/payments" className="text-xs text-ink-300 hover:text-white">View all</Link>
          </div>
          <div className="divide-y divide-white/5">
            {data.recentPayments.map((p) => (
              <Link key={p.id} href={`/admin/users/${p.user.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/[0.03]">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{PAYMENT_KIND_LABEL[p.kind]}{p.tournament && <span className="text-ink-400"> · {p.tournament.name}</span>}</p>
                  <p className="truncate text-xs text-ink-400">{p.user.email}</p>
                </div>
                <Badge color={PAYMENT_SOURCE_META[p.source].color}>{PAYMENT_SOURCE_META[p.source].label}</Badge>
                <span className="w-16 shrink-0 text-right text-sm font-semibold">{money(p.amount, p.currency)}</span>
              </Link>
            ))}
            {data.recentPayments.length === 0 && <p className="py-6 text-center text-sm text-ink-400">No upgrades yet.</p>}
          </div>
        </Card>
      </div>
    </>
  )
}
