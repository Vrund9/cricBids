'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { CalendarDays, ImagePlus, LayoutGrid, List, Loader2, MapPin, Plus, Radio, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, Button, EmptyState, Field, Input, Modal, PageLoader, Select, StatusBadge, stagger, fadeUp } from '@/components/ui'
import { Tour } from '@/components/tour'
import { CricketScene } from '@/components/cricket-scene'
import { api, uploadImage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { CURRENCIES, moneyShort } from '@/lib/format'
import type { TournamentSummary } from '@/lib/types'
import { cn } from '@/lib/cn'

export default function Dashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<TournamentSummary[] | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', venue: '', auctionDate: '', currency: 'INR', logoUrl: '' })
  const [creating, setCreating] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    api<TournamentSummary[]>('/tournaments')
      .then(setItems)
      .catch((e) => {
        toast.error(e.message)
        setItems([])
      })
  }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.auctionDate) return toast.error('Pick the auction date')
    setCreating(true)
    try {
      const t = await api<{ id: string }>('/tournaments', {
        body: { name: form.name, venue: form.venue || undefined, currency: form.currency, auctionDate: new Date(form.auctionDate).toISOString(), logoUrl: form.logoUrl || undefined },
      })
      router.push(`/t/${t.id}`)
    } catch (err) {
      toast.error((err as Error).message)
      setCreating(false)
    }
  }

  if (!items) return <PageLoader />

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-300">Hey {user?.name.split(' ')[0]} 👋</p>
          <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Your tournaments</h1>
        </div>
        <Button onClick={() => setOpen(true)} size="lg" data-tour="new-auction">
          <Plus className="h-4 w-4" /> New auction
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="mt-10" data-tour="tournaments">
          <EmptyState
            art={<CricketScene variant="six" />}
            title="Create your first auction"
            action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New auction</Button>}
          >
            Name your tournament, bring in players from Excel or a registration link, and you’re ready to go live.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-8" data-tour="tournaments">
          <TournamentBrowser items={items} />
        </div>
      )}

      <Tour
        id="dashboard"
        onlyNewUsers
        steps={[
          { title: `Welcome to BidWicket, ${user?.name.split(' ')[0] ?? 'there'}! 🏏`, body: 'Here’s a 30-second tour of how to run your first player auction.' },
          { target: 'new-auction', title: 'Start a new auction', body: 'Name your tournament here. Then add players, set the rules and go live — BidWicket guides you through each step.' },
          { target: 'tournaments', title: 'Your tournaments', body: items.length ? 'Each card shows players, teams and money spent. Click one to manage it.' : 'Your tournaments will show up here once you create one.' },
          { target: 'account-menu', title: 'Your account', body: 'Change your photo and password, or replay this tour any time from here.' },
        ]}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="New auction">
        <form onSubmit={create} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar src={form.logoUrl || null} name={form.name || 'T'} size={64} rounded="xl" color="#222c41" />
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/5">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {uploading ? 'Uploading…' : form.logoUrl ? 'Change picture' : 'Tournament picture'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (!file) return
                    setUploading(true)
                    try {
                      const url = await uploadImage(file)
                      setForm((f) => ({ ...f, logoUrl: url }))
                    } catch (err) {
                      toast.error((err as Error).message)
                    } finally {
                      setUploading(false)
                    }
                  }}
                />
              </label>
              {form.logoUrl && (
                <button type="button" className="rounded-lg p-2 text-ink-400 hover:bg-white/5 hover:text-white" onClick={() => setForm((f) => ({ ...f, logoUrl: '' }))} aria-label="Remove picture">
                  <X className="h-4 w-4" />
                </button>
              )}
              <p className="w-full text-xs text-ink-400">Optional — logo or poster, shown on the live screen and registration form.</p>
            </div>
          </div>
          <Field label="Tournament name" htmlFor="tname">
            <Input id="tname" autoFocus required minLength={2} maxLength={100} placeholder="e.g. Gully Premier League 2026" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Venue (optional)" htmlFor="venue">
              <Input id="venue" placeholder="City or ground" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
            </Field>
            <Field label="Auction date" htmlFor="date">
              <Input id="date" type="datetime-local" required value={form.auctionDate} onChange={(e) => setForm({ ...form, auctionDate: e.target.value })} />
            </Field>
          </div>
          <Field label="Currency" htmlFor="cur" hint="Use “PTS” for points-based auctions.">
            <Select id="cur" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={creating} disabled={uploading}>Create &amp; add players</Button>
        </form>
      </Modal>
    </main>
  )
}

type Filter = 'all' | 'live' | 'upcoming' | 'completed'
type View = 'cards' | 'list'

const FILTERS: { id: Filter; label: string; match: (t: TournamentSummary) => boolean }[] = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'live', label: 'Live', match: (t) => t.status === 'LIVE' || t.status === 'PAUSED' },
  { id: 'upcoming', label: 'Upcoming', match: (t) => t.status === 'DRAFT' || t.status === 'READY' },
  { id: 'completed', label: 'Completed', match: (t) => t.status === 'COMPLETED' },
]

/** Live auctions first, then upcoming by date, then completed (newest first). */
const RANK: Record<TournamentSummary['status'], number> = { LIVE: 0, PAUSED: 0, READY: 1, DRAFT: 1, COMPLETED: 2 }
const when = (t: TournamentSummary) => new Date(t.auctionDate ?? t.updatedAt)

const hrefOf = (t: TournamentSummary) => (t.status === 'LIVE' || t.status === 'PAUSED' ? `/t/${t.id}/auction` : `/t/${t.id}`)

