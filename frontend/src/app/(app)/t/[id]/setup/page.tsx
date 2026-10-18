'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Layers, ListOrdered, Minus, Plus, Shuffle, Sparkles, Timer } from 'lucide-react'
import { toast } from 'sonner'
import { useTournament } from '@/components/tournament-context'
import { Button, Card, Input, PageLoader, Switch } from '@/components/ui'
import { api } from '@/lib/api'
import { money, moneyShort } from '@/lib/format'
import type { IncrementTier, PlayerOrder } from '@/lib/types'
import { cn } from '@/lib/cn'

interface Suggestions {
  players: number
  teamCount: number
  perTeam: number
  minSquad: number
  maxSquad: number
  basePrice: number
  teamPurse: number
  categories: { name: string; count: number }[]
  warnings: string[]
}

interface Answers {
  teamCount: number
  teamPurse: number
  basePrice: number
  categoryBasePrices: Record<string, number>
  minSquad: number
  maxSquad: number
  incrementMode: 'flat' | 'tiered' | 'custom'
  bidIncrements: IncrementTier[]
  playerOrder: PlayerOrder
  bidTimerSec: number
  remoteBidding: boolean
}

/** Round to a "nice" auction number: 1, 2, 2.5, 5 × 10^n */
function nice(n: number) {
  if (n <= 0) return 1
  const p = Math.pow(10, Math.floor(Math.log10(n)))
  const m = n / p
  const f = m < 1.5 ? 1 : m < 2.25 ? 2 : m < 3.5 ? 2.5 : m < 7.5 ? 5 : 10
  return Math.round(f * p)
}

function presetIncrements(mode: 'flat' | 'tiered', base: number): IncrementTier[] {
  const step = nice(base / 4)
  if (mode === 'flat') return [{ from: 0, step }]
  return [
    { from: 0, step },
    { from: nice(base * 5), step: step * 2 },
    { from: nice(base * 10), step: step * 4 },
  ]
}

const QUESTIONS = ['teams', 'purse', 'base', 'squad', 'increments', 'order', 'extras', 'review'] as const
type Q = (typeof QUESTIONS)[number]

export default function SetupPage() {
  const { t } = useTournament()
  return t.status === 'COMPLETED' ? <RulesSummary /> : <SetupWizard />
}

const ORDER_LABEL: Record<PlayerOrder, string> = {
  RANDOM: 'Random order',
  CATEGORY_RANDOM: 'Random within each category',
  SEQUENTIAL: 'In list order',
}

/** After the auction the rules are history: one read-only summary, no wizard steps. */
function RulesSummary() {
  const { t } = useTournament()
  const cur = t.currency
  const cats = Object.entries(t.categoryBasePrices ?? {})
  const rows: [string, React.ReactNode][] = [
    ['Teams', t.teams.length],
    ['Purse per team', money(t.teamPurse, cur)],
    ['Base price', money(t.basePrice, cur)],
    ...(cats.length ? [['Category base prices', cats.map(([k, v]) => `${k}: ${moneyShort(v, cur)}`).join(' · ')] as [string, React.ReactNode]] : []),
    ['Squad size', `${t.minSquad} – ${t.maxSquad} players`],
    ['Bid steps', t.bidIncrements.map((x) => (x.from ? `+${moneyShort(x.step, cur)} from ${moneyShort(x.from, cur)}` : `+${moneyShort(x.step, cur)}`)).join(' · ')],
    ['Player order', ORDER_LABEL[t.playerOrder]],
    ['Bid timer', t.bidTimerSec ? `${t.bidTimerSec} seconds` : 'Off'],
    ['Remote bidding', t.remoteBidding ? 'On — owners bid from their phones' : 'Off'],
  ]
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold">Auction rules</h2>
        <p className="text-sm text-ink-400">The rules this auction ran with. It’s complete, so they can’t be changed.</p>
      </div>
      <Card className="divide-y divide-white/5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-6 py-4">
            <dt className="text-sm text-ink-400">{label}</dt>
            <dd className="text-right text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </Card>
    </div>
  )
}

