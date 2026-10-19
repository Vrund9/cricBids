'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Check, ClipboardList, Crown, FileDown, FileSpreadsheet, Gavel, ImagePlus, ListChecks, Pencil, Radio, Shield, Trash2, Trophy, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CategoryModePicker, type CategoryChoice } from '@/components/categories'
import { useTournament } from '@/components/tournament-context'
import { Avatar, Button, Card, Field, Input, Modal, Select, Textarea, fadeUp, stagger } from '@/components/ui'
import { ShareLink } from '@/components/share'
import { Tour } from '@/components/tour'
import { PlanCard } from '@/components/upgrade'
import { CricketScene } from '@/components/cricket-scene'
import { api, SITE_URL, uploadImage } from '@/lib/api'
import { exportResults } from '@/lib/excel'
import { CURRENCIES, money, moneyShort, tintText } from '@/lib/format'
import type { Player, Team, Tournament } from '@/lib/types'
import { cn } from '@/lib/cn'
import { useConfirm } from '@/components/confirm'

export default function Overview() {
  const { t } = useTournament()
  return t.status === 'COMPLETED' ? <CompletedOverview /> : <SetupOverview />
}

// ───────────────────────── Before / during the auction ─────────────────────────

function SetupOverview() {
  const { t, update } = useTournament()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const base = `/t/${t.id}`
  const origin = typeof window !== 'undefined' ? window.location.origin : SITE_URL
  const liveUrl = `${origin}/live/${t.liveToken}`
  const regUrl = `${origin}/register/${t.registrationToken}`

  // Players arrive by Excel, the registration link or by hand — one step, three ways.
  const steps = [
    {
      done: t.stats.players > 0,
      icon: Users,
      title: 'Add players',
      text: t.stats.players
        ? `${t.stats.players} players · ${t.stats.fromForm} registered themselves · ${t.stats.fromExcel} from Excel`
        : 'Upload your Excel, or share the registration link and let players sign up',
      links: [
        { href: `${base}/players#import`, label: 'Upload Excel' },
        { href: `${base}/registration`, label: 'Registration link' },
      ],
    },
    {
      done: t.setupComplete,
      icon: ListChecks,
      title: 'Set the auction rules',
      text: t.setupComplete ? `${t.teams.length} teams · ${money(t.teamPurse, t.currency)} purse · base ${money(t.basePrice, t.currency)}` : 'Teams, purse, base price, squad size, order',
      links: [{ href: `${base}/setup`, label: t.setupComplete ? 'Review' : 'Start' }],
    },
    {
      done: t.teams.length >= 2 && t.teams.some((x) => !/^Team \d+$/.test(x.name)),
      optional: true,
      icon: Shield,
      title: 'Name teams & add logos',
      text: `${t.teams.length} teams`,
      links: [{ href: `${base}/teams`, label: 'Edit teams' }],
    },
  ]
  const required = steps.filter((s) => !s.optional)
  const ready = required.every((s) => s.done) && t.teams.length >= 2 && t.stats.available > 0
  const progress = Math.round((steps.filter((s) => s.done).length / steps.length) * 100)
  const running = t.status === 'LIVE' || t.status === 'PAUSED'

  // minmax(0,…) + min-w-0: long share links must truncate, not widen the columns past the screen.
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-6">
        <Card className="overflow-hidden" data-tour="checklist">
          <div className="flex items-center justify-between gap-4 border-b border-white/5 p-6">
            <div>
              <h2 className="font-display text-xl font-semibold">Launch checklist</h2>
              <p className="text-sm text-ink-400">{ready ? 'All set — you can go live whenever you’re ready.' : 'Three steps and you’re ready for auction day.'}</p>
            </div>
            <div className="relative h-14 w-14 shrink-0">
              <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" className="text-white/10" strokeWidth="3" />
                <motion.circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-lime-glow)" strokeWidth="3" strokeLinecap="round" strokeDasharray="97.4" initial={{ strokeDashoffset: 97.4 }} animate={{ strokeDashoffset: 97.4 - (97.4 * progress) / 100 }} transition={{ type: 'spring', stiffness: 60, damping: 18 }} />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-xs font-bold">{progress}%</span>
            </div>
          </div>
          <motion.ol variants={stagger} initial="hidden" animate="show" className="divide-y divide-white/5">
            {steps.map((s, i) => (
              <motion.li key={s.title} variants={fadeUp} className="flex flex-wrap items-center gap-4 p-5 sm:flex-nowrap">
                <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', s.done ? 'bg-lime-bright text-on-accent' : 'bg-white/5 text-ink-300')}>
                  {s.done ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    <span className="mr-1.5 text-ink-400">{i + 1}.</span>
                    {s.title} {s.optional && <span className="ml-1 text-xs font-normal text-ink-400">optional</span>}
                  </p>
                  <p className="text-sm text-ink-400 sm:truncate">{s.text}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {s.links.map((l) => (
                    <Link key={l.href} href={l.href} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-lime-glow hover:bg-lime-glow/10">
                      {l.label} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ))}
                </div>
              </motion.li>
            ))}
          </motion.ol>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 bg-white/[0.02] p-5">
            <p className="text-sm text-ink-300">{running ? 'Your auction is running.' : ready ? 'Everything checks out.' : 'Complete the required steps to start.'}</p>
            <Button data-tour="control-room" onClick={() => router.push(`${base}/auction`)} disabled={!ready && !running}>
              <Gavel className="h-4 w-4" /> Open control room
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['Players', t.stats.players],
            ['Ready to auction', t.stats.available],
            ['Sold', t.stats.sold],
            ['Pending approval', t.stats.pendingApproval],
          ].map(([label, value]) => (
            <Card key={label as string} className="p-4">
              <p className="text-xs text-ink-400">{label}</p>
              <p className="mt-1 font-display text-2xl font-bold">{value}</p>
            </Card>
          ))}
        </div>
      </div>

      <div className="min-w-0 space-y-6">
        <PlanCard />
        <Card className="p-6" data-tour="live-link">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-lime-glow" />
            <h3 className="font-semibold">Live auction link</h3>
          </div>
          <p className="mb-4 mt-1 text-sm text-ink-400">Projector, TV, team owners, players at home — everyone sees bids in realtime.</p>
          <ShareLink url={liveUrl} title={`${t.name} live`} message={`🏏 Watch the ${t.name} player auction LIVE`} />
        </Card>
        <Card className="p-6" data-tour="registration">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-sky-live" />
            <h3 className="font-semibold">Player registration</h3>
            <span className={cn('ml-auto text-xs font-semibold', t.registrationOpen ? 'text-lime-glow' : 'text-ink-400')}>{t.registrationOpen ? 'Open' : 'Closed'}</span>
          </div>
          {t.registrationOpen ? (
            <div className="mt-4">
              <ShareLink url={regUrl} title={`${t.name} registration`} message={`🏏 Register for ${t.name} player auction`} />
            </div>
          ) : (
            <Link href={`${base}/registration`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-sky-live">
              Open registrations <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </Card>
        <DetailsCard onEdit={() => setEditing(true)} />
      </div>

      <DetailsModal open={editing} onClose={() => setEditing(false)} update={update} />
      <Tour
        id="tournament"
        steps={[
          { target: 'tabs', title: 'Everything for this auction', body: 'Players (and their registration form), teams, auction rules, screen theme, the control room and results — all in these tabs.' },
          { target: 'checklist', title: 'Three steps to auction day', body: 'Add players, set the rules, name the teams. The ring fills up as you go, and the control room unlocks when the required ones are done.' },
          { target: 'registration', title: 'Let players register themselves', body: 'Share this link in your WhatsApp groups. Players fill in their name, role and photo and appear in your player list instantly.' },
          { target: 'live-link', title: 'The live auction link', body: 'Put this on the projector and send it to team owners and fans. Every screen updates in realtime during the auction.' },
          { target: 'control-room', title: 'Run auction day from here', body: 'When you’re ready, open the control room to start bidding, sell players and track every team’s purse.' },
        ]}
      />
    </div>
  )
}

// ───────────────────────── After the auction ─────────────────────────

interface Results {
  tournament: Tournament
  teams: Team[]
  players: Player[]
  bidCount: number
}

/** The auction is over: a read-only recap instead of a setup checklist. */
function CompletedOverview() {
  const { t } = useTournament()
  const base = `/t/${t.id}`
  const [r, setR] = useState<Results | null>(null)
  useEffect(() => {
    api<Results>(`/tournaments/${t.id}/auction/results`).then(setR).catch((e) => toast.error(e.message))
  }, [t.id])

  const sold = useMemo(() => (r?.players ?? []).filter((p) => p.status === 'SOLD').sort((a, b) => (b.soldPrice ?? 0) - (a.soldPrice ?? 0)), [r])
  const spent = sold.reduce((a, p) => a + (p.soldPrice ?? 0), 0)
  const teamRows = useMemo(() => {
    if (!r) return []
    return r.teams
      .map((team) => {
        const squad = sold.filter((p) => p.soldTeamId === team.id)
        return { team, count: squad.length, spent: squad.reduce((a, p) => a + (p.soldPrice ?? 0), 0) }
      })
      .sort((a, b) => b.spent - a.spent)
  }, [r, sold])
  const maxSpent = Math.max(1, ...teamRows.map((x) => x.spent))
  const cur = t.currency

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-6">
        <Card className="grain relative overflow-hidden p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <CricketScene variant="trophy" className="h-28 shrink-0" />
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Auction complete</p>
              <h2 className="mt-1 font-display text-3xl font-extrabold">{sold.length || t.stats.sold} players sold for {moneyShort(spent, cur)}</h2>
              <p className="mt-1 text-sm text-ink-400">
                {t.stats.unsold} unsold · {t.teams.length} teams{r ? ` · ${r.bidCount} bids` : ''}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
                <Link href={`${base}/results`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-lime-bright px-4 text-sm font-semibold text-on-accent hover:bg-lime-hover">
                  <Trophy className="h-4 w-4" /> View results
                </Link>
                <Button variant="secondary" disabled={!r} onClick={() => r && exportResults(r.players, r.teams, r.tournament)}>
                  <FileSpreadsheet className="h-4 w-4" /> Excel
                </Button>
                <a href={`/report/${t.id}`} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold hover:bg-white/5">
                  <FileDown className="h-4 w-4" /> PDF report
                </a>
              </div>
            </div>
          </div>
        </Card>

        {sold.length > 0 && (
          <Card className="p-6">
            <h3 className="mb-4 font-semibold">Top buys</h3>
            <motion.ol variants={stagger} initial="hidden" animate="show" className="grid gap-3 sm:grid-cols-3">
              {sold.slice(0, 3).map((p, i) => {
                const team = r?.teams.find((x) => x.id === p.soldTeamId)
                return (
                  <motion.li key={p.id} variants={fadeUp} className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center">
                    {i === 0 && <Crown className="absolute right-3 top-3 h-4 w-4 text-gold" />}
                    <Avatar src={p.photoUrl} name={p.name} size={56} rounded="xl" className="mx-auto" />
                    <p className="mt-2 truncate text-sm font-semibold">{p.name}</p>
                    <p className="truncate text-xs" style={{ color: team?.color && tintText(team.color) }}>{team?.name}</p>
                    <p className="mt-1 font-display text-xl font-black text-gold">{moneyShort(p.soldPrice, cur)}</p>
                  </motion.li>
                )
              })}
            </motion.ol>
          </Card>
        )}

        {teamRows.length > 0 && (
          <Card className="p-6">
            <h3 className="mb-4 font-semibold">Spending by team</h3>
            <ul className="space-y-3">
              {teamRows.map(({ team, count, spent: s }) => (
                <li key={team.id} className="flex items-center gap-3">
                  <Avatar src={team.logoUrl} name={team.shortName} size={30} rounded="xl" color={team.color} />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{team.name}</span>
                      <span className="shrink-0 font-mono text-xs text-ink-300">{count} players · {moneyShort(s, cur)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                      <motion.div className="h-full rounded-full" style={{ background: team.color }} initial={{ width: 0 }} animate={{ width: `${(s / maxSpent) * 100}%` }} transition={{ type: 'spring', stiffness: 70, damping: 20 }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <div className="min-w-0 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {[
            ['Players', t.stats.players],
            ['Sold', t.stats.sold],
            ['Unsold', t.stats.unsold],
            ['Teams', t.teams.length],
          ].map(([label, value]) => (
            <Card key={label as string} className="p-4">
              <p className="text-xs text-ink-400">{label}</p>
              <p className="mt-1 font-display text-2xl font-bold">{value}</p>
            </Card>
          ))}
        </div>
        <DetailsCard />
      </div>
    </div>
  )
}

// ───────────────────────── Tournament details ─────────────────────────

/** Read-only details. `onEdit` is left out once the auction is complete. */
function DetailsCard({ onEdit }: { onEdit?: () => void }) {
  const { t } = useTournament()
  const router = useRouter()
  const confirm = useConfirm()
  const remove = async () => {
    if (!(await confirm({ title: `Delete “${t.name}”?`, message: 'This permanently deletes the tournament with all its players, teams and results. It can’t be undone.', confirmLabel: 'Delete tournament', danger: true }))) return
    try {
      await api(`/tournaments/${t.id}`, { method: 'DELETE' })
      toast.success('Tournament deleted')
      router.replace('/dashboard')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Tournament details</h3>
        {onEdit && (
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        )}
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-4"><dt className="text-ink-400">Venue</dt><dd className="text-right">{t.venue || '—'}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-ink-400">Auction date</dt><dd className="text-right">{t.auctionDate ? new Date(t.auctionDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-ink-400">Currency</dt><dd>{t.currency}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-ink-400">Players</dt><dd className="text-right">{t.useCategories ? `Category-wise · ${t.categoryList.join(', ')}` : 'Without categories'}</dd></div>
      </dl>
      {!onEdit && (
        <button onClick={remove} className="mt-4 inline-flex items-center gap-1 text-xs text-ink-400 hover:text-rose-hot">
          <Trash2 className="h-3.5 w-3.5" /> Delete tournament
        </button>
      )}
    </Card>
  )
}

function DetailsModal({ open, onClose, update }: { open: boolean; onClose: () => void; update: ReturnType<typeof useTournament>['update'] }) {
  const { t } = useTournament()
  const router = useRouter()
  const confirm = useConfirm()
  const toLocal = (d?: string | null) => (d ? new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '')
  const [form, setForm] = useState({ name: t.name, venue: t.venue ?? '', description: t.description ?? '', currency: t.currency, auctionDate: toLocal(t.auctionDate), logoUrl: t.logoUrl ?? '' })
  const [cats, setCats] = useState<CategoryChoice>({ useCategories: t.useCategories, categoryList: t.categoryList })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const started = !['DRAFT', 'READY'].includes(t.status)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.auctionDate) return toast.error('Pick the auction date')
    // Players in a category that is switched off or removed lose it — say so before saving.
    const dropped = t.categories.filter((c) => !cats.useCategories || !cats.categoryList.includes(c.name))
    const affected = dropped.reduce((a, c) => a + c.count, 0)
    if (affected && !(await confirm({
      title: cats.useCategories ? `Remove ${dropped.map((c) => c.name).join(', ')}?` : 'Switch off categories?',
      message: `${affected} player${affected > 1 ? 's' : ''} will lose their category${dropped.length > 1 ? ' and those category base prices are cleared' : ''}.`,
      confirmLabel: 'Save anyway',
      danger: true,
    }))) return
    setSaving(true)
    try {
      await update({ ...form, ...(started ? {} : cats), logoUrl: form.logoUrl || null, auctionDate: new Date(form.auctionDate).toISOString() })
      toast.success('Saved')
      onClose()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }
  const remove = async () => {
    if (!(await confirm({ title: `Delete “${t.name}”?`, message: 'This permanently deletes the tournament with all its players, teams and results. It can’t be undone.', confirmLabel: 'Delete tournament', danger: true }))) return
    try {
      await api(`/tournaments/${t.id}`, { method: 'DELETE' })
      toast.success('Tournament deleted')
      router.replace('/dashboard')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="Tournament details">
      <form onSubmit={save} className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar src={form.logoUrl} name={form.name || 'T'} size={64} rounded="xl" color="#222c41" />
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/5">
            <ImagePlus className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Upload picture'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                setUploading(true)
                try {
                  const url = await uploadImage(file)
                  setForm((f) => ({ ...f, logoUrl: url }))
                  // Saved straight away so the new picture shows everywhere without pressing Save.
                  await update({ logoUrl: url })
                  toast.success('Picture updated')
                } catch (err) {
                  toast.error((err as Error).message)
                } finally {
                  setUploading(false)
                }
              }}
            />
          </label>
        </div>
        <Field label="Name"><Input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Venue"><Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></Field>
          <Field label="Auction date"><Input type="datetime-local" required value={form.auctionDate} onChange={(e) => setForm({ ...form, auctionDate: e.target.value })} /></Field>
        </div>
        <Field label="Currency" hint={t.status !== 'DRAFT' && t.status !== 'READY' ? 'Changing currency after starting only changes the symbol.' : undefined}>
          <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="How are players grouped?" hint={started ? 'Categories are locked once the auction has started.' : undefined}>
          <CategoryModePicker value={cats} onChange={setCats} disabled={started} />
        </Field>
        <Field label="Description" hint="Shown on the registration form.">
          <Textarea maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button type="button" variant="danger" size="sm" onClick={remove}><Trash2 className="h-3.5 w-3.5" /> Delete tournament</Button>
          <Button type="submit" loading={saving} disabled={uploading}>Save</Button>
        </div>
      </form>
    </Modal>
  )
}
