'use client'

import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, CheckCircle2, FileSpreadsheet, Sparkles, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Modal, Select } from './ui'
import { api } from '@/lib/api'
import { autoMap, readWorkbook, rememberMapping, TARGETS, toPlayers, type MatchHow, type Sheet, type TargetKey } from '@/lib/excel'
import { cn } from '@/lib/cn'
import { useConfirm } from '@/components/confirm'

type Step = 'pick' | 'map' | 'done'

export function ImportWizard({ open, onClose, tournamentId, hasPlayers, locked, onImported }: { open: boolean; onClose: () => void; tournamentId: string; hasPlayers: boolean; locked: boolean; onImported: () => void }) {
  const [step, setStep] = useState<Step>('pick')
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [mapping, setMapping] = useState<Record<string, TargetKey>>({})
  const [how, setHow] = useState<Record<string, MatchHow>>({})
  const [mode, setMode] = useState<'append' | 'replace'>('append')
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [result, setResult] = useState<{ created: number; duplicates: number; total: number } | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const confirm = useConfirm()

  const reset = () => {
    setStep('pick')
    setSheet(null)
    setFile(null)
    setResult(null)
    setMode('append')
  }
  const close = () => {
    onClose()
    setTimeout(reset, 300)
  }

  const load = async (f: File, sheetName?: string) => {
    if (!/\.(xlsx|xls|csv|ods)$/i.test(f.name)) {
      toast.error('Please choose an .xlsx, .xls, .csv or .ods file')
      return
    }
    setBusy(true)
    try {
      const s = await readWorkbook(f, sheetName)
      if (!s.rows.length) throw new Error('That sheet has no rows')
      setFile(f)
      setSheet(s)
      const guess = autoMap(s.headers, s.rows)
      setMapping(guess.mapping)
      setHow(guess.how)
      setStep('map')
    } catch (e) {
      toast.error((e as Error).message || 'Could not read that file')
    } finally {
      setBusy(false)
    }
  }

  const players = useMemo(() => (sheet ? toPlayers(sheet.rows, mapping) : []), [sheet, mapping])
  const nameMapped = Object.values(mapping).includes('name')
  const autoCount = Object.values(mapping).filter((v) => v !== 'extra' && v !== 'ignore').length
  const unsure = Object.entries(how).filter(([h, v]) => (v === 'similar' || v === 'content') && mapping[h] !== 'extra' && mapping[h] !== 'ignore').length
  const unmatched = Object.entries(how).filter(([h, v]) => v === 'none' && mapping[h] === 'extra').length

  const submit = async () => {
    if (mode === 'replace' && !(await confirm({ title: 'Replace all players?', message: 'Every current player is deleted first, then this file is imported.', confirmLabel: 'Replace players', danger: true }))) return
    setBusy(true)
    try {
      const res = await api<{ created: number; duplicates: number; total: number }>(`/tournaments/${tournamentId}/players/import`, { body: { players, mode } })
      rememberMapping(mapping)
      setResult(res)
      setStep('done')
      onImported()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title="Import players from Excel" wide>
      <AnimatePresence mode="wait">
        {step === 'pick' && (
          <motion.div key="pick" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <button
              type="button"
              onClick={() => input.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDrag(true)
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDrag(false)
                const f = e.dataTransfer.files?.[0]
                if (f) void load(f)
              }}
              className={cn('flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition', drag ? 'border-lime-glow bg-lime-glow/5' : 'border-white/10 hover:border-white/25 hover:bg-white/[0.02]')}
            >
              <motion.div animate={drag ? { y: -6, scale: 1.08 } : { y: 0, scale: 1 }} className="grid h-14 w-14 place-items-center rounded-2xl bg-lime-glow/10 text-lime-glow">
                <UploadCloud className="h-7 w-7" />
              </motion.div>
              <p className="font-display text-lg font-semibold">{busy ? 'Reading file…' : 'Drop your Excel here or click to browse'}</p>
              <p className="max-w-md text-sm text-ink-400">.xlsx, .xls, .csv — including Google Forms exports. We’ll detect the columns automatically.</p>
            </button>
            <input ref={input} type="file" accept=".xlsx,.xls,.csv,.ods" className="hidden" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
          </motion.div>
        )}

        {step === 'map' && sheet && (
          <motion.div key="map" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-lime-glow/10 px-4 py-3 text-sm text-lime-glow">
              <Sparkles className="h-4 w-4" />
              <span>
                Matched <b>{autoCount}</b> of {sheet.headers.length} columns automatically in <b>{sheet.fileName}</b> · {sheet.rows.length} rows
              </span>
              {sheet.sheetNames.length > 1 && (
                <Select className="ml-auto h-8 w-auto text-xs" value={sheet.sheet} onChange={(e) => file && load(file, e.target.value)}>
                  {sheet.sheetNames.map((s) => <option key={s}>{s}</option>)}
                </Select>
              )}
            </div>

            {(unsure > 0 || unmatched > 0 || !nameMapped) && (
              <div className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-ink-100">
                <p className="font-semibold text-gold">Your columns don’t all use our names — that’s fine.</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-200">
                  {!nameMapped && <li>Choose which column holds the <b>player name</b> — it’s the only one we need.</li>}
                  {unsure > 0 && <li>{unsure} column{unsure > 1 ? 's were' : ' was'} matched by a similar name or by the values inside (marked <b>check</b>). Have a quick look.</li>}
                  {unmatched > 0 && <li>{unmatched} column{unmatched > 1 ? 's' : ''} didn’t match a player field and will be kept as <b>extra info</b> on each player — nothing is lost. Pick a field from the dropdown to change that.</li>}
                </ul>
                <p className="mt-1 text-xs text-ink-400">Your choices are remembered, so the next file with the same headers maps itself.</p>
              </div>
            )}

            <div className="overflow-hidden rounded-xl border border-white/10">
              <div className="scroll-thin max-h-[46vh] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-ink-800 text-left text-xs text-ink-400">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Column in your file</th>
                      <th className="px-4 py-2.5 font-medium">Sample</th>
                      <th className="px-4 py-2.5 font-medium">Import as</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sheet.headers.map((h) => {
                      const sample = sheet.rows.find((r) => String(r[h] ?? '').trim())?.[h]
                      const v = mapping[h]
                      return (
                        <tr key={h} className={cn(v === 'ignore' && 'opacity-50')}>
                          <td className="max-w-48 px-4 py-2 font-medium">
                            <span className="block truncate">{h}</span>
                            {how[h] && how[h] !== 'none' && v !== 'extra' && v !== 'ignore' && (
                              <span className={cn('mt-0.5 inline-block rounded-full px-1.5 text-[10px] font-bold uppercase tracking-wide', how[h] === 'similar' || how[h] === 'content' ? 'bg-gold/15 text-gold' : 'bg-lime-glow/10 text-lime-glow')}>
                                {how[h] === 'similar' ? 'check · similar name' : how[h] === 'content' ? 'check · from values' : how[h] === 'remembered' ? 'remembered' : 'matched'}
                              </span>
                            )}
                          </td>
                          <td className="max-w-56 truncate px-4 py-2 text-ink-400">{sample instanceof Date ? sample.toLocaleDateString() : String(sample ?? '—')}</td>
                          <td className="px-4 py-2">
                            <Select
                              className={cn('h-9 text-xs', v !== 'extra' && v !== 'ignore' && 'border-lime-glow/40 text-lime-glow')}
                              value={v}
                              onChange={(e) => {
                                const next = e.target.value as TargetKey
                                setMapping((m) => {
                                  const copy = { ...m }
                                  // A field can only come from one column.
                                  if (next !== 'extra' && next !== 'ignore') for (const k of Object.keys(copy)) if (copy[k] === next) copy[k] = 'extra'
                                  copy[h] = next
                                  return copy
                                })
                                setHow((x) => ({ ...x, [h]: 'remembered' }))
                              }}
                            >
                              {TARGETS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                              <option value="extra">Keep as extra info</option>
                              <option value="ignore">Ignore</option>
                            </Select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {hasPlayers && !locked && (
              <div className="grid gap-2 sm:grid-cols-2">
                {(['append', 'replace'] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setMode(m)} className={cn('rounded-xl border p-3 text-left text-sm transition', mode === m ? 'border-lime-glow/60 bg-lime-glow/5' : 'border-white/10 hover:bg-white/[0.03]')}>
                    <p className="font-semibold">{m === 'append' ? 'Add to existing players' : 'Replace all players'}</p>
                    <p className="text-xs text-ink-400">{m === 'append' ? 'Duplicates (same name + mobile) are skipped.' : 'Deletes current players first.'}</p>
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="ghost" onClick={reset}><ArrowLeft className="h-4 w-4" /> Different file</Button>
              <div className="flex items-center gap-3">
                {!nameMapped && <span className="text-sm text-rose-hot">Pick the column that has player names</span>}
                <Button onClick={submit} loading={busy} disabled={!nameMapped || !players.length}>
                  <FileSpreadsheet className="h-4 w-4" /> Import {players.length} players
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'done' && result && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3 py-10 text-center">
            <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
              <CheckCircle2 className="h-14 w-14 text-lime-glow" />
            </motion.div>
            <h3 className="font-display text-2xl font-bold">{result.created} players imported</h3>
            {result.duplicates > 0 && <p className="text-sm text-ink-300">{result.duplicates} duplicates skipped</p>}
            <Button className="mt-4" onClick={close}>Done</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}
