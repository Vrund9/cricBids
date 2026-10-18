'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bug, Gift, KeyRound, Lightbulb, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Badge, Button, Card, Field, Input, Textarea } from './ui'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'

interface FeedbackItem {
  id: string
  type: 'SUGGESTION' | 'BUG'
  title: string
  message: string
  status: 'NEW' | 'REVIEWED' | 'RESOLVED' | 'REJECTED'
  points: number
  adminNote: string | null
  createdAt: string
}

interface Mine {
  items: FeedbackItem[]
  rewardPoints: number
  rules: { pointsPerEntry: number; rewardedPerDay: number; pointsPerBlock: number; pctPerBlock: number; maxPct: number }
}

const STATUS: Record<FeedbackItem['status'], { label: string; color: string }> = {
  NEW: { label: 'Received', color: '#38bdf8' },
  REVIEWED: { label: 'Reviewed', color: '#a78bfa' },
  RESOLVED: { label: 'Done', color: '#22c55e' },
  REJECTED: { label: 'Not accepted', color: '#ff4d6d' },
}

/** Suggestions and bug reports earn points; points come off add-on purchases. */
export function FeedbackAndRewards() {
  const { user, setUser } = useAuth()
  const [data, setData] = useState<Mine | null>(null)
  const [type, setType] = useState<FeedbackItem['type']>('SUGGESTION')
  const [form, setForm] = useState({ title: '', message: '' })
  const [sending, setSending] = useState(false)
  const load = useCallback(() => api<Mine>('/feedback/mine').then(setData).catch((e) => toast.error(e.message)), [])
  useEffect(() => {
    void load()
  }, [load])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      const r = await api<{ points: number; rewardPoints: number }>('/feedback', { body: { type, ...form, page: document.referrer ? new URL(document.referrer).pathname : undefined } })
      if (user) setUser({ ...user, rewardPoints: r.rewardPoints })
      toast.success(r.points ? `Thanks! +${r.points} reward points` : 'Thanks! (Daily reward limit reached — this one is still sent to the team)')
      setForm({ title: '', message: '' })
      await load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  const rules = data?.rules
  const points = data?.rewardPoints ?? user?.rewardPoints ?? 0
  const block = rules?.pointsPerBlock ?? 100
  const toNext = block - (points % block)
  const pct = Math.min(rules?.maxPct ?? 50, Math.floor(points / block) * (rules?.pctPerBlock ?? 10))

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-5 border-b border-white/5 p-6">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gold/10 text-gold"><Gift className="h-7 w-7" /></div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Feedback &amp; rewards</h2>
          <p className="text-sm text-ink-400">
            Tell us what to improve or what broke — earn {rules?.pointsPerEntry ?? 5} points each. {block} points = {rules?.pctPerBlock ?? 10}% off any add-on.
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl font-black text-gold">{points}</p>
          <p className="text-xs text-ink-400">points{pct ? ` · ${pct}% off ready` : ''}</p>
        </div>
      </div>
      <div className="px-6 pt-4">
        <div className="h-2 overflow-hidden rounded-full bg-white/5">
          <motion.div className="h-full rounded-full bg-gold-bright" initial={{ width: 0 }} animate={{ width: `${((points % block) / block) * 100}%` }} transition={{ type: 'spring', stiffness: 70, damping: 20 }} />
        </div>
        <p className="mt-1 text-xs text-ink-400">{toNext} more points to your next {rules?.pctPerBlock ?? 10}% off</p>
      </div>
      <form onSubmit={send} className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Type">
          {([['SUGGESTION', 'Suggestion', Lightbulb], ['BUG', 'Report a bug', Bug]] as const).map(([v, label, Icon]) => (
            <button key={v} type="button" role="radio" aria-checked={type === v} onClick={() => setType(v)} className={cn('flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition', type === v ? 'border-lime-glow/60 bg-lime-glow/10 text-lime-glow' : 'border-white/10 text-ink-300 hover:bg-white/5')}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
        <Field label={type === 'BUG' ? 'What went wrong?' : 'Your idea in a line'}>
          <Input required minLength={4} maxLength={120} placeholder={type === 'BUG' ? 'e.g. Purse didn’t update after undo' : 'e.g. Show the bid history on the big screen'} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Details" hint={type === 'BUG' ? 'What you did, what you expected, what happened instead.' : 'Why it would help your auctions.'}>
          <Textarea required minLength={15} maxLength={4000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </Field>
        <Button type="submit" loading={sending}><Sparkles className="h-4 w-4" /> Send · +{rules?.pointsPerEntry ?? 5} points</Button>
      </form>
      {data && data.items.length > 0 && (
        <ul className="divide-y divide-white/5 border-t border-white/5">
          {data.items.map((f) => (
            <li key={f.id} className="flex items-start gap-3 px-6 py-3">
              {f.type === 'BUG' ? <Bug className="mt-0.5 h-4 w-4 shrink-0 text-rose-hot" /> : <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-gold" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.title}</p>
                <p className="text-xs text-ink-400">{new Date(f.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}{f.adminNote ? ` · “${f.adminNote}”` : ''}</p>
              </div>
              <Badge color={STATUS[f.status].color}>{STATUS[f.status].label}</Badge>
              <span className={cn('w-12 text-right font-mono text-xs', f.status === 'REJECTED' ? 'text-ink-500 line-through' : 'text-gold')}>+{f.points}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/** One-time codes from the BidWicket team that unlock everything on this account. */
export function PlanCodeCard() {
  const { user, setUser } = useAuth()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  if (!user) return null
  const redeem = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/billing/redeem-code', { body: { code } })
      setUser({ ...user, fullAccess: true })
      setCode('')
      toast.success('Code applied — every add-on is unlocked on your account 🎉')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 font-semibold"><KeyRound className="h-4 w-4 text-sky-live" /> Plan activation</h2>
      {user.fullAccess ? (
        <p className="mt-2 rounded-xl bg-lime-glow/10 px-4 py-3 text-sm text-lime-glow">Full access is active on this account: extra teams, themes and auction fees are all free.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-400">Got a plan code from the BidWicket team? Enter it to unlock everything on this account. Each code works for one account.</p>
          <form onSubmit={redeem} className="mt-4 flex gap-2">
            <Input required minLength={4} maxLength={40} placeholder="BW-XXXX-XXXX" className="uppercase" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} aria-label="Plan code" />
            <Button type="submit" variant="secondary" loading={busy}>Activate</Button>
          </form>
        </>
      )}
    </Card>
  )
}
