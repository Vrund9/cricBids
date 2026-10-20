'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, Lock, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { CategoryModePicker, type CategoryChoice } from '@/components/categories'
import { useConfirm } from '@/components/confirm'
import { useTournament } from '@/components/tournament-context'
import { Avatar, Button, Card, Field, Input, Select, Textarea } from '@/components/ui'
import { api, uploadImage } from '@/lib/api'
import { CURRENCIES, moneyShort } from '@/lib/format'
import type { Tournament } from '@/lib/types'

const toLocal = (d?: string | null) => (d ? new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '')
const formOf = (t: Tournament) => ({ name: t.name, venue: t.venue ?? '', description: t.description ?? '', currency: t.currency, auctionDate: toLocal(t.auctionDate), logoUrl: t.logoUrl ?? '' })

/**
 * Tournament details on the overview: the numbers at a glance plus the details — an editable form while
 * the tournament is a draft or ready, a locked summary once the auction is live or complete.
 * `stats` is off where the page already shows its own numbers (the completed recap).
 */
export function TournamentDetails({ stats: showStats = true }: { stats?: boolean }) {
  const { t, update } = useTournament()
  const router = useRouter()
  const confirm = useConfirm()
  const [form, setForm] = useState(() => formOf(t))
  const [cats, setCats] = useState<CategoryChoice>({ useCategories: t.useCategories, categoryList: t.categoryList })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  useEffect(() => {
    setForm(formOf(t))
    setCats({ useCategories: t.useCategories, categoryList: t.categoryList })
  }, [t])

  const started = !['DRAFT', 'READY'].includes(t.status)
  const cur = t.currency
  const dirty = JSON.stringify(form) !== JSON.stringify(formOf(t)) || cats.useCategories !== t.useCategories || cats.categoryList.join('|') !== t.categoryList.join('|')

  const stats: [string, React.ReactNode, string?][] = [
    ['Total players', t.stats.players, t.stats.players ? `${t.stats.fromForm} via form · ${t.stats.fromExcel} from Excel` : undefined],
    ['Teams', t.teams.length],
    ['Ready to auction', t.stats.available],
    ['Sold', t.stats.sold],
    ['Unsold', t.stats.unsold],
    ['Awaiting approval', t.stats.pendingApproval],
    ['Purse per team', moneyShort(t.teamPurse, cur)],
    ['Squad size', `${t.minSquad}–${t.maxSquad}`],
  ]

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
      await update({ ...form, ...cats, logoUrl: form.logoUrl || null, auctionDate: new Date(form.auctionDate).toISOString() })
      toast.success('Details saved')
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
    <div className="space-y-6">
      {showStats && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value, sub]) => (
          <Card key={label} className="p-4">
            <p className="text-xs text-ink-400">{label}</p>
            <p className="mt-1 font-display text-2xl font-bold">{value}</p>
            {sub && <p className="mt-0.5 truncate text-[11px] text-ink-400">{sub}</p>}
          </Card>
        ))}
      </div>}

      {started ? <DetailsSummary /> : <Card className="p-6">
        <form onSubmit={save} className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold">Tournament details</h2>
              <p className="text-sm text-ink-400">
                Shown on the registration form, live screen and results. Locked once the auction goes live.
              </p>
            </div>
            <Button type="submit" loading={saving} disabled={uploading || !dirty}><Save className="h-4 w-4" /> Save</Button>
          </div>

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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><Input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Venue"><Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></Field>
            <Field label="Auction date"><Input type="datetime-local" required value={form.auctionDate} onChange={(e) => setForm({ ...form, auctionDate: e.target.value })} /></Field>
            <Field label="Currency">
              <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="How are players grouped?">
            <CategoryModePicker value={cats} onChange={setCats} />
          </Field>
          <Field label="Description" hint="Shown on the registration form.">
            <Textarea maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
        </form>
      </Card>}

      <Card className="flex flex-wrap items-center justify-between gap-3 border-rose-hot/20 p-5">
        <div>
          <h3 className="font-semibold">Delete tournament</h3>
          <p className="text-sm text-ink-400">Removes every player, team and result. This can’t be undone.</p>
        </div>
        <Button variant="danger" size="sm" onClick={remove}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
      </Card>
    </div>
  )
}

/** Live or complete: the details are final, shown as a read-only summary. */
function DetailsSummary() {
  const { t } = useTournament()
  const rows: [string, React.ReactNode][] = [
    ['Venue', t.venue || '—'],
    ['Auction date', t.auctionDate ? new Date(t.auctionDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'],
    ['Currency', t.currency],
    ['Players', t.useCategories ? `Category-wise · ${t.categoryList.join(', ')}` : 'Without categories'],
    ...(t.description ? [['Description', t.description] as [string, React.ReactNode]] : []),
  ]
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar src={t.logoUrl} name={t.name} size={56} rounded="xl" color="#222c41" />
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-semibold">{t.name}</h2>
            <p className="text-sm text-ink-400">Tournament details</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-ink-300">
          <Lock className="h-3.5 w-3.5" /> {t.status === 'COMPLETED' ? 'Locked · auction complete' : 'Locked · auction is live'}
        </span>
      </div>
      <dl className="mt-5 divide-y divide-white/5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
            <dt className="text-sm text-ink-400">{label}</dt>
            <dd className="max-w-xl text-right text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
