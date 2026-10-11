'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Check, Copy, ImagePlus, Plus, RefreshCw, Smartphone, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTournament } from '@/components/tournament-context'
import { Avatar, Button, Card, Field, Input, Switch, fadeUp, stagger } from '@/components/ui'
import { useCopy } from '@/components/share'
import { api, isPlanLimit, SITE_URL, uploadImage } from '@/lib/api'
import { money } from '@/lib/format'
import type { Team } from '@/lib/types'

const PALETTE = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1', '#14B8A6', '#E11D48', '#A855F7', '#0EA5E9', '#22C55E', '#EAB308']

export default function TeamsPage() {
  const { t, reload, update } = useTournament()
  const started = ['LIVE', 'PAUSED', 'COMPLETED'].includes(t.status)

  const add = async () => {
    try {
      await api(`/tournaments/${t.id}/teams`, { body: { name: `Team ${t.teams.length + 1}` } })
      await reload()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Teams</h2>
          <p className="text-sm text-ink-400">Each team starts with a purse of {money(t.teamPurse, t.currency)}. Changes save automatically.</p>
        </div>
        {!started && t.teams.length < 16 && (
          <Button variant="secondary" onClick={add}><Plus className="h-4 w-4" /> Add team</Button>
        )}
      </div>

      <Card className="p-5">
        <Switch
          checked={t.remoteBidding}
          onChange={async (v) => {
            try {
              await update({ remoteBidding: v })
              toast.success(v ? 'Team owners can now bid from their phones' : 'Remote bidding turned off')
            } catch (e) {
              if (!isPlanLimit(e)) toast.error((e as Error).message)
            }
          }}
          label={<span className="inline-flex items-center gap-2"><Smartphone className="h-4 w-4 text-sky-live" /> Remote bidding {!t.planInfo.limits.remoteBidding && <span className="rounded-full border border-gold/40 px-1.5 text-[10px] font-bold text-gold">PRO</span>}</span>}
          description="Send each team owner their private link. They tap to bid; the server checks purse and squad rules on every bid."
        />
      </Card>

      {t.teams.length === 0 ? (
        <Card className="p-10 text-center text-sm text-ink-400">No teams yet — answer “How many teams?” in Auction rules, or add one.</Card>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {t.teams.map((team) => (
            <motion.div key={team.id} variants={fadeUp}>
              <TeamCard team={team} tournamentId={t.id} currency={t.currency} started={started} remote={t.remoteBidding} onChange={reload} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

function TeamCard({ team, tournamentId, currency, started, remote, onChange }: { team: Team; tournamentId: string; currency: string; started: boolean; remote: boolean; onChange: () => Promise<void> }) {
  const [form, setForm] = useState({ name: team.name, shortName: team.shortName, ownerName: team.ownerName ?? '', color: team.color, logoUrl: team.logoUrl ?? '' })
  const [uploading, setUploading] = useState(false)
  const { copied, copy } = useCopy()
  useEffect(() => setForm({ name: team.name, shortName: team.shortName, ownerName: team.ownerName ?? '', color: team.color, logoUrl: team.logoUrl ?? '' }), [team])

  const save = async (patch: Partial<typeof form>) => {
    const next = { ...form, ...patch }
    if (!next.name.trim()) return
    try {
      await api(`/tournaments/${tournamentId}/teams/${team.id}`, {
        method: 'PATCH',
        body: { name: next.name, shortName: next.shortName || undefined, ownerName: next.ownerName || null, color: next.color, logoUrl: next.logoUrl || null },
      })
      await onChange()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const remove = async () => {
    if (!confirm(`Delete ${team.name}?`)) return
    try {
      await api(`/tournaments/${tournamentId}/teams/${team.id}`, { method: 'DELETE' })
      await onChange()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const rotate = async () => {
    if (!confirm(`Create a new bidding link for ${team.name}? The old one stops working.`)) return
    await api(`/tournaments/${tournamentId}/teams/${team.id}/rotate-token`, { body: {} })
    await onChange()
    toast.success('New bidding link created')
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : SITE_URL
  const bidUrl = `${origin}/bid/${team.bidToken}`

  return (
    <Card className="overflow-hidden">
      <div className="h-1.5" style={{ background: form.color }} />
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-4">
          <label className="group relative cursor-pointer" aria-label="Upload team logo">
            <Avatar src={form.logoUrl} name={form.name} size={60} rounded="xl" color={form.color} />
            <span className="absolute inset-0 grid place-items-center rounded-xl bg-ink-950/70 opacity-0 transition group-hover:opacity-100">
              <ImagePlus className="h-5 w-5" />
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              setUploading(true)
              try {
                const url = await uploadImage(f)
                setForm((x) => ({ ...x, logoUrl: url }))
                await save({ logoUrl: url })
              } catch (err) {
                toast.error((err as Error).message)
              } finally {
                setUploading(false)
              }
            }} />
          </label>
          <div className="min-w-0 flex-1">
            <Input className="h-10 font-semibold" value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} onBlur={() => form.name !== team.name && save({})} aria-label="Team name" />
            <p className="mt-1 text-xs text-ink-400">{uploading ? 'Uploading logo…' : started ? `${money(team.purse, currency)} left · ${team.squadSize ?? 0} players` : 'Click the logo to upload'}</p>
          </div>
        </div>
        <div className="grid grid-cols-[90px_1fr] gap-3">
          <Field label="Short">
            <Input className="h-9 uppercase" maxLength={5} value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value.toUpperCase() })} onBlur={() => form.shortName !== team.shortName && save({})} />
          </Field>
          <Field label="Owner">
            <Input className="h-9" maxLength={80} placeholder="Optional" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} onBlur={() => form.ownerName !== (team.ownerName ?? '') && save({})} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Team colour">
          {PALETTE.map((c) => (
            <button key={c} role="radio" aria-checked={form.color === c} aria-label={c} onClick={() => { setForm({ ...form, color: c }); void save({ color: c }) }} className="grid h-6 w-6 place-items-center rounded-full transition hover:scale-110" style={{ background: c }}>
              {form.color.toUpperCase() === c && <Check className="h-3.5 w-3.5 text-white" />}
            </button>
          ))}
        </div>
        {remote && (
          <div className="rounded-xl border border-sky-live/20 bg-sky-live/5 p-3">
            <p className="text-xs font-semibold text-sky-live">Owner’s bidding link</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate text-[11px] text-ink-300">{bidUrl}</code>
              <button className="rounded-lg p-1.5 hover:bg-white/5" onClick={() => copy(bidUrl, `${team.name} link copied`)} aria-label="Copy bidding link">
                {copied ? <Check className="h-4 w-4 text-lime-glow" /> : <Copy className="h-4 w-4" />}
              </button>
              <a className="rounded-lg px-2 py-1 text-xs font-semibold text-[#25D366] hover:bg-white/5" target="_blank" rel="noopener" href={`https://wa.me/?text=${encodeURIComponent(`🏏 ${team.name} bidding paddle — keep this link private:\n${bidUrl}`)}`}>
                WhatsApp
              </a>
              <button className="rounded-lg p-1.5 text-ink-400 hover:bg-white/5 hover:text-white" onClick={rotate} aria-label="Reset bidding link"><RefreshCw className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}
        {!started && (
          <button onClick={remove} className="inline-flex items-center gap-1 text-xs text-ink-400 hover:text-rose-hot">
            <Trash2 className="h-3.5 w-3.5" /> Remove team
          </button>
        )}
      </div>
    </Card>
  )
}
