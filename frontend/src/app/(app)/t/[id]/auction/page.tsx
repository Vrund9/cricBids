'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, Check, FastForward, Flag, Gavel, Keyboard, MonitorPlay, Pause, Play, RotateCcw, Rocket, SkipForward, Trophy, Undo2, Volume2, VolumeX, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useTournament } from '@/components/tournament-context'
import { Avatar, Button, Card, Input, PageLoader, Switch } from '@/components/ui'
import { ShareLink } from '@/components/share'
import { BidDisplay, BidHistory, ConnIndicator, HammerOverlay, PlayerSpotlight, RecentSales, TeamPurses } from '@/components/auction'
import { RoleAura, RoleIntro, useAuctionAudio } from '@/components/effects'
import { unlock } from '@/lib/sound'
import { api, SITE_URL } from '@/lib/api'
import { money, moneyShort } from '@/lib/format'
import { useLiveAuction } from '@/lib/live'
import type { Snapshot } from '@/lib/types'
import { cn } from '@/lib/cn'

type Action = 'start' | 'next' | 'sell' | 'unsold' | 'undo' | 'reopen' | 'skip' | 'pause' | 'resume' | 'reauction' | 'finish' | 'reset'

export default function ControlRoom() {
  const { t, reload } = useTournament()
  const { state, conn, viewers, skew, setState } = useLiveAuction({ ownerTournamentId: t.id })
  const [busy, setBusy] = useState<string | null>(null)
  const [jump, setJump] = useState('')
  const [autoNext, setAutoNext] = useState(false)
  const [help, setHelp] = useState(false)
  const [sound, setSound] = useState(false)
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      setAutoNext(localStorage.getItem('cricbid.autonext') === '1')
      setSound(localStorage.getItem('cricbid.room-sound') === '1')
    } catch {}
  }, [])
  useAuctionAudio(sound, state, skew)
  const toggleSound = () => {
    unlock()
    setSound((s) => {
      try {
        localStorage.setItem('cricbid.room-sound', s ? '0' : '1')
      } catch {}
      return !s
    })
  }

  const run = useCallback(
    async (action: Action, body?: Record<string, unknown>, path = action) => {
      setBusy(action)
      try {
        await api(`/tournaments/${t.id}/auction/${path}`, { body: body ?? {} })
        // If the socket is down, pull the state directly so the room never looks stale.
        if (conn !== 'live') setState(await api<Snapshot>(`/tournaments/${t.id}/auction`))
        if (['start', 'pause', 'resume', 'finish', 'reset'].includes(action)) void reload()
      } catch (e) {
        toast.error((e as Error).message)
      } finally {
        setBusy(null)
      }
    },
    [t.id, conn, setState, reload],
  )

  const bid = useCallback(
    async (teamId: string) => {
      const amount = Number(jump) || undefined
      setBusy(`bid:${teamId}`)
      try {
        await api(`/tournaments/${t.id}/auction/bid`, { body: { teamId, amount } })
        setJump('')
        if (conn !== 'live') setState(await api<Snapshot>(`/tournaments/${t.id}/auction`))
      } catch (e) {
        toast.error((e as Error).message)
      } finally {
        setBusy(null)
      }
    },
    [t.id, jump, conn, setState],
  )

  const snap = state
  const cur = snap?.current
  const live = cur?.player.status === 'LIVE'
  const done = cur && (cur.player.status === 'SOLD' || cur.player.status === 'UNSOLD')
  const running = snap?.tournament.status === 'LIVE'
  const paused = snap?.tournament.status === 'PAUSED'
  const leader = snap?.teams.find((x) => x.id === cur?.leadingTeamId)

  // Auto-advance to the next player after the SOLD/UNSOLD moment.
  useEffect(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current)
    if (autoNext && running && done && (snap?.counts.queue ?? 0) > 0) {
      autoTimer.current = setTimeout(() => void run('next'), 3500)
    }
    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoNext, running, done, cur?.player.id, cur?.player.status])

  // Keyboard shortcuts for fast auctioneering.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!snap || busy) return
      const el = e.target as HTMLElement
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (/^[0-9]$/.test(k) && live && running) {
        const idx = k === '0' ? 9 : Number(k) - 1
        const team = snap.teams[idx]
        if (team?.canBid) void bid(team.id)
      } else if (k === 's' && live && leader) void run('sell')
      else if (k === 'u' && live) void run('unsold')
      else if (k === 'z' && live && cur?.bids.length) void run('undo')
      else if (k === 'n' && running && !live) void run('next')
      else if (k === 'k' && live) void run('skip')
      else if (k === 'p') void run(paused ? 'resume' : 'pause')
      else if (k === '?') setHelp((h) => !h)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [snap, busy, live, running, paused, leader, cur, bid, run])

  if (!snap) return <PageLoader />

  const origin = typeof window !== 'undefined' ? window.location.origin : SITE_URL
  const liveUrl = `${origin}/live/${snap.tournament.liveToken}`
  const currency = snap.tournament.currency

  // ── Before the auction ──
  if (snap.tournament.status === 'DRAFT' || snap.tournament.status === 'READY') {
    const checks = [
      { ok: snap.teams.length >= 2, label: `${snap.teams.length} teams`, fix: `/t/${t.id}/setup` },
      { ok: snap.counts.available > 0, label: `${snap.counts.available} players ready to auction`, fix: `/t/${t.id}/players` },
      { ok: t.setupComplete, label: 'Auction rules answered', fix: `/t/${t.id}/setup` },
    ]
    const ok = checks.every((c) => c.ok)
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="grain relative overflow-hidden p-8 text-center sm:p-12">
          <motion.div initial={{ scale: 0.8, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-lime-bright text-on-accent">
            <Rocket className="h-8 w-8" />
          </motion.div>
          <h2 className="mt-6 font-display text-4xl font-extrabold">Ready to go live?</h2>
          <p className="mx-auto mt-2 max-w-md text-ink-300">Players come up {t.playerOrder === 'SEQUENTIAL' ? 'in list order' : t.playerOrder === 'CATEGORY_RANDOM' ? 'randomly within each category' : 'in a secure random order'}. Everyone with the live link sees every bid instantly.</p>
          <ul className="mx-auto mt-8 max-w-sm space-y-2 text-left">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm">
                {c.ok ? <Check className="h-4 w-4 text-lime-glow" /> : <AlertTriangle className="h-4 w-4 text-gold" />}
                <span className="flex-1">{c.label}</span>
                {!c.ok && <Link href={c.fix} className="text-xs font-semibold text-lime-glow">Fix</Link>}
              </li>
            ))}
          </ul>
          <Button size="xl" className="mt-8" disabled={!ok} loading={busy === 'start'} onClick={() => run('start')}>
            <Gavel className="h-5 w-5" /> Start auction
          </Button>
        </Card>
        <Card className="mt-6 p-6">
          <h3 className="mb-1 font-semibold">Put this on the big screen</h3>
          <p className="mb-4 text-sm text-ink-400">Open it on the projector now — it shows a countdown and switches to the live auction the moment you start.</p>
          <ShareLink url={liveUrl} title={`${snap.tournament.name} live`} message={`🏏 ${snap.tournament.name} player auction — watch live:`} />
        </Card>
      </div>
    )
  }

  // ── After the auction ──
  if (snap.tournament.status === 'COMPLETED') {
    return (
      <Card className="mx-auto max-w-2xl p-10 text-center">
        <Trophy className="mx-auto h-14 w-14 text-gold" />
        <h2 className="mt-4 font-display text-4xl font-extrabold">Auction complete</h2>
        <p className="mt-2 text-ink-300">{snap.counts.sold} players sold for {money(snap.totalSpent, currency)}.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`/t/${t.id}/results`} className="inline-flex h-12 items-center gap-2 rounded-xl bg-lime-bright px-6 font-semibold text-on-accent"><Trophy className="h-4 w-4" /> Results &amp; Excel</Link>
          <Button size="lg" variant="danger" loading={busy === 'reset'} onClick={() => confirm('Reset wipes every sale and purse so you can run the auction again. Continue?') && run('reset')}>
            <RotateCcw className="h-4 w-4" /> Reset auction
          </Button>
        </div>
      </Card>
    )
  }

  // ── Live room ──
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <ConnIndicator conn={conn} viewers={viewers} />
        <span className="text-sm text-ink-400">Round {snap.round} · {snap.counts.queue} in queue · {snap.counts.sold} sold · {snap.counts.unsold} unsold</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <a href={liveUrl} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-semibold hover:bg-white/5"><MonitorPlay className="h-3.5 w-3.5" /> Big screen</a>
          <Button size="sm" variant={paused ? 'primary' : 'secondary'} loading={busy === 'pause' || busy === 'resume'} onClick={() => run(paused ? 'resume' : 'pause')}>
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />} {paused ? 'Resume' : 'Pause'}
          </Button>
          <Button size="sm" variant="ghost" onClick={toggleSound} aria-label={sound ? 'Mute sounds' : 'Play sounds on this device'}>
            {sound ? <Volume2 className="h-3.5 w-3.5 text-lime-glow" /> : <VolumeX className="h-3.5 w-3.5" />} Sound
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setHelp((h) => !h)}><Keyboard className="h-3.5 w-3.5" /> Shortcuts</Button>
          <Button size="sm" variant="ghost" onClick={() => confirm('Finish the auction now? Remaining players stay unsold.') && run('finish')}><Flag className="h-3.5 w-3.5" /> Finish</Button>
        </div>
      </div>

      <AnimatePresence>
        {help && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <Card className="grid grid-cols-2 gap-x-6 gap-y-2 p-4 text-sm sm:grid-cols-4">
              {[['1–9, 0', 'Bid for team'], ['S', 'Sell'], ['U', 'Unsold'], ['Z', 'Undo last bid'], ['N', 'Next player'], ['K', 'Skip player'], ['P', 'Pause / resume'], ['?', 'Toggle this help']].map(([k, v]) => (
                <p key={k}><kbd className="mr-2 rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-xs">{k}</kbd>{v}</p>
              ))}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {paused && (
        <div className="flex items-center gap-3 rounded-2xl border border-gold/30 bg-gold/10 px-5 py-3 text-sm text-gold"><Pause className="h-4 w-4" /> Auction paused — bids are blocked until you resume.</div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          {cur ? (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="relative overflow-hidden p-5">
                  <RoleAura role={cur.player.role} />
                  <AnimatePresence mode="wait">
                    <PlayerSpotlight key={cur.player.id} player={cur.player} basePrice={cur.basePrice} currency={currency} size="md" />
                  </AnimatePresence>
                </Card>
                <BidDisplay snap={snap} skew={skew} size="md" />
              </div>

              {live ? (
                <Card className="p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold">
                      Tap a team to bid <span className="text-lime-glow">{money(Number(jump) || cur.nextBid, currency)}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <Input type="number" min={cur.nextBid ?? 0} placeholder={`Jump bid ≥ ${moneyShort(cur.nextBid, currency)}`} className="h-9 w-44 text-xs" value={jump} onChange={(e) => setJump(e.target.value)} aria-label="Custom bid amount" />
                      {jump && <button className="text-xs text-ink-400 hover:text-white" onClick={() => setJump('')}>Clear</button>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {snap.teams.map((team, i) => {
                      const leading = cur.leadingTeamId === team.id
                      const disabled = !team.canBid || !running || !!busy || (Number(jump) > 0 && Number(jump) > team.maxBid)
                      const reason = leading ? 'Leading' : team.squadSize >= snap.tournament.maxSquad ? 'Squad full' : team.maxBid < (cur.nextBid ?? 0) ? 'Purse limit' : ''
                      return (
                        <motion.button
                          key={team.id}
                          whileTap={disabled ? undefined : { scale: 0.95 }}
                          disabled={disabled}
                          onClick={() => bid(team.id)}
                          className={cn('relative overflow-hidden rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed', leading ? 'border-2' : 'border-white/10 hover:border-white/25 disabled:opacity-40')}
                          style={{ borderColor: leading ? team.color : undefined, background: leading ? `${team.color}22` : `linear-gradient(135deg, ${team.color}14, transparent)` }}
                        >
                          {busy === `bid:${team.id}` && <motion.span className="absolute inset-0" style={{ background: team.color }} initial={{ opacity: 0.4 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }} />}
                          <div className="flex items-center gap-2">
                            <Avatar src={team.logoUrl} name={team.shortName} size={30} rounded="xl" color={team.color} />
                            <span className="min-w-0 flex-1 truncate text-sm font-bold">{team.shortName}</span>
                            {i < 10 && <kbd className="rounded border border-white/10 px-1 font-mono text-[10px] text-ink-400">{i === 9 ? 0 : i + 1}</kbd>}
                          </div>
                          <p className="mt-2 truncate text-xs text-ink-300">{team.name}</p>
                          <p className="mt-1 flex justify-between text-[11px] text-ink-400">
                            <span>{moneyShort(team.purse, currency)}</span>
                            <span>{reason || `max ${moneyShort(team.maxBid, currency)}`}</span>
                          </p>
                        </motion.button>
                      )
                    })}
                  </div>
                </Card>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {live ? (
                  <>
                    <Button size="lg" variant="gold" disabled={!leader || !running} loading={busy === 'sell'} onClick={() => run('sell')} className="min-w-48 flex-1 sm:flex-none">
                      <Gavel className="h-5 w-5" /> {leader ? `Sell to ${leader.shortName} · ${moneyShort(cur.currentBid, currency)}` : 'Sell'}
                    </Button>
                    <Button size="lg" variant="danger" disabled={!running} loading={busy === 'unsold'} onClick={() => run('unsold')}><XCircle className="h-5 w-5" /> Unsold</Button>
                    <Button size="lg" variant="secondary" disabled={!cur.bids.length || !running} loading={busy === 'undo'} onClick={() => run('undo')}><Undo2 className="h-5 w-5" /> Undo bid</Button>
                    <Button size="lg" variant="ghost" disabled={!running} loading={busy === 'skip'} onClick={() => run('skip')}><SkipForward className="h-5 w-5" /> Skip</Button>
                  </>
                ) : (
                  <>
                    <Button size="lg" disabled={!running} loading={busy === 'next'} onClick={() => run('next')} className="min-w-48 flex-1 sm:flex-none"><FastForward className="h-5 w-5" /> Next player</Button>
                    <Button size="lg" variant="secondary" disabled={!running} loading={busy === 'reopen'} onClick={() => run('reopen')}><RotateCcw className="h-5 w-5" /> Reopen bidding</Button>
                  </>
                )}
              </div>
              <Card className="p-4">
                <Switch
                  checked={autoNext}
                  onChange={(v) => {
                    setAutoNext(v)
                    try {
                      localStorage.setItem('cricbid.autonext', v ? '1' : '0')
                    } catch {}
                  }}
                  label="Auto-advance"
                  description="Bring up the next player 3.5s after each hammer."
                />
              </Card>
            </>
          ) : (
            <RoundEnd snap={snap} busy={busy} run={run} />
          )}
        </div>

        <aside className="space-y-6">
          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Live link</h3>
            <ShareLink url={liveUrl} title={`${snap.tournament.name} live`} message={`🔴 ${snap.tournament.name} auction is LIVE — watch here:`} compact />
          </Card>
          {cur && (
            <Card className="p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Bids on {cur.player.name.split(' ')[0]}</h3>
              <BidHistory snap={snap} />
            </Card>
          )}
          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Purses</h3>
            <TeamPurses snap={snap} compact highlightId={cur?.leadingTeamId} />
          </Card>
          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Recent sales</h3>
            <RecentSales snap={snap} />
          </Card>
        </aside>
      </div>
      <RoleIntro snap={snap} sound={sound} compact />
      <HammerOverlay snap={snap} duration={1800} />
    </div>
  )
}

function RoundEnd({ snap, busy, run }: { snap: Snapshot; busy: string | null; run: (a: Action) => void }) {
  const unsold = snap.counts.unsold
  return (
    <Card className="p-8 text-center sm:p-12">
      <Trophy className="mx-auto h-12 w-12 text-gold" />
      <h2 className="mt-4 font-display text-3xl font-extrabold">Round {snap.round} complete</h2>
      <p className="mt-2 text-ink-300">{snap.counts.sold} sold for {money(snap.totalSpent, snap.tournament.currency)}{unsold ? ` · ${unsold} unsold` : ''}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {unsold > 0 && (
          <Button size="lg" loading={busy === 'reauction'} onClick={() => run('reauction')}><RotateCcw className="h-4 w-4" /> Re-auction {unsold} unsold</Button>
        )}
        {snap.counts.queue > 0 && <Button size="lg" variant="secondary" loading={busy === 'next'} onClick={() => run('next')}><FastForward className="h-4 w-4" /> Next player</Button>}
        <Button size="lg" variant={unsold ? 'secondary' : 'primary'} loading={busy === 'finish'} onClick={() => run('finish')}><Flag className="h-4 w-4" /> Finish auction</Button>
      </div>
    </Card>
  )
}
