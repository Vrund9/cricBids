'use client'

import { useEffect, useState } from 'react'
import { Reorder, motion, AnimatePresence } from 'motion/react'
import { ArrowDown, ArrowUp, Download, GripVertical, Lock, Plus, RefreshCw, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTournament } from '@/components/tournament-context'
import { Button, Card, Field, Input, Select, Switch } from '@/components/ui'
import { ShareLink } from '@/components/share'
import { api, SITE_URL } from '@/lib/api'
import { downloadTemplate } from '@/lib/excel'
import type { FieldType, RegField } from '@/lib/types'
import { cn } from '@/lib/cn'

const TYPE_LABEL: Record<FieldType, string> = {
  text: 'Short text', textarea: 'Paragraph', number: 'Number', tel: 'Phone', email: 'Email', select: 'Dropdown', photo: 'Photo upload',
}

export default function RegistrationPage() {
  const { t, update, reload } = useTournament()
  const [fields, setFields] = useState<RegField[]>(t.registrationFields)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    setFields(t.registrationFields)
    setDirty(false)
  }, [t.registrationFields])

  const origin = typeof window !== 'undefined' ? window.location.origin : SITE_URL
  const url = `${origin}/register/${t.registrationToken}`
  const builtins = fields.filter((f) => f.builtin)
  const custom = fields.filter((f) => !f.builtin)

  const patch = (key: string, p: Partial<RegField>) => {
    setFields((fs) => fs.map((f) => (f.key === key ? { ...f, ...p } : f)))
    setDirty(true)
  }
  const setCustom = (next: RegField[]) => {
    setFields([...builtins, ...next])
    setDirty(true)
  }
  const addQuestion = () => setCustom([...custom, { key: `q_${Date.now().toString(36)}`, label: '', type: 'text', required: false, enabled: true }])
  const move = (i: number, d: -1 | 1) => {
    const next = [...custom]
    const j = i + d
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setCustom(next)
  }

  const save = async () => {
    if (custom.some((f) => !f.label.trim())) return toast.error('Every custom question needs a label')
    if (custom.some((f) => f.type === 'select' && !f.options?.filter(Boolean).length)) return toast.error('Dropdown questions need at least one option')
    setSaving(true)
    try {
      await update({ registrationFields: fields.map((f) => ({ ...f, options: f.options?.map((o) => o.trim()).filter(Boolean) })) })
      toast.success('Form saved')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const toggleSetting = async (patchBody: Record<string, unknown>, msg: string) => {
    try {
      await update(patchBody)
      toast.success(msg)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const resetLink = async () => {
    if (!confirm('Reset the registration link? The old link will stop working.')) return
    await api(`/tournaments/${t.id}/rotate-token`, { body: { kind: 'registration' } })
    await reload()
    toast.success('New registration link created')
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold">Registration form</h2>
          <p className="text-sm text-ink-400">Players fill this in from your link. Every answer lands straight in your player list — no Excel cleanup.</p>
        </div>

        <Card className="divide-y divide-white/5">
          <div className="p-5">
            <h3 className="font-semibold">Standard fields</h3>
            <p className="text-xs text-ink-400">These map to player profile fields and show on the auction screen.</p>
          </div>
          {builtins.map((f) => (
            <div key={f.key} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-40 flex-1">
                <Input className="h-9" value={f.label} onChange={(e) => patch(f.key, { label: e.target.value })} aria-label="Field label" />
                <p className="mt-1 text-[11px] text-ink-400">{TYPE_LABEL[f.type]}{f.options ? ` · ${f.options.length} options` : ''}</p>
              </div>
              {f.locked ? (
                <span className="inline-flex items-center gap-1 text-xs text-ink-400"><Lock className="h-3 w-3" /> Always required</span>
              ) : (
                <div className="flex items-center gap-5">
                  <label className="flex items-center gap-2 text-xs text-ink-300">
                    <input type="checkbox" className="accent-lime-glow" disabled={!f.enabled} checked={f.required} onChange={(e) => patch(f.key, { required: e.target.checked })} /> Required
                  </label>
                  <Switch checked={f.enabled} onChange={(v) => patch(f.key, { enabled: v, required: v ? f.required : false })} />
                </div>
              )}
            </div>
          ))}
        </Card>

        <Card className="divide-y divide-white/5">
          <div className="flex items-center justify-between p-5">
            <div>
              <h3 className="font-semibold">Your questions</h3>
              <p className="text-xs text-ink-400">Jersey size, availability, fee paid, previous team… anything you need.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={addQuestion}><Plus className="h-4 w-4" /> Add question</Button>
          </div>
          {custom.length === 0 && <p className="p-5 text-sm text-ink-400">No custom questions yet.</p>}
          <Reorder.Group axis="y" values={custom} onReorder={setCustom} as="div">
            <AnimatePresence initial={false}>
              {custom.map((f, i) => (
                <Reorder.Item key={f.key} value={f} as="div" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-white/5 bg-ink-850/40 first:border-t-0">
                  <div className="flex gap-3 p-4">
                    <div className="flex flex-col items-center gap-1 pt-2 text-ink-400">
                      <GripVertical className="h-4 w-4 cursor-grab active:cursor-grabbing" aria-hidden />
                      <button onClick={() => move(i, -1)} aria-label="Move up" className="hover:text-white"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button onClick={() => move(i, 1)} aria-label="Move down" className="hover:text-white"><ArrowDown className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_160px]">
                      <Input placeholder="Question, e.g. Jersey size" value={f.label} onChange={(e) => patch(f.key, { label: e.target.value })} />
                      <Select value={f.type} onChange={(e) => patch(f.key, { type: e.target.value as FieldType, options: e.target.value === 'select' ? f.options ?? ['', ''] : undefined })}>
                        {(['text', 'textarea', 'number', 'tel', 'email', 'select'] as FieldType[]).map((ty) => <option key={ty} value={ty}>{TYPE_LABEL[ty]}</option>)}
                      </Select>
                      {f.type === 'select' && (
                        <Field className="sm:col-span-2" hint="One option per line">
                          <textarea
                            className="min-h-20 w-full rounded-xl border border-white/10 bg-ink-850/80 px-3.5 py-2 text-sm focus:border-lime-glow/60 focus:outline-none"
                            value={(f.options ?? []).join('\n')}
                            onChange={(e) => patch(f.key, { options: e.target.value.split('\n') })}
                          />
                        </Field>
                      )}
                      <div className="flex items-center gap-4 sm:col-span-2">
                        <label className="flex items-center gap-2 text-xs text-ink-300">
                          <input type="checkbox" className="accent-lime-glow" checked={f.required} onChange={(e) => patch(f.key, { required: e.target.checked })} /> Required
                        </label>
                        <button className="ml-auto inline-flex items-center gap-1 text-xs text-rose-hot hover:underline" onClick={() => setCustom(custom.filter((x) => x.key !== f.key))}>
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        </Card>

        <AnimatePresence>
          {dirty && (
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-lime-glow/30 bg-ink-800/95 p-3 pl-5 shadow-2xl backdrop-blur">
              <span className="text-sm">You have unsaved changes</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setFields(t.registrationFields); setDirty(false) }}>Discard</Button>
                <Button size="sm" onClick={save} loading={saving}><Save className="h-4 w-4" /> Save form</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="min-w-0 space-y-6 lg:sticky lg:top-24 lg:self-start">
        <Card className={cn('p-6 transition', t.registrationOpen && 'border-lime-glow/30')}>
          <Switch
            checked={t.registrationOpen}
            onChange={(v) => toggleSetting({ registrationOpen: v }, v ? 'Registrations are open' : 'Registrations closed')}
            label="Accept registrations"
            description={t.registrationOpen ? 'Anyone with the link can register.' : 'The link shows “registrations closed”.'}
          />
          <div className="my-5 h-px bg-white/5" />
          <Switch
            checked={t.requireApproval}
            onChange={(v) => toggleSetting({ requireApproval: v }, v ? 'New entries need approval' : 'New entries auto-approved')}
            label="Approve entries manually"
            description="Only approved players enter the auction."
          />
        </Card>
        <Card className="p-6">
          <h3 className="mb-3 font-semibold">Share with players</h3>
          {t.registrationOpen ? (
            <ShareLink url={url} title={`${t.name} registration`} message={`🏏 ${t.name} — register for the player auction here:`} />
          ) : (
            // Sharing while closed sends players to a "Registrations are closed" page, so open first.
            <div className="rounded-xl border border-gold/30 bg-gold/10 p-4">
              <p className="flex items-start gap-2 text-sm text-amber-100">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                Registrations are closed, so anyone opening the link would see “Registrations are closed”. Open them to get a link you can share.
              </p>
              <Button className="mt-3 w-full" onClick={() => toggleSetting({ registrationOpen: true }, 'Registrations are open — share the link')}>
                Open registrations
              </Button>
            </div>
          )}
          <button onClick={resetLink} className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-400 hover:text-white">
            <RefreshCw className="h-3 w-3" /> Reset link
          </button>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold">Collecting offline too?</h3>
          <p className="mt-1 text-sm text-ink-400">Download an Excel template with exactly these columns. Fill it in and upload it on the Players tab — both lists merge cleanly.</p>
          <Button className="mt-4" variant="secondary" size="sm" onClick={() => downloadTemplate(fields, t.name)}>
            <Download className="h-4 w-4" /> Excel template
          </Button>
        </Card>
        <p className="text-center text-xs text-ink-400">{t.stats.fromForm} players registered via the form</p>
      </div>
    </div>
  )
}
