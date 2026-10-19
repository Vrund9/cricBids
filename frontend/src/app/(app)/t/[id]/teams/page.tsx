'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Check, ChevronRight, Copy, ImagePlus, LayoutGrid, Lock, Plus, RefreshCw, Smartphone, Trash2, UserCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import { useTournament } from '@/components/tournament-context'
import { Avatar, Button, Card, Field, Input, Select, Switch, fadeUp, stagger } from '@/components/ui'
import { useCopy } from '@/components/share'
import { api, isPlanLimit, SITE_URL, uploadImage } from '@/lib/api'
import { money, moneyShort } from '@/lib/format'
import type { Player, Team, Tournament } from '@/lib/types'
import { useConfirm } from '@/components/confirm'

const PALETTE = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1', '#14B8A6', '#E11D48', '#A855F7', '#0EA5E9', '#22C55E', '#EAB308']

export default function TeamsPage() {
  const { t, reload, update } = useTournament()
  const started = ['LIVE', 'PAUSED', 'COMPLETED'].includes(t.status)

  // Players feed the "retain" pickers; retained ones show on their team's card.
  const [players, setPlayers] = useState<Player[]>([])
  const loadPlayers = useCallback(() => api<Player[]>(`/tournaments/${t.id}/players`).then(setPlayers).catch(() => undefined), [t.id])
  useEffect(() => {
    if (!started) void loadPlayers()
  }, [loadPlayers, started])
  const refresh = async () => {
    await Promise.all([reload(), loadPlayers()])
  }

  if (t.status === 'COMPLETED') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold">Teams</h2>
          <p className="text-sm text-ink-400">Final squads and purses. The auction is complete, so teams can no longer be edited.</p>
        </div>
        <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {t.teams.map((team) => (
            <motion.div key={team.id} variants={fadeUp}>
              <Card className="overflow-hidden">
                <div className="h-1.5" style={{ background: team.color }} />
                <div className="flex items-center gap-4 p-5">
                  <Avatar src={team.logoUrl} name={team.name} size={56} rounded="xl" color={team.color} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{team.name} <span className="text-xs font-normal text-ink-400">{team.shortName}</span></p>
                    <p className="truncate text-xs text-ink-400">{team.ownerName ? `Owner: ${team.ownerName}` : 'No owner set'}</p>
                  </div>
                </div>
                <dl className="grid grid-cols-3 border-t border-white/5 text-center text-xs">
                  <div className="p-3"><dt className="text-ink-400">Players</dt><dd className="mt-0.5 font-display text-lg font-bold">{team.squadSize ?? 0}</dd></div>
                  <div className="border-x border-white/5 p-3"><dt className="text-ink-400">Spent</dt><dd className="mt-0.5 font-display text-lg font-bold text-gold">{moneyShort(t.teamPurse - team.purse, t.currency)}</dd></div>
                  <div className="p-3"><dt className="text-ink-400">Left</dt><dd className="mt-0.5 font-display text-lg font-bold">{moneyShort(team.purse, t.currency)}</dd></div>
                </dl>
                <SquadLink tournamentId={t.id} teamId={team.id} label="Squad, analysis & field view" />
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    )
  }

  const add = async () => {
    try {
      await api(`/tournaments/${t.id}/teams`, { body: { name: `Team ${t.teams.length + 1}` } })
      await reload()
    } catch (e) {
      if (!isPlanLimit(e)) toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Teams</h2>
          <p className="text-sm text-ink-400">Each team starts with a purse of {money(t.teamPurse, t.currency)}. Changes save automatically.</p>
        </div>
        {!started && t.teams.length < t.planInfo.limits.teamCap && (
          <Button variant="secondary" onClick={add}>
            <Plus className="h-4 w-4" /> Add team
            {t.teams.length >= t.planInfo.limits.maxTeams && <span className="ml-1 inline-flex items-center gap-1 text-[11px] text-gold"><Lock className="h-3 w-3" /> ₹{t.planInfo.pricing.perExtraTeam}</span>}
          </Button>
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
          label={<span className="inline-flex items-center gap-2"><Smartphone className="h-4 w-4 text-sky-live" /> Remote bidding</span>}
          description="Send each team owner their private link. They tap to bid; the server checks purse and squad rules on every bid."
        />
      </Card>

      {t.teams.length === 0 ? (
        <Card className="p-10 text-center text-sm text-ink-400">No teams yet — answer “How many teams?” in Auction rules, or add one.</Card>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {t.teams.map((team) => (
            <motion.div key={team.id} variants={fadeUp}>
              <TeamCard team={team} tournamentId={t.id} currency={t.currency} started={started} remote={t.remoteBidding} onChange={reload}>
                {!started && <Retained team={team} t={t} players={players} onChange={refresh} />}
              </TeamCard>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

function TeamCard({ team, tournamentId, currency, started, remote, onChange, children }: { team: Team; tournamentId: string; currency: string; started: boolean; remote: boolean; onChange: () => Promise<void>; children?: React.ReactNode }) {
  const [form, setForm] = useState({ name: team.name, shortName: team.shortName, ownerName: team.ownerName ?? '', color: team.color, logoUrl: team.logoUrl ?? '' })
  const [uploading, setUploading] = useState(false)
  const { copied, copy } = useCopy()
  const confirm = useConfirm()
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
    if (!(await confirm({ title: `Remove ${team.name}?`, message: 'The team is deleted. Any players it retained go back into the auction pool.', confirmLabel: 'Remove team', danger: true }))) return
    try {
      await api(`/tournaments/${tournamentId}/teams/${team.id}`, { method: 'DELETE' })
      await onChange()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const rotate = async () => {
    if (!(await confirm({ title: `New bidding link for ${team.name}?`, message: 'The old link stops working straight away. Send the new one to the team owner.', confirmLabel: 'Create new link' }))) return
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
        {children}
        <SquadLink tournamentId={tournamentId} teamId={team.id} label={started ? 'Squad & analysis' : 'Squad planner'} className="-mx-5 border-t" />
        {!started && (
          <button onClick={remove} className="inline-flex items-center gap-1 text-xs text-ink-400 hover:text-rose-hot">
            <Trash2 className="h-3.5 w-3.5" /> Remove team
          </button>
        )}
      </div>
    </Card>
  )
}

function SquadLink({ tournamentId, teamId, label, className }: { tournamentId: string; teamId: string; label: string; className?: string }) {
  return (
    <Link href={`/t/${tournamentId}/teams/${teamId}`} className={`flex items-center gap-2 border-white/5 px-5 py-3 text-sm font-semibold text-lime-glow hover:bg-white/[0.03] ${className ?? 'border-t'}`}>
      <LayoutGrid className="h-4 w-4" /> {label} <ChevronRight className="ml-auto h-4 w-4" />
    </Link>
  )
}

/** Base price that would apply to this player at the auction (own → category → tournament). */
function basePriceOf(p: Player, t: Tournament) {
  return p.basePrice ?? (p.category ? t.categoryBasePrices?.[p.category] : undefined) ?? t.basePrice
}

/**
 * Players this team keeps before the auction. They skip the hammer, count towards the squad,
 * and their price can come out of the purse (on by default) or be free.
 */
function Retained({ team, t, players, onChange }: { team: Team; t: Tournament; players: Player[]; onChange: () => Promise<void> }) {
  const mine = players.filter((p) => p.retained && p.soldTeamId === team.id)
  const pool = players.filter((p) => p.status === 'AVAILABLE' && p.approved).sort((a, b) => a.name.localeCompare(b.name))
  const [adding, setAdding] = useState(false)
  const [playerId, setPlayerId] = useState('')
  const [price, setPrice] = useState('')
  const [deduct, setDeduct] = useState(true)
  const [busy, setBusy] = useState(false)

  const pick = (id: string) => {
    setPlayerId(id)
    const p = pool.find((x) => x.id === id)
    if (p) setPrice(String(basePriceOf(p, t)))
  }
  const retain = async () => {
    if (!playerId) return toast.error('Choose a player')
    setBusy(true)
    try {
      await api(`/tournaments/${t.id}/teams/${team.id}/retain`, { body: { playerId, price: Math.max(0, Number(price) || 0), deductFromPurse: deduct } })
      toast.success(`${pool.find((x) => x.id === playerId)?.name} retained by ${team.shortName}`)
      setAdding(false)
      setPlayerId('')
      setPrice('')
      await onChange()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const release = async (p: Player) => {
    try {
      await api(`/tournaments/${t.id}/teams/${team.id}/retain/${p.id}`, { method: 'DELETE' })
      toast.success(`${p.name} is back in the auction pool`)
      await onChange()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-200"><UserCheck className="h-3.5 w-3.5 text-gold" /> Retained players {mine.length > 0 && `(${mine.length})`}</p>
        {!adding && <button className="text-xs font-semibold text-lime-glow hover:underline" onClick={() => setAdding(true)}>+ Retain</button>}
      </div>
      {mine.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {mine.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <Avatar src={p.photoUrl} name={p.name} size={24} />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <span className="font-mono text-xs text-gold">{p.soldPrice ? moneyShort(p.soldPrice, t.currency) : 'free'}</span>
              <button className="rounded p-1 text-ink-400 hover:bg-white/5 hover:text-rose-hot" onClick={() => release(p)} aria-label={`Release ${p.name}`}><X className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
      {adding && (
        <div className="mt-3 space-y-2">
          <Select className="h-9 text-xs" value={playerId} onChange={(e) => pick(e.target.value)} aria-label="Player to retain">
            <option value="">{pool.length ? 'Choose a player…' : 'No available players'}</option>
            {pool.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.role}{p.category ? ` · ${p.category}` : ''}</option>)}
          </Select>
          <div className="flex items-center gap-2">
            <Input type="number" min={0} className="h-9 text-xs" placeholder="Retention price" value={price} onChange={(e) => setPrice(e.target.value)} aria-label="Retention price" />
            <Button size="sm" loading={busy} onClick={retain}>Retain</Button>
            <button className="text-xs text-ink-400 hover:text-white" onClick={() => setAdding(false)}>Cancel</button>
          </div>
          <label className="flex items-center gap-2 text-xs text-ink-300">
            <input type="checkbox" className="accent-lime-glow" checked={deduct} onChange={(e) => setDeduct(e.target.checked)} />
            Take {price ? moneyShort(Number(price), t.currency) : 'the price'} out of {team.shortName}’s purse ({moneyShort(team.purse, t.currency)} left)
          </label>
        </div>
      )}
    </div>
  )
}
