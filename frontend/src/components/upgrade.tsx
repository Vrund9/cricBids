'use client'

import Link from 'next/link'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Check, Crown, Dices, Gift, Minus, Palette, Plus, Shield, Sparkles, Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Card, Modal, Switch } from './ui'
import { useTournament } from './tournament-context'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import { uiFlags } from '@/lib/flags'

interface Preset {
  teams?: boolean
  theme?: boolean
  auctionFee?: boolean
  random?: boolean
}

const UpgradeContext = createContext<{ openUpgrade: (reason?: string) => void }>({ openUpgrade: () => undefined })

export const useUpgrade = () => useContext(UpgradeContext)

/** Same rule as the API: whole blocks of 100 points = 10% each, up to 50%. */
function rewardDiscount(points: number) {
  const blocks = Math.min(Math.floor(Math.max(0, points) / 100), 5)
  return { pct: blocks * 10, pointsUsed: blocks * 100 }
}

/** Guess what the organiser hit from the API's PLAN_LIMIT message, so the right add-on is pre-ticked. */
function presetFor(reason?: string): Preset {
  const r = (reason ?? '').toLowerCase()
  return { teams: r.includes('team'), theme: r.includes('theme'), random: r.includes('random'), auctionFee: r.includes('auction #') || r.includes('auction fee') || r.includes('each auction') }
}

