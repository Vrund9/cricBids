'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { CalendarDays, MapPin, Plus, Radio, Trophy, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, Button, EmptyState, Field, Input, Modal, PageLoader, Select, StatusBadge, stagger, fadeUp } from '@/components/ui'
import { Tour } from '@/components/tour'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { CURRENCIES, moneyShort } from '@/lib/format'
import type { TournamentSummary } from '@/lib/types'

export default function Dashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<TournamentSummary[] | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', venue: '', auctionDate: '', currency: 'INR' })
  const [creating, setCreating] = useState(false)

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
    setCreating(true)
    try {
      const t = await api<{ id: string }>('/tournaments', {
        body: { name: form.name, venue: form.venue || undefined, currency: form.currency, auctionDate: form.auctionDate ? new Date(form.auctionDate).toISOString() : undefined },
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
            icon={<Trophy className="h-6 w-6" />}
            title="Create your first auction"
            action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New auction</Button>}
          >
            Name your tournament, bring in players from Excel or a registration link, and you’re ready to go live.
          </EmptyState>
        </div>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-tour="tournaments">
          {items.map((t) => (
            <motion.div key={t.id} variants={fadeUp} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
              <Link href={t.status === 'LIVE' || t.status === 'PAUSED' ? `/t/${t.id}/auction` : `/t/${t.id}`} className="card group block h-full p-5 hover:border-white/15">
                <div className="flex items-start justify-between gap-3">
                  <Avatar src={t.logoUrl} name={t.name} size={48} rounded="xl" color="#222c41" />
                  <StatusBadge status={t.status} />
                </div>
                <h2 className="mt-4 line-clamp-2 font-display text-xl font-semibold group-hover:text-lime-glow">{t.name}</h2>
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
                    {t.registrationOpen && <span className="inline-flex items-center gap-1 rounded-full bg-sky-live/10 px-2 py-0.5 text-sky-live"><Users className="h-3 w-3" /> Registrations open</span>}
                  </div>
                )}
              </Link>
            </motion.div>
          ))}
        </motion.div>
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
          <Field label="Tournament name" htmlFor="tname">
            <Input id="tname" autoFocus required minLength={2} maxLength={100} placeholder="e.g. Gully Premier League 2026" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Venue (optional)" htmlFor="venue">
              <Input id="venue" placeholder="City or ground" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
            </Field>
            <Field label="Auction date (optional)" htmlFor="date">
              <Input id="date" type="datetime-local" value={form.auctionDate} onChange={(e) => setForm({ ...form, auctionDate: e.target.value })} />
            </Field>
          </div>
          <Field label="Currency" htmlFor="cur" hint="Use “PTS” for points-based auctions.">
            <Select id="cur" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={creating}>Create &amp; add players</Button>
        </form>
      </Modal>
    </main>
  )
}
