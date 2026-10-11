'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Download, FileSpreadsheet, ImagePlus, Pencil, Plus, Search, Tag, Trash2, UserPlus, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { useTournament } from '@/components/tournament-context'
import { ImportWizard } from '@/components/import-wizard'
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, PageLoader, Select, StatusBadge } from '@/components/ui'
import { api, uploadImage } from '@/lib/api'
import { downloadTemplate, exportPlayers } from '@/lib/excel'
import { money, roleMeta } from '@/lib/format'
import { useLiveAuction } from '@/lib/live'
import type { Player } from '@/lib/types'
import { cn } from '@/lib/cn'

const ROLES = ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper']

export default function PlayersPage() {
  const { t, reload: reloadT } = useTournament()
  const [players, setPlayers] = useState<Player[] | null>(null)
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [editing, setEditing] = useState<Player | 'new' | null>(null)
  const [catOpen, setCatOpen] = useState(false)
  const started = ['LIVE', 'PAUSED', 'COMPLETED'].includes(t.status)

  const load = useCallback(async () => {
    try {
      setPlayers(await api<Player[]>(`/tournaments/${t.id}/players`))
    } catch (e) {
      toast.error((e as Error).message)
    }
  }, [t.id])

  useEffect(() => {
    void load()
  }, [load])

  // New self-registrations pop in live while the organiser is on this page.
  useLiveAuction({
    ownerTournamentId: t.id,
    onRegistration: (p) => {
      toast.success(`${p.name} just registered`, { description: p.role })
      void load()
      void reloadT()
    },
  })

  const refresh = () => {
    void load()
    void reloadT()
  }

  const filtered = useMemo(() => {
    if (!players) return []
    const term = q.trim().toLowerCase()
    return players.filter((p) => {
      if (role && p.role !== role) return false
      if (status === 'PENDING' ? p.approved : status && p.status !== status) return false
      if (!term) return true
      return [p.name, p.phone, p.city, p.category, String(p.serial)].some((v) => v?.toLowerCase().includes(term))
    })
  }, [players, q, role, status])

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id))

  const bulk = async (approved: boolean) => {
    try {
      const r = await api<{ updated: number }>(`/tournaments/${t.id}/players/approve`, { body: { ids: [...selected], approved } })
      toast.success(`${r.updated} players ${approved ? 'approved' : 'moved to pending'}`)
      setSelected(new Set())
      refresh()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const remove = async (p: Player) => {
    if (!confirm(`Remove ${p.name}?`)) return
    try {
      await api(`/tournaments/${t.id}/players/${p.id}`, { method: 'DELETE' })
      toast.success('Player removed')
      refresh()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  if (!players) return <PageLoader />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Players</h2>
          <p className="text-sm text-ink-400">
            {players.length} total · {players.filter((p) => p.source === 'FORM').length} from registration form{t.stats.pendingApproval ? ` · ${t.stats.pendingApproval} awaiting approval` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => downloadTemplate(t.registrationFields, t.name)}>
            <Download className="h-4 w-4" /> Excel template
          </Button>
          {players.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => exportPlayers(players, t.teams, t)}>
              <FileSpreadsheet className="h-4 w-4" /> Export
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => setEditing('new')}>
            <UserPlus className="h-4 w-4" /> Add player
          </Button>
          <Button size="sm" onClick={() => setImporting(true)}>
            <FileSpreadsheet className="h-4 w-4" /> Upload Excel
          </Button>
        </div>
      </div>

      {players.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No players yet"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => setImporting(true)}><FileSpreadsheet className="h-4 w-4" /> Upload Excel</Button>
              <Button variant="secondary" onClick={() => (window.location.href = `/t/${t.id}/registration`)}>Share registration link</Button>
            </div>
          }
        >
          Upload the Excel you already have (Google Forms exports work), or let players register themselves through a link.
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/5 p-3">
            <div className="relative min-w-48 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <Input placeholder="Search name, mobile, city, #" className="h-10 pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select className="h-10 w-auto" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">All roles</option>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </Select>
            <Select className="h-10 w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Any status</option>
              <option value="PENDING">Awaiting approval</option>
              <option value="AVAILABLE">Available</option>
              <option value="SOLD">Sold</option>
              <option value="UNSOLD">Unsold</option>
            </Select>
          </div>

          <AnimatePresence>
            {selected.size > 0 && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-white/5 bg-lime-glow/5">
                <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                  <b>{selected.size} selected</b>
                  <Button size="sm" variant="secondary" onClick={() => bulk(true)}><Check className="h-3.5 w-3.5" /> Approve</Button>
                  <Button size="sm" variant="ghost" onClick={() => bulk(false)}>Mark pending</Button>
                  <Button size="sm" variant="ghost" onClick={() => setCatOpen(true)}><Tag className="h-3.5 w-3.5" /> Set category</Button>
                  <button className="ml-auto text-ink-400 hover:text-white" onClick={() => setSelected(new Set())} aria-label="Clear selection"><X className="h-4 w-4" /></button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs text-ink-400">
                <tr className="border-b border-white/5">
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" className="accent-lime-glow" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(filtered.map((p) => p.id)))} aria-label="Select all" />
                  </th>
                  <th className="px-2 py-3 font-medium">Player</th>
                  <th className="px-2 py-3 font-medium">Role</th>
                  <th className="px-2 py-3 font-medium">Category</th>
                  <th className="px-2 py-3 font-medium">Mobile</th>
                  <th className="px-2 py-3 font-medium">Status</th>
                  <th className="px-2 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((p) => {
                  const rm = roleMeta(p.role)
                  const team = p.soldTeamId ? t.teams.find((x) => x.id === p.soldTeamId) : null
                  return (
                    <tr key={p.id} className={cn('transition hover:bg-white/[0.02]', selected.has(p.id) && 'bg-lime-glow/[0.03]')}>
                      <td className="px-4 py-2.5">
                        <input type="checkbox" className="accent-lime-glow" checked={selected.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Select ${p.name}`} />
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar src={p.photoUrl} name={p.name} size={36} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{p.name}</p>
                            <p className="text-xs text-ink-400">#{p.serial}{p.city ? ` · ${p.city}` : ''}{p.source === 'FORM' ? ' · via form' : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2.5"><Badge color={rm.color}>{rm.short}</Badge></td>
                      <td className="px-2 py-2.5 text-ink-200">{p.category || '—'}</td>
                      <td className="px-2 py-2.5 text-ink-300">{p.phone || '—'}</td>
                      <td className="px-2 py-2.5">
                        {!p.approved ? (
                          <Badge color="#ffb020">pending</Badge>
                        ) : p.status === 'SOLD' ? (
                          <span className="text-xs"><b className="text-gold">{money(p.soldPrice, t.currency)}</b> <span className="text-ink-400">· {team?.shortName}</span></span>
                        ) : (
                          <StatusBadge status={p.status} />
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <button className="rounded-lg p-2 text-ink-400 hover:bg-white/5 hover:text-white" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}><Pencil className="h-4 w-4" /></button>
                          {p.status !== 'SOLD' && p.status !== 'LIVE' && (
                            <button className="rounded-lg p-2 text-ink-400 hover:bg-rose-hot/10 hover:text-rose-hot" onClick={() => remove(p)} aria-label={`Remove ${p.name}`}><Trash2 className="h-4 w-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="p-8 text-center text-sm text-ink-400">No players match these filters.</p>}
          </div>
        </Card>
      )}

      <ImportWizard open={importing} onClose={() => setImporting(false)} tournamentId={t.id} hasPlayers={players.length > 0} locked={started} onImported={refresh} />
      <PlayerModal player={editing} onClose={() => setEditing(null)} tournamentId={t.id} onSaved={refresh} />
      <CategoryModal open={catOpen} onClose={() => setCatOpen(false)} ids={[...selected]} tournamentId={t.id} existing={t.categories.map((c) => c.name)} onSaved={() => { setSelected(new Set()); refresh() }} />
    </div>
  )
}

function CategoryModal({ open, onClose, ids, tournamentId, existing, onSaved }: { open: boolean; onClose: () => void; ids: string[]; tournamentId: string; existing: string[]; onSaved: () => void }) {
  const [value, setValue] = useState('')
  const save = async (category: string | null) => {
    try {
      await api(`/tournaments/${tournamentId}/players/category`, { body: { ids, category } })
      toast.success(category ? `Set category ${category.toUpperCase()}` : 'Category cleared')
      onClose()
      onSaved()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  return (
    <Modal open={open} onClose={onClose} title={`Set category for ${ids.length} players`}>
      <p className="text-sm text-ink-300">Categories (e.g. Marquee, A, B, C) let you set different base prices and auction them group by group.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {[...new Set([...existing, 'MARQUEE', 'A', 'B', 'C'])].map((c) => (
          <Button key={c} size="sm" variant="secondary" onClick={() => save(c)}>{c}</Button>
        ))}
      </div>
      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (value.trim()) void save(value.trim()) }}>
        <Input placeholder="Custom category" value={value} onChange={(e) => setValue(e.target.value)} maxLength={30} />
        <Button type="submit">Set</Button>
      </form>
      <button className="mt-4 text-sm text-ink-400 hover:text-white" onClick={() => save(null)}>Clear category</button>
    </Modal>
  )
}

function PlayerModal({ player, onClose, tournamentId, onSaved }: { player: Player | 'new' | null; onClose: () => void; tournamentId: string; onSaved: () => void }) {
  const isNew = player === 'new'
  const p = player && player !== 'new' ? player : null
  const empty = { name: '', role: 'Batsman', category: '', phone: '', email: '', city: '', age: '', battingStyle: '', bowlingStyle: '', photoUrl: '', basePrice: '' }
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (p) {
      setForm({
        name: p.name, role: p.role, category: p.category ?? '', phone: p.phone ?? '', email: p.email ?? '', city: p.city ?? '', age: p.age ? String(p.age) : '',
        battingStyle: p.battingStyle ?? '', bowlingStyle: p.bowlingStyle ?? '', photoUrl: p.photoUrl ?? '', basePrice: p.basePrice ? String(p.basePrice) : '',
      })
    } else if (isNew) setForm(empty)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const body: Record<string, unknown> = {
      name: form.name,
      role: form.role,
      category: form.category || null,
      phone: form.phone,
      email: form.email,
      city: form.city,
      age: form.age ? Number(form.age) : null,
      battingStyle: form.battingStyle,
      bowlingStyle: form.bowlingStyle,
      photoUrl: form.photoUrl || null,
      basePrice: form.basePrice ? Number(form.basePrice) : null,
    }
    try {
      if (isNew) await api(`/tournaments/${tournamentId}/players`, { body })
      else await api(`/tournaments/${tournamentId}/players/${p!.id}`, { method: 'PATCH', body: { ...body, approved: p?.approved } })
      toast.success(isNew ? 'Player added' : 'Player updated')
      onClose()
      onSaved()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value })

  return (
    <Modal open={!!player} onClose={onClose} title={isNew ? 'Add player' : `Edit ${p?.name ?? ''}`}>
      <form onSubmit={save} className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar src={form.photoUrl} name={form.name || '?'} size={64} />
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/5">
            <ImagePlus className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Photo'}
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              setUploading(true)
              try {
                const url = await uploadImage(f)
                setForm((x) => ({ ...x, photoUrl: url }))
              } catch (err) {
                toast.error((err as Error).message)
              } finally {
                setUploading(false)
              }
            }} />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2"><Input required value={form.name} onChange={set('name')} /></Field>
          <Field label="Role">
            <Select value={form.role} onChange={set('role')}>{ROLES.map((r) => <option key={r}>{r}</option>)}</Select>
          </Field>
          <Field label="Category"><Input placeholder="A, B, Marquee…" value={form.category} onChange={set('category')} /></Field>
          <Field label="Mobile"><Input type="tel" value={form.phone} onChange={set('phone')} /></Field>
          <Field label="Age"><Input type="number" min={5} max={90} value={form.age} onChange={set('age')} /></Field>
          <Field label="Batting style"><Input value={form.battingStyle} onChange={set('battingStyle')} /></Field>
          <Field label="Bowling style"><Input value={form.bowlingStyle} onChange={set('bowlingStyle')} /></Field>
          <Field label="City"><Input value={form.city} onChange={set('city')} /></Field>
          <Field label="Own base price" hint="Overrides category/default"><Input type="number" min={0} value={form.basePrice} onChange={set('basePrice')} /></Field>
        </div>
        {p?.extra && Object.keys(p.extra).length > 0 && (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs">
            <p className="mb-2 font-semibold text-ink-300">Extra info</p>
            <dl className="grid gap-1 sm:grid-cols-2">
              {Object.entries(p.extra).map(([k, v]) => (
                <div key={k} className="flex gap-2"><dt className="text-ink-400">{k}:</dt><dd className="truncate">{v}</dd></div>
              ))}
            </dl>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving} disabled={uploading}><Plus className="h-4 w-4" /> {isNew ? 'Add player' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  )
}