/** Owns the add-on checkout for a tournament. Any API "PLAN_LIMIT" error opens it automatically. */
export function UpgradeProvider({ children }: { children: React.ReactNode }) {
  const { t, reload } = useTournament()
  const { user, setUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string | undefined>()
  const info = t.planInfo
  const price = info.pricing
  const room = info.limits.teamCap - info.limits.includedTeams

  const [extraTeams, setExtraTeams] = useState(info.purchases.extraTeams)
  const [theme, setTheme] = useState(false)
  const [fee, setFee] = useState(false)
  const [random, setRandom] = useState(false)
  const [pro, setPro] = useState(false)
  const [usePoints, setUsePoints] = useState(false)
  const [busy, setBusy] = useState(false)

  const openUpgrade = useCallback(
    (r?: string) => {
      const p = presetFor(r)
      setReason(r)
      const needed = Math.max(0, t.teams.length + (p.teams ? 1 : 0) - info.limits.includedTeams)
      setExtraTeams(Math.min(room, Math.max(info.purchases.extraTeams, needed)))
      setTheme(!!p.theme && !info.limits.customTheme)
      setRandom(!!p.random && !info.limits.randomAuction)
      setFee(info.limits.auctionFeeDue && (!!p.auctionFee || !!p.random || (!p.teams && !p.theme)))
      setPro(false)
      setUsePoints((user?.rewardPoints ?? 0) >= 100)
      setOpen(true)
    },
    [t.teams.length, info, room, user?.rewardPoints],
  )

  // The pricing calculator links here with its picks, e.g. #addons=teams:10,theme,random,fee or #addons=pro.
  useEffect(() => {
    const m = window.location.hash.match(/^#addons=(.*)$/)
    if (!m) return
    uiFlags.checkoutFromLink = true
    history.replaceState(null, '', window.location.pathname)
    const picks = new Map(decodeURIComponent(m[1]).split(',').map((x): [string, string] => [x.split(':')[0], x.split(':')[1] ?? '']))
    openUpgrade()
    if (picks.has('pro')) return setPro(true)
    const teams = Number(picks.get('teams'))
    if (teams) setExtraTeams(Math.min(room, Math.max(info.purchases.extraTeams, teams - info.limits.includedTeams)))
    setTheme(picks.has('theme') && !info.limits.customTheme)
    setRandom(picks.has('random') && !info.limits.randomAuction)
    setFee(picks.has('fee') && info.limits.auctionFeeDue)
    // Runs once on arrival; later plan changes must not reopen the dialog.
  }, [])

  useEffect(() => {
    const on = (e: Event) => openUpgrade((e as CustomEvent<string>).detail)
    window.addEventListener('cricbid:plan-limit', on)
    return () => window.removeEventListener('cricbid:plan-limit', on)
  }, [openUpgrade])

  const newTeams = Math.max(0, extraTeams - info.purchases.extraTeams)
  const addOnLines = useMemo(
    () =>
      [
        newTeams > 0 && { label: `${newTeams} extra team${newTeams === 1 ? '' : 's'} × ₹${price.perExtraTeam}`, amount: newTeams * price.perExtraTeam },
        theme && { label: 'Theme customisation', amount: price.themeUnlock },
        random && { label: 'Random auction', amount: price.randomAuction },
        fee && { label: `Auction fee · auction #${info.sequence}`, amount: price.auctionFee },
      ].filter(Boolean) as { label: string; amount: number }[],
    [newTeams, theme, random, fee, price, info.sequence],
  )
  const addOnTotal = addOnLines.reduce((a, l) => a + l.amount, 0)
  // Pro replaces every individual add-on with one price.
  const lines = pro ? [{ label: 'Pro for this auction — everything unlocked', amount: price.pro }] : addOnLines
  const subtotal = lines.reduce((a, l) => a + l.amount, 0)
  const points = user?.rewardPoints ?? 0
  const disc = usePoints ? rewardDiscount(points) : { pct: 0, pointsUsed: 0 }
  const total = Math.round((subtotal * (100 - disc.pct)) / 100)
  const demo = info.billingMode === 'demo'

  const buy = async () => {
    setBusy(true)
    try {
      const r = await api<{ receipt: { rewardPoints: number; total: number } }>(`/billing/tournaments/${t.id}/checkout`, { body: pro ? { pro: true, usePoints } : { extraTeams, theme, randomAuction: random, auctionFee: fee, usePoints } })
      if (user) setUser({ ...user, rewardPoints: r.receipt.rewardPoints })
      await reload()
      toast.success(pro ? `${t.name} is now Pro 🎉` : `Unlocked for ${t.name} 🎉`)
      setOpen(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <UpgradeContext.Provider value={{ openUpgrade }}>
      {children}
      <Modal open={open} onClose={() => setOpen(false)} title={<span className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-gold" /> Add-ons for {t.name}</span>} wide>
        {info.plan === 'PRO' ? (
          <p className="rounded-xl bg-lime-glow/10 px-4 py-3 text-sm text-lime-glow">Everything is already unlocked for this auction{info.source === 'PLAN_CODE' ? ' through your plan code' : ''}.</p>
        ) : (
          <div className="space-y-4">
            {reason && <p className="rounded-xl bg-gold/10 px-4 py-3 text-sm text-gold">{reason}</p>}
            <button
              onClick={() => setPro((v) => !v)}
              aria-pressed={pro}
              className={cn('relative w-full overflow-hidden rounded-2xl border-2 p-4 text-left transition', pro ? 'border-gold bg-gold/10' : 'border-gold/30 hover:border-gold/60')}
            >
              <div className="flex flex-wrap items-center gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-bright text-on-gold"><Crown className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    Pro for this auction
                    {!pro && addOnTotal >= price.pro && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase text-gold">Better deal</span>}
                  </p>
                  <p className="text-xs text-ink-400">Everything at once: up to {info.limits.teamCap} teams, custom theme, random auction{info.limits.auctionFeeDue ? ' and the auction fee' : ''}.</p>
                </div>
                <p className="font-display text-2xl font-black">₹{price.pro}</p>
                <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full border-2', pro ? 'border-gold bg-gold-bright text-on-gold' : 'border-white/25')}>{pro && <Check className="h-3.5 w-3.5" />}</span>
              </div>
            </button>
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">or pick only what you need</p>
            <div className={cn('space-y-4 transition-opacity', pro && 'pointer-events-none opacity-40')}>

            <AddOnRow icon={<Shield className="h-5 w-5" />} title="Extra teams" hint={`${info.limits.includedTeams} teams free · ₹${price.perExtraTeam} for each team above that (max ${info.limits.teamCap})`}>
              <div className="flex items-center gap-2">
                <button className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-30" disabled={extraTeams <= info.purchases.extraTeams} onClick={() => setExtraTeams((n) => n - 1)} aria-label="Fewer teams"><Minus className="h-4 w-4" /></button>
                <span className="w-24 text-center text-sm"><b className="font-display text-lg">{info.limits.includedTeams + extraTeams}</b> teams</span>
                <button className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-30" disabled={extraTeams >= room} onClick={() => setExtraTeams((n) => n + 1)} aria-label="More teams"><Plus className="h-4 w-4" /></button>
              </div>
            </AddOnRow>

            <AddOnRow icon={<Palette className="h-5 w-5" />} title="Theme customisation" hint={`₹${price.themeUnlock} · all colour themes, brand colour and backgrounds`}>
              {info.limits.customTheme ? <Owned /> : <Switch checked={theme} onChange={setTheme} />}
            </AddOnRow>

            <AddOnRow icon={<Dices className="h-5 w-5" />} title="Random auction" hint={`₹${price.randomAuction} · one click shares players out evenly at base price — grade by grade if players have categories, otherwise fully random`}>
              {info.limits.randomAuction ? <Owned /> : <Switch checked={random} onChange={setRandom} />}
            </AddOnRow>

            {(info.limits.auctionFeeDue || info.purchases.auctionFeePaid) && (
              <AddOnRow icon={<Ticket className="h-5 w-5" />} title={`Auction fee · auction #${info.sequence}`} hint={`Your first ${price.freeAuctions} auctions are free; after that each is ₹${price.auctionFee}. Needed to go live.`}>
                {info.purchases.auctionFeePaid ? <Owned /> : <Switch checked={fee} onChange={setFee} />}
              </AddOnRow>
            )}
            </div>

            <Card className="space-y-3 p-4">
              <Switch
                checked={usePoints}
                disabled={points < 100}
                onChange={setUsePoints}
                label={<span className="inline-flex items-center gap-2"><Gift className="h-4 w-4 text-gold" /> Use reward points</span>}
                description={points >= 100 ? `You have ${points} points — ${rewardDiscount(points).pct}% off this purchase.` : `You have ${points} points. Every 100 points = 10% off. Earn 5 per suggestion or bug report on your account page.`}
              />
              <div className="h-px bg-white/5" />
              {lines.length ? (
                <ul className="space-y-1 text-sm">
                  {lines.map((l) => <li key={l.label} className="flex justify-between"><span className="text-ink-300">{l.label}</span><span>₹{l.amount}</span></li>)}
                  {disc.pct > 0 && <li className="flex justify-between text-lime-glow"><span>Reward discount ({disc.pct}%, {disc.pointsUsed} points)</span><span>−₹{subtotal - total}</span></li>}
                </ul>
              ) : (
                <p className="text-sm text-ink-400">Pick an add-on above.</p>
              )}
              <div className="flex items-center justify-between gap-3">
                <p className="font-display text-3xl font-black">₹{total}</p>
                <Button size="lg" loading={busy} disabled={!lines.length} onClick={buy}>
                  <Sparkles className="h-4 w-4" /> {pro ? `Pay ₹${total} · go Pro` : `Pay ₹${total}`}
                </Button>
              </div>
            </Card>
            <p className="text-center text-xs text-ink-400">
              {demo ? 'Demo billing is on: payment is skipped and add-ons activate instantly. ' : ''}
              Have a plan code? Enter it in <Link href="/account/plan" className="font-semibold text-ink-200 hover:text-white">Plan activation</Link>. · <Link href="/plans" className="font-semibold text-ink-200 hover:text-white">See pricing</Link>
            </p>
          </div>
        )}
      </Modal>
    </UpgradeContext.Provider>
  )
}

function AddOnRow({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-ink-200">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-ink-400">{hint}</p>
      </div>
      {children}
    </div>
  )
}

function Owned() {
  return <span className="inline-flex items-center gap-1 text-sm font-semibold text-lime-glow"><Check className="h-4 w-4" /> Active</span>
}
