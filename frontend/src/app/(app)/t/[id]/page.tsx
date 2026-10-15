'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Check, ClipboardList, Gavel, ImagePlus, ListChecks, Pencil, Radio, Shield, Trash2, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useTournament } from '@/components/tournament-context'
import { Avatar, Button, Card, Field, Input, Modal, Select, Textarea, fadeUp, stagger } from '@/components/ui'
import { ShareLink } from '@/components/share'
import { Tour } from '@/components/tour'
import { PlanCard } from '@/components/upgrade'
import { api, SITE_URL, uploadImage } from '@/lib/api'
import { CURRENCIES, money } from '@/lib/format'
import { cn } from '@/lib/cn'

export default function Overview() {
  const { t, update } = useTournament()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const base = `/t/${t.id}`
  const origin = typeof window !== 'undefined' ? window.location.origin : SITE_URL
  const liveUrl = `${origin}/live/${t.liveToken}`
  const regUrl = `${origin}/register/${t.registrationToken}`

  const steps = [
    {
      done: t.stats.players > 0,
      icon: Users,
      title: 'Bring in players',
      text: t.stats.players ? `${t.stats.players} players (${t.stats.fromForm} via form, ${t.stats.fromExcel} via Excel)` : 'Upload an Excel or share the registration link',
      href: `${base}/players`,
      cta: t.stats.players ? 'Manage players' : 'Add players',
    },
    {
      done: t.stats.fromForm > 0,
      optional: true,
      icon: ClipboardList,
      title: 'Share the registration link',
      text: t.stats.fromForm > 0
        ? `${t.stats.fromForm} players registered themselves`
        : t.registrationOpen ? 'Link is open — share it on WhatsApp so players sign up with photo' : 'Registrations are closed — open them to share the link',
      href: `${base}/registration`,
      cta: t.registrationOpen ? 'Share link' : 'Open registrations',
    },
    {
      done: t.setupComplete,
      icon: ListChecks,
      title: 'Answer the auction questions',
      text: t.setupComplete ? `${t.teams.length} teams · ${money(t.teamPurse, t.currency)} purse · base ${money(t.basePrice, t.currency)}` : 'Teams, purse, base price, squad size, order',
      href: `${base}/setup`,
      cta: t.setupComplete ? 'Review' : 'Start',
    },
    {
      done: t.teams.length >= 2 && t.teams.some((x) => !/^Team \d+$/.test(x.name)),
      optional: true,
      icon: Shield,
      title: 'Name teams & add logos',
      text: `${t.teams.length} teams`,
      href: `${base}/teams`,
      cta: 'Edit teams',
    },
  ]
  const required = steps.filter((s) => !s.optional)
  const ready = required.every((s) => s.done) && t.teams.length >= 2 && t.stats.available > 0
  const progress = Math.round((steps.filter((s) => s.done).length / steps.length) * 100)

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <Card className="overflow-hidden" data-tour="checklist">
          <div className="flex items-center justify-between gap-4 border-b border-white/5 p-6">
            <div>
              <h2 className="font-display text-xl font-semibold">Launch checklist</h2>
              <p className="text-sm text-ink-400">{ready ? 'All set — you can go live whenever you’re ready.' : 'A few steps and you’re ready for auction day.'}</p>
            </div>
            <div className="relative h-14 w-14 shrink-0">
              <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                <motion.circle cx="18" cy="18" r="15.5" fill="none" stroke="#c8ff2e" strokeWidth="3" strokeLinecap="round" strokeDasharray="97.4" initial={{ strokeDashoffset: 97.4 }} animate={{ strokeDashoffset: 97.4 - (97.4 * progress) / 100 }} transition={{ type: 'spring', stiffness: 60, damping: 18 }} />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-xs font-bold">{progress}%</span>
            </div>
          </div>
          <motion.ol variants={stagger} initial="hidden" animate="show" className="divide-y divide-white/5">
            {steps.map((s) => (
              <motion.li key={s.title} variants={fadeUp} className="flex items-center gap-4 p-5">
                <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', s.done ? 'bg-lime-bright text-on-accent' : 'bg-white/5 text-ink-300')}>
                  {s.done ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {s.title} {s.optional && <span className="ml-1 text-xs font-normal text-ink-400">optional</span>}
                  </p>
                  <p className="truncate text-sm text-ink-400">{s.text}</p>
                </div>
                <Link href={s.href} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-lime-glow hover:bg-lime-glow/10">
                  {s.cta} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </motion.li>
            ))}
          </motion.ol>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 bg-white/[0.02] p-5">
            <p className="text-sm text-ink-300">
              {t.status === 'LIVE' || t.status === 'PAUSED' ? 'Your auction is running.' : t.status === 'COMPLETED' ? 'Auction complete — see the results.' : ready ? 'Everything checks out.' : 'Complete the required steps to start.'}
            </p>
            <Button data-tour="control-room" onClick={() => router.push(t.status === 'COMPLETED' ? `${base}/results` : `${base}/auction`)} disabled={!ready && t.status !== 'LIVE' && t.status !== 'PAUSED' && t.status !== 'COMPLETED'}>
              <Gavel className="h-4 w-4" /> {t.status === 'COMPLETED' ? 'View results' : 'Open control room'}
            </Button>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-4">
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

      <div className="space-y-6">
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
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Tournament details</h3>
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-ink-400">Venue</dt><dd>{t.venue || '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink-400">Auction date</dt><dd>{t.auctionDate ? new Date(t.auctionDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink-400">Currency</dt><dd>{t.currency}</dd></div>
          </dl>
        </Card>
      </div>

      <DetailsModal open={editing} onClose={() => setEditing(false)} update={update} />
      <Tour
        id="tournament"
        steps={[
          { target: 'tabs', title: 'Everything for this auction', body: 'Players, registration form, teams, auction rules, screen theme, the control room and results — all in these tabs.' },
          { target: 'checklist', title: 'Follow the launch checklist', body: 'Work through these steps top to bottom. The ring fills up as you go, and the control room unlocks when the required ones are done.' },
          { target: 'registration', title: 'Let players register themselves', body: 'Share this link in your WhatsApp groups. Players fill in their name, role and photo and appear in your player list instantly.' },
          { target: 'live-link', title: 'The live auction link', body: 'Put this on the projector and send it to team owners and fans. Every screen updates in realtime during the auction.' },
          { target: 'control-room', title: 'Run auction day from here', body: 'When you’re ready, open the control room to start bidding, sell players and track every team’s purse.' },
        ]}
      />
    </div>
  )
}

function DetailsModal({ open, onClose, update }: { open: boolean; onClose: () => void; update: ReturnType<typeof useTournament>['update'] }) {
  const { t } = useTournament()
  const router = useRouter()
  const toLocal = (d?: string | null) => (d ? new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '')
  const [form, setForm] = useState({ name: t.name, venue: t.venue ?? '', description: t.description ?? '', currency: t.currency, auctionDate: toLocal(t.auctionDate), logoUrl: t.logoUrl ?? '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await update({ ...form, logoUrl: form.logoUrl || null, auctionDate: form.auctionDate ? new Date(form.auctionDate).toISOString() : null })
      toast.success('Saved')
      onClose()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }
  const remove = async () => {
    if (!confirm(`Delete “${t.name}” permanently? All players, teams and results will be lost.`)) return
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
            <ImagePlus className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Upload logo'}
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
                  // Saved straight away so the new logo shows everywhere without pressing Save.
                  await update({ logoUrl: url })
                  toast.success('Logo updated')
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
          <Field label="Auction date"><Input type="datetime-local" value={form.auctionDate} onChange={(e) => setForm({ ...form, auctionDate: e.target.value })} /></Field>
        </div>
        <Field label="Currency" hint={t.status !== 'DRAFT' && t.status !== 'READY' ? 'Changing currency after starting only changes the symbol.' : undefined}>
          <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
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