function SetupWizard() {
  const { t, update, reload } = useTournament()
  const router = useRouter()
  const [sug, setSug] = useState<Suggestions | null>(null)
  const [a, setA] = useState<Answers | null>(null)
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [saving, setSaving] = useState(false)
  const started = ['LIVE', 'PAUSED', 'COMPLETED'].includes(t.status)

  useEffect(() => {
    api<Suggestions>(`/tournaments/${t.id}/suggestions`).then((s) => {
      setSug(s)
      const useSaved = t.setupComplete
      const base = useSaved ? t.basePrice : s.basePrice
      const incs = useSaved ? t.bidIncrements : presetIncrements('tiered', base)
      setA({
        teamCount: t.teams.length || s.teamCount,
        teamPurse: useSaved ? t.teamPurse : s.teamPurse,
        basePrice: base,
        categoryBasePrices: t.categoryBasePrices ?? {},
        minSquad: useSaved ? t.minSquad : s.minSquad,
        maxSquad: useSaved ? t.maxSquad : s.maxSquad,
        incrementMode: !useSaved ? 'tiered' : incs.length === 1 ? 'flat' : 'custom',
        bidIncrements: incs,
        playerOrder: useSaved ? t.playerOrder : s.categories.length > 1 ? 'CATEGORY_RANDOM' : 'RANDOM',
        bidTimerSec: t.bidTimerSec,
        remoteBidding: t.remoteBidding,
      })
    }).catch((e) => toast.error(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.id])

  const q: Q = QUESTIONS[step]
  const set = (patch: Partial<Answers>) => setA((x) => (x ? { ...x, ...patch } : x))

  const errors = useMemo(() => {
    if (!a) return [] as string[]
    const e: string[] = []
    if (a.minSquad > a.maxSquad) e.push('Minimum squad can’t be more than maximum.')
    if (a.basePrice * a.minSquad > a.teamPurse) e.push(`A purse of ${money(a.teamPurse, t.currency)} can’t buy ${a.minSquad} players at ${money(a.basePrice, t.currency)} each.`)
    return e
  }, [a, t.currency])

  const warnings = useMemo(() => {
    if (!a || !sug) return [] as string[]
    const w: string[] = []
    if (sug.players < a.teamCount * a.minSquad) w.push(`You have ${sug.players} approved players, but ${a.teamCount} teams × ${a.minSquad} minimum = ${a.teamCount * a.minSquad}. Some teams won’t fill their squad.`)
    if (sug.players === 0) w.push('No players yet — add them before going live.')
    return w
  }, [a, sug])

  if (!sug || !a) return <PageLoader />

  const go = async (d: 1 | -1) => {
    if (d === 1 && q === 'teams' && !started && a.teamCount !== t.teams.length) {
      try {
        await api(`/tournaments/${t.id}/teams/count`, { method: 'PUT', body: { count: a.teamCount } })
        await reload()
      } catch (e) {
        return toast.error((e as Error).message)
      }
    }
    setDir(d)
    setStep((s) => Math.min(QUESTIONS.length - 1, Math.max(0, s + d)))
  }

  const finish = async () => {
    if (errors.length) return toast.error(errors[0])
    setSaving(true)
    try {
      await update({
        ...(started ? {} : { teamPurse: a.teamPurse }),
        basePrice: a.basePrice,
        categoryBasePrices: Object.keys(a.categoryBasePrices).length ? a.categoryBasePrices : null,
        minSquad: a.minSquad,
        maxSquad: a.maxSquad,
        bidIncrements: a.bidIncrements,
        playerOrder: a.playerOrder,
        bidTimerSec: a.bidTimerSec,
        remoteBidding: a.remoteBidding,
        setupComplete: true,
      })
      toast.success('Auction rules saved')
      router.push(`/t/${t.id}/auction`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const cur = t.currency
  const perPlayer = Math.round(a.teamPurse / Math.max(1, a.minSquad))

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-2">
        {QUESTIONS.map((name, i) => (
          <button key={name} onClick={() => { setDir(i > step ? 1 : -1); setStep(i) }} aria-label={`Question ${i + 1}`} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <motion.span className="block h-full rounded-full bg-lime-bright" initial={false} animate={{ width: i <= step ? '100%' : '0%' }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
          </button>
        ))}
      </div>

      <Card className="relative min-h-[460px] overflow-hidden p-6 sm:p-10">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={q}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && q !== 'review' && (e.target as HTMLElement).tagName === 'INPUT') {
                e.preventDefault()
                void go(1)
              }
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-glow">Question {step + 1} of {QUESTIONS.length}</p>

            {q === 'teams' && (
              <Question title="How many teams are bidding?" hint={sug.players ? `With ${sug.players} players, ${a.teamCount} teams get about ${Math.floor(sug.players / a.teamCount)} players each.` : 'You can rename teams and add logos later.'}>
                {started ? (
                  <p className="text-ink-300">The auction has started, so the number of teams is locked at {t.teams.length}.</p>
                ) : (
                  <>
                    <Stepper value={a.teamCount} min={2} max={16} onChange={(v) => set({ teamCount: v })} />
                    <Chips options={[4, 6, 8, 10, 12].map((n) => ({ label: `${n} teams`, value: n }))} value={a.teamCount} onChange={(v) => set({ teamCount: v })} />
                  </>
                )}
              </Question>
            )}

            {q === 'purse' && (
              <Question title="How much can each team spend?" hint={`That’s about ${moneyShort(perPlayer, cur)} per player for a ${a.minSquad}-player squad.`}>
                {started ? (
                  <p className="text-ink-300">Purse is locked at {money(t.teamPurse, cur)} after the auction starts.</p>
                ) : (
                  <>
                    <BigNumber value={a.teamPurse} onChange={(v) => set({ teamPurse: v })} currency={cur} />
                    <Chips
                      options={[...new Set([sug.teamPurse, nice(sug.teamPurse * 2), 100000, 500000, 1000000])].sort((x, y) => x - y).map((n) => ({ label: moneyShort(n, cur) + (n === sug.teamPurse ? ' · suggested' : ''), value: n }))}
                      value={a.teamPurse}
                      onChange={(v) => set({ teamPurse: v })}
                    />
                  </>
                )}
              </Question>
            )}

            {q === 'base' && (
              <Question title="What’s the base price for a player?" hint="Bidding for every player opens at this amount.">
                <BigNumber value={a.basePrice} onChange={(v) => set({ basePrice: v, bidIncrements: a.incrementMode === 'custom' ? a.bidIncrements : presetIncrements(a.incrementMode, v) })} currency={cur} />
                <Chips options={[500, 1000, 2000, 5000, 10000, 20000].map((n) => ({ label: moneyShort(n, cur), value: n }))} value={a.basePrice} onChange={(v) => set({ basePrice: v, bidIncrements: a.incrementMode === 'custom' ? a.bidIncrements : presetIncrements(a.incrementMode, v) })} />
                {sug.categories.length > 0 && (
                  <div className="mt-8 space-y-3">
                    <p className="flex items-center gap-2 text-sm font-semibold"><Layers className="h-4 w-4 text-gold" /> Different base price per category?</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {sug.categories.map((c) => (
                        <label key={c.name} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                          <span className="w-24 truncate text-sm font-semibold">{c.name} <span className="text-xs font-normal text-ink-400">({c.count})</span></span>
                          <Input
                            type="number"
                            min={0}
                            className="h-9"
                            placeholder={String(a.basePrice)}
                            value={a.categoryBasePrices[c.name] ?? ''}
                            onChange={(e) => {
                              const v = Number(e.target.value)
                              const next = { ...a.categoryBasePrices }
                              if (v > 0) next[c.name] = v
                              else delete next[c.name]
                              set({ categoryBasePrices: next })
                            }}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </Question>
            )}

            {q === 'squad' && (
              <Question title="How many players per team?" hint="Teams must keep enough purse to reach the minimum; they can’t buy beyond the maximum.">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <p className="mb-3 text-sm text-ink-300">Minimum squad</p>
                    <Stepper value={a.minSquad} min={1} max={50} onChange={(v) => set({ minSquad: v, maxSquad: Math.max(v, a.maxSquad) })} />
                  </div>
                  <div>
                    <p className="mb-3 text-sm text-ink-300">Maximum squad</p>
                    <Stepper value={a.maxSquad} min={a.minSquad} max={60} onChange={(v) => set({ maxSquad: v })} />
                  </div>
                </div>
                {sug.perTeam > 0 && <p className="mt-6 text-sm text-ink-400"><Sparkles className="mr-1 inline h-4 w-4 text-lime-glow" /> Your pool supports about {sug.perTeam} players per team.</p>}
              </Question>
            )}

            {q === 'increments' && (
              <Question title="How should bids go up?" hint="Each click on a team adds one step to the current bid.">
                <div className="grid gap-3 sm:grid-cols-3">
                  {(['flat', 'tiered', 'custom'] as const).map((m) => (
                    <OptionCard
                      key={m}
                      active={a.incrementMode === m}
                      onClick={() => set({ incrementMode: m, bidIncrements: m === 'custom' ? a.bidIncrements : presetIncrements(m, a.basePrice) })}
                      title={m === 'flat' ? 'Same step' : m === 'tiered' ? 'IPL-style tiers' : 'Custom'}
                      text={m === 'flat' ? `Always +${moneyShort(presetIncrements('flat', a.basePrice)[0].step, cur)}` : m === 'tiered' ? 'Bigger jumps as the price climbs' : 'Set your own tiers'}
                    />
                  ))}
                </div>
                <div className="mt-6 space-y-2">
                  {a.bidIncrements.map((tier, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-14 text-ink-400">{i === 0 ? 'From' : 'Above'}</span>
                      <Input type="number" min={0} disabled={i === 0 || a.incrementMode !== 'custom'} className="h-9" value={tier.from} onChange={(e) => set({ bidIncrements: a.bidIncrements.map((x, j) => (j === i ? { ...x, from: Number(e.target.value) } : x)) })} />
                      <span className="text-ink-400">step</span>
                      <Input type="number" min={1} disabled={a.incrementMode !== 'custom'} className="h-9" value={tier.step} onChange={(e) => set({ bidIncrements: a.bidIncrements.map((x, j) => (j === i ? { ...x, step: Math.max(1, Number(e.target.value)) } : x)) })} />
                      {a.incrementMode === 'custom' && a.bidIncrements.length > 1 && i > 0 && (
                        <button className="text-ink-400 hover:text-rose-hot" onClick={() => set({ bidIncrements: a.bidIncrements.filter((_, j) => j !== i) })} aria-label="Remove tier"><Minus className="h-4 w-4" /></button>
                      )}
                    </div>
                  ))}
                  {a.incrementMode === 'custom' && a.bidIncrements.length < 6 && (
                    <Button size="sm" variant="ghost" onClick={() => { const last = a.bidIncrements[a.bidIncrements.length - 1]; set({ bidIncrements: [...a.bidIncrements, { from: Math.max(last.from * 2, a.basePrice * 5), step: last.step * 2 }] }) }}>
                      <Plus className="h-4 w-4" /> Add tier
                    </Button>
                  )}
                </div>
                <p className="mt-4 text-xs text-ink-400">Example: {exampleLadder(a.basePrice, a.bidIncrements).map((n) => moneyShort(n, cur)).join(' → ')} …</p>
              </Question>
            )}

            {q === 'order' && (
              <Question title="In what order should players come up?" hint="Random order is drawn with a secure shuffle — nobody can predict it, not even you.">
                <div className="grid gap-3">
                  <OptionCard icon={<Shuffle className="h-5 w-5" />} active={a.playerOrder === 'RANDOM'} onClick={() => set({ playerOrder: 'RANDOM' })} title="Completely random" text="The classic — anyone can come up next." />
                  <OptionCard icon={<Layers className="h-5 w-5" />} active={a.playerOrder === 'CATEGORY_RANDOM'} onClick={() => set({ playerOrder: 'CATEGORY_RANDOM' })} title="Random within categories" text={sug.categories.length ? `${sug.categories.map((c) => c.name).join(' → ')} — highest base price first, random inside each.` : 'Set categories on the Players tab to use this.'} />
                  <OptionCard icon={<ListOrdered className="h-5 w-5" />} active={a.playerOrder === 'SEQUENTIAL'} onClick={() => set({ playerOrder: 'SEQUENTIAL' })} title="In list order" text="Same order as your Excel / registrations." />
                </div>
              </Question>
            )}

            {q === 'extras' && (
              <Question title="A couple of finishing touches" hint="You can change these any time, even mid-auction.">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Timer className="h-4 w-4 text-sky-live" /> Bid countdown on screen</p>
                <Chips options={[{ label: 'Off', value: 0 }, { label: '10s', value: 10 }, { label: '20s', value: 20 }, { label: '30s', value: 30 }, { label: '60s', value: 60 }]} value={a.bidTimerSec} onChange={(v) => set({ bidTimerSec: v })} />
                <p className="mt-2 text-xs text-ink-400">Resets with every bid. Shows “going once… twice…” — you still bring the hammer down.</p>
                <div className="mt-8 rounded-2xl border border-white/10 p-4">
                  <Switch checked={a.remoteBidding} onChange={(v) => set({ remoteBidding: v })} label="Let team owners bid from their phones" description="Each team gets a private link on the Teams tab." />
                </div>
              </Question>
            )}

            {q === 'review' && (
              <Question title="Looks good?" hint="Here’s your auction. Save it and head to the control room.">
                <dl className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['Teams', `${started ? t.teams.length : a.teamCount}`],
                    ['Purse per team', money(started ? t.teamPurse : a.teamPurse, cur)],
                    ['Base price', money(a.basePrice, cur) + (Object.keys(a.categoryBasePrices).length ? ` (+${Object.keys(a.categoryBasePrices).length} categories)` : '')],
                    ['Squad size', `${a.minSquad} – ${a.maxSquad}`],
                    ['Bid steps', a.bidIncrements.map((x) => `+${moneyShort(x.step, cur)}`).join(' / ')],
                    ['Order', a.playerOrder === 'RANDOM' ? 'Random' : a.playerOrder === 'CATEGORY_RANDOM' ? 'Random by category' : 'List order'],
                    ['Countdown', a.bidTimerSec ? `${a.bidTimerSec}s` : 'Off'],
                    ['Remote bidding', a.remoteBidding ? 'On' : 'Off'],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                      <dt className="text-xs text-ink-400">{k}</dt>
                      <dd className="mt-0.5 font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
                {[...errors, ...warnings].map((w) => (
                  <p key={w} className={cn('mt-4 flex gap-2 rounded-xl p-3 text-sm', errors.includes(w) ? 'bg-rose-hot/10 text-rose-hot' : 'bg-gold/10 text-gold')}>
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {w}
                  </p>
                ))}
              </Question>
            )}
          </motion.div>
        </AnimatePresence>
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => go(-1)} disabled={step === 0}><ArrowLeft className="h-4 w-4" /> Back</Button>
        {q === 'review' ? (
          <Button size="lg" onClick={finish} loading={saving} disabled={errors.length > 0}><Check className="h-4 w-4" /> Save &amp; open control room</Button>
        ) : (
          <Button size="lg" onClick={() => go(1)}>Next <ArrowRight className="h-4 w-4" /></Button>
        )}
      </div>
    </div>
  )
}

function exampleLadder(base: number, tiers: IncrementTier[]) {
  const sorted = [...tiers].sort((x, y) => x.from - y.from)
  const out = [base]
  let v = base
  for (let i = 0; i < 5; i++) {
    let step = sorted[0]?.step ?? 1
    for (const t of sorted) if (v >= t.from) step = t.step
    v += step
    out.push(v)
  }
  return out
}

function Question({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">{title}</h2>
      {hint && <p className="mt-2 text-ink-300">{hint}</p>}
      <div className="mt-8">{children}</div>
    </div>
  )
}

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex items-center gap-4">
      <button onClick={() => onChange(Math.max(min, value - 1))} className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-30" disabled={value <= min} aria-label="Decrease"><Minus className="h-5 w-5" /></button>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} className="w-20 text-center font-display text-6xl font-extrabold tabular">{value}</motion.span>
      </AnimatePresence>
      <button onClick={() => onChange(Math.min(max, value + 1))} className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-30" disabled={value >= max} aria-label="Increase"><Plus className="h-5 w-5" /></button>
    </div>
  )
}

function BigNumber({ value, onChange, currency }: { value: number; onChange: (v: number) => void; currency: string }) {
  return (
    <div>
      <div className="flex items-center gap-3 border-b-2 border-white/10 pb-2 focus-within:border-lime-glow">
        <input type="number" min={1} inputMode="numeric" autoFocus value={value || ''} onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value))))} className="w-full bg-transparent font-display text-5xl font-extrabold tabular outline-none sm:text-6xl" aria-label="Amount" />
      </div>
      <p className="mt-2 text-sm text-ink-400">{money(value, currency)}</p>
    </div>
  )
}

function Chips<T extends number>({ options, value, onChange }: { options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.label} onClick={() => onChange(o.value)} className={cn('rounded-full border px-4 py-2 text-sm font-semibold transition', value === o.value ? 'border-lime-glow bg-lime-bright text-on-accent' : 'border-white/10 text-ink-200 hover:border-white/25')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function OptionCard({ active, onClick, title, text, icon }: { active: boolean; onClick: () => void; title: string; text: string; icon?: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn('flex items-start gap-3 rounded-2xl border p-4 text-left transition', active ? 'border-lime-glow/60 bg-lime-glow/[0.06]' : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]')}>
      {icon && <span className={cn('mt-0.5', active ? 'text-lime-glow' : 'text-ink-400')}>{icon}</span>}
      <span className="flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-ink-400">{text}</span>
      </span>
      <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full border', active ? 'border-lime-glow bg-lime-bright text-on-accent' : 'border-white/20')}>{active && <Check className="h-3 w-3" />}</span>
    </button>
  )
}
