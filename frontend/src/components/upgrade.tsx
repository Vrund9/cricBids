'use client'

import Link from 'next/link'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Check, Crown, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge, Button, Card, Modal } from './ui'
import { useTournament } from './tournament-context'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { COMPARISON, PLANS } from '@/lib/plans'

const UpgradeContext = createContext<{ openUpgrade: (reason?: string) => void }>({ openUpgrade: () => undefined })

export const useUpgrade = () => useContext(UpgradeContext)

/** Owns the upgrade dialog for a tournament. Any API "PLAN_LIMIT" error opens it automatically. */
export function UpgradeProvider({ children }: { children: React.ReactNode }) {
  const { t, reload } = useTournament()
  const { user, setUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string | undefined>()
  const [busy, setBusy] = useState<string | null>(null)

  const openUpgrade = useCallback((r?: string) => {
    setReason(r)
    setOpen(true)
  }, [])

  useEffect(() => {
    const on = (e: Event) => openUpgrade((e as CustomEvent<string>).detail)
    window.addEventListener('cricbid:plan-limit', on)
    return () => window.removeEventListener('cricbid:plan-limit', on)
  }, [openUpgrade])

  const demo = t.planInfo.billingMode === 'demo'
  const buy = async (kind: 'pro' | 'season') => {
    setBusy(kind)
    try {
      if (kind === 'pro') await api(`/billing/tournaments/${t.id}/pro`, { body: {} })
      else {
        const r = await api<{ seasonPassUntil: string }>('/billing/season-pass', { body: {} })
        if (user) setUser({ ...user, seasonPassUntil: r.seasonPassUntil })
      }
      await reload()
      toast.success(kind === 'pro' ? `${t.name} is now Pro 🎉` : 'Season Pass active — every tournament is Pro 🎉')
      setOpen(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const pro = PLANS.find((p) => p.id === 'pro')!
  const season = PLANS.find((p) => p.id === 'season')!

  return (
    <UpgradeContext.Provider value={{ openUpgrade }}>
      {children}
      <Modal open={open} onClose={() => setOpen(false)} title={<span className="flex items-center gap-2"><Crown className="h-5 w-5 text-gold" /> Upgrade {t.name}</span>} wide>
        {reason && <p className="mb-5 rounded-xl bg-gold/10 px-4 py-3 text-sm text-gold">{reason}</p>}
        <div className="grid gap-4 md:grid-cols-2">
          {[{ plan: pro, kind: 'pro' as const, note: 'Just this tournament' }, { plan: season, kind: 'season' as const, note: 'All your tournaments for a year' }].map(({ plan, kind, note }, i) => (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className={`flex h-full flex-col p-5 ${plan.highlight ? 'border-lime-glow/40' : ''}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                  {plan.highlight && <Badge color="#c8ff2e">Popular</Badge>}
                </div>
                <p className="mt-1 text-xs text-ink-400">{note}</p>
                <p className="mt-4 font-display text-4xl font-black">{plan.price}<span className="ml-1 text-sm font-medium text-ink-400">{plan.priceNote}</span></p>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {plan.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-lime-glow" />{f}</li>)}
                </ul>
                <Button className="mt-5 w-full" variant={plan.highlight ? 'primary' : 'secondary'} loading={busy === kind} disabled={!!busy} onClick={() => buy(kind)}>
                  <Sparkles className="h-4 w-4" /> {demo ? `${plan.cta} (demo — no charge)` : plan.cta}
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-left text-xs text-ink-400">
              <tr><th className="px-4 py-2 font-medium">Feature</th><th className="px-4 py-2 font-medium">Free</th><th className="px-4 py-2 font-medium">Pro</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {COMPARISON.map((r) => (
                <tr key={r.feature}>
                  <td className="px-4 py-2 text-ink-200">{r.feature}</td>
                  {[r.free, r.pro].map((v, i) => (
                    <td key={i} className="px-4 py-2">{v === true ? <Check className="h-4 w-4 text-lime-glow" /> : v === false ? <X className="h-4 w-4 text-ink-500" /> : v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-center text-xs text-ink-400">
          {demo ? 'Demo billing is on: upgrades activate instantly without payment. ' : ''}
          <Link href="/pricing" target="_blank" className="font-semibold text-ink-200 hover:text-white">See full pricing</Link>
        </p>
      </Modal>
    </UpgradeContext.Provider>
  )
}

/** Compact plan status for the tournament overview. */
export function PlanCard() {
  const { t } = useTournament()
  const { openUpgrade } = useUpgrade()
  const info = t.planInfo
  const isPro = info.plan === 'PRO'
  return (
    <Card className={`p-6 ${isPro ? 'border-gold/30' : ''}`}>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold"><Crown className={`h-4 w-4 ${isPro ? 'text-gold' : 'text-ink-400'}`} /> {isPro ? 'Pro' : 'Free plan'}</h3>
        {!isPro && <Button size="sm" variant="gold" onClick={() => openUpgrade()}>Upgrade</Button>}
      </div>
      <p className="mt-1 text-sm text-ink-400">
        {info.source === 'SEASON_PASS' && info.seasonPassUntil
          ? `Season Pass active until ${new Date(info.seasonPassUntil).toLocaleDateString(undefined, { dateStyle: 'medium' })}`
          : isPro
            ? 'All features unlocked for this tournament.'
            : `Up to ${info.limits.maxTeams} teams and ${info.limits.maxPlayers} players. Remote bidding and branding need Pro.`}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
        <div className="rounded-xl bg-white/[0.03] p-2"><p className="font-display text-lg font-bold">{t.teams.length}/{info.limits.maxTeams}</p><p className="text-ink-400">teams</p></div>
        <div className="rounded-xl bg-white/[0.03] p-2"><p className="font-display text-lg font-bold">{t.stats.players}/{info.limits.maxPlayers}</p><p className="text-ink-400">players</p></div>
      </div>
    </Card>
  )
}