/** Tournaments grouped by year, filterable by state, as cards or a compact list. */
function TournamentBrowser({ items }: { items: TournamentSummary[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [view, setView] = useState<View>('cards')
  useEffect(() => {
    try {
      const v = localStorage.getItem('cricbid.dash-view')
      if (v === 'list' || v === 'cards') setView(v)
    } catch {}
  }, [])
  const choose = (v: View) => {
    setView(v)
    try {
      localStorage.setItem('cricbid.dash-view', v)
    } catch {}
  }

  const years = useMemo(() => {
    const match = FILTERS.find((f) => f.id === filter)!.match
    const rows = items.filter(match).sort((a, b) => RANK[a.status] - RANK[b.status] || (RANK[a.status] === 2 ? when(b).getTime() - when(a).getTime() : when(a).getTime() - when(b).getTime()))
    const byYear = new Map<number, TournamentSummary[]>()
    for (const t of rows) byYear.set(when(t).getFullYear(), [...(byYear.get(when(t).getFullYear()) ?? []), t])
    return [...byYear.entries()].sort((a, b) => b[0] - a[0])
  }, [items, filter])

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03] p-1" role="tablist" aria-label="Filter tournaments">
          {FILTERS.map((f) => {
            const n = items.filter(f.match).length
            return (
              <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)} className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors', filter === f.id ? 'bg-lime-bright text-on-accent' : 'text-ink-300 hover:bg-white/5 hover:text-white')}>
                {f.id === 'live' && n > 0 && <span className="h-1.5 w-1.5 rounded-full bg-rose-hot" />}
                {f.label} <span className={cn('text-[11px]', filter === f.id ? 'opacity-70' : 'text-ink-400')}>{n}</span>
              </button>
            )
          })}
        </div>
        <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1" role="group" aria-label="View">
          {([['cards', LayoutGrid, 'Card view'], ['list', List, 'List view']] as const).map(([v, Icon, label]) => (
            <button key={v} onClick={() => choose(v)} aria-pressed={view === v} aria-label={label} title={label} className={cn('grid h-8 w-9 place-items-center rounded-lg transition-colors', view === v ? 'bg-white/10 text-white' : 'text-ink-400 hover:text-white')}>
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {years.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-ink-400">No {filter === 'all' ? '' : FILTERS.find((f) => f.id === filter)!.label.toLowerCase()} tournaments.</p>}

      {years.map(([year, rows]) => (
        <section key={year}>
          <h2 className="mb-3 flex items-baseline gap-3 font-display text-2xl font-bold">
            {year} <span className="text-sm font-normal text-ink-400">{rows.length} auction{rows.length === 1 ? '' : 's'}</span>
          </h2>
          {view === 'cards' ? (
            <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((t) => <TournamentCard key={t.id} t={t} />)}
            </motion.div>
          ) : (
            <div className="card divide-y divide-white/5 overflow-hidden">
              {rows.map((t) => (
                <Link key={t.id} href={hrefOf(t)} className="flex items-center gap-4 px-4 py-3 transition hover:bg-white/[0.03]">
                  <Avatar src={t.logoUrl} name={t.name} size={40} rounded="xl" color="#222c41" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{t.name}</p>
                    <p className="truncate text-xs text-ink-400">
                      {t.auctionDate ? new Date(t.auctionDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'No date'}{t.venue ? ` · ${t.venue}` : ''}
                    </p>
                  </div>
                  <span className="hidden w-24 text-right text-sm text-ink-300 sm:block">{t.players} players</span>
                  <span className="hidden w-20 text-right text-sm text-ink-300 md:block">{t.teams} teams</span>
                  <span className="hidden w-20 text-right font-mono text-sm text-gold sm:block">{t.sold ? moneyShort(t.totalSpent, t.currency) : '—'}</span>
                  <span className="w-24 text-right"><StatusBadge status={t.status} /></span>
                </Link>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}

function TournamentCard({ t }: { t: TournamentSummary }) {
  return (
    <motion.div variants={fadeUp} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
      <Link href={hrefOf(t)} className="card group block h-full p-5 hover:border-white/15">
        <div className="flex items-start justify-between gap-3">
          <Avatar src={t.logoUrl} name={t.name} size={48} rounded="xl" color="#222c41" />
          <StatusBadge status={t.status} />
        </div>
        <h3 className="mt-4 line-clamp-2 font-display text-xl font-semibold group-hover:text-lime-glow">{t.name}</h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-400">
          {t.venue && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {t.venue}</span>}
          {t.auctionDate && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {new Date(t.auctionDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/5 pt-4 text-center">
          <div>
            <p className="font-display text-lg font-bold">{t.players}</p>
            <p className="text-[11px] text-ink-400">players</p>
          </div>
          <div>
            <p className="font-display text-lg font-bold">{t.teams}</p>
            <p className="text-[11px] text-ink-400">teams</p>
          </div>
          <div>
            <p className="font-display text-lg font-bold text-gold">{t.sold ? moneyShort(t.totalSpent, t.currency) : '—'}</p>
            <p className="text-[11px] text-ink-400">{t.sold} sold</p>
          </div>
        </div>
        {(t.status === 'LIVE' || t.registrationOpen) && (
          <div className="mt-4 flex gap-2 text-[11px]">
            {t.status === 'LIVE' && <span className="inline-flex items-center gap-1 rounded-full bg-lime-glow/10 px-2 py-0.5 text-lime-glow"><Radio className="h-3 w-3" /> Auction live</span>}
            {t.registrationOpen && t.status !== 'COMPLETED' && <span className="inline-flex items-center gap-1 rounded-full bg-sky-live/10 px-2 py-0.5 text-sky-live"><Users className="h-3 w-3" /> Registrations open</span>}
          </div>
        )}
      </Link>
    </motion.div>
  )
}
