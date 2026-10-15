'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Ban, Crown, Gavel, Hand, Lock, Pause } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, Card, EmptyState, PageLoader } from '@/components/ui'
import { BidHistory, BidTimer, ConnIndicator, HammerOverlay, PlayerSpotlight } from '@/components/auction'
import { api } from '@/lib/api'
import { money, moneyShort } from '@/lib/format'
import { useLiveAuction } from '@/lib/live'
import type { Snapshot } from '@/lib/types'
import { themeStyle } from '@/lib/themes'
import { RoleIntro } from '@/components/effects'

interface PaddleInfo {
  team: { id: string; name: string; shortName: string; color: string; logoUrl?: string | null }
  tournament: { name: string; logoUrl?: string | null; liveToken: string; remoteBidding: boolean }
  state: Snapshot
}

/** A team owner's phone becomes their bidding paddle. */
export function Paddle({ token }: { token: string }) {
  const [info, setInfo] = useState<PaddleInfo | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    api<PaddleInfo>(`/public/bid/${token}`, { auth: false }).then(setInfo).catch((e) => setErr(e.message))
  }, [token])

  const live$ = useLiveAuction({ liveToken: info?.tournament.liveToken, initial: info?.state ?? null })
  const { conn, skew } = live$
  const state = live$.state ?? info?.state ?? null

  if (err) return <div className="mx-auto max-w-md px-4 py-24"><EmptyState icon={<Lock className="h-6 w-6" />} title="Link not valid">{err}</EmptyState></div>
  if (!info || !state) return <PageLoader />

  const team = info.team
  const me = state.teams.find((x) => x.id === team.id)
  const cur = state.current
  const live = cur?.player.status === 'LIVE'
  const leading = cur?.leadingTeamId === team.id
  const remote = state.tournament.remoteBidding
  const paused = state.tournament.status === 'PAUSED'
  const cc = state.tournament.currency

  const placeBid = async () => {
    if (!cur?.nextBid) return
    if ('vibrate' in navigator) navigator.vibrate?.(30)
    setSending(true)
    try {
      await api(`/public/bid/${token}`, { body: { expected: cur.nextBid }, auth: false })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  let blocked = ''
  if (!remote) blocked = 'The organiser has turned off phone bidding'
  else if (paused) blocked = 'Auction paused'
  else if (!live) blocked = 'Waiting for the next player'
  else if (leading) blocked = 'You hold the highest bid'
  else if (me && !me.canBid) blocked = me.squadSize >= state.tournament.maxSquad ? 'Your squad is full' : `Over your limit (max ${moneyShort(me.maxBid, cc)})`

  return (
    <div className="min-h-dvh" style={themeStyle(state.tournament.theme)}>
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-6 pt-4">
      <header className="flex items-center gap-3">
        <Avatar src={team.logoUrl} name={team.shortName} size={44} rounded="xl" color={team.color} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold" style={{ color: team.color }}>{team.name}</p>
          <p className="truncate text-xs text-ink-400">{info.tournament.name}</p>
        </div>
        <ConnIndicator conn={conn} />
      </header>

      {me && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Card className="p-3"><p className="text-[10px] uppercase tracking-wider text-ink-400">Purse</p><p className="font-display text-lg font-bold">{moneyShort(me.purse, cc)}</p></Card>
          <Card className="p-3"><p className="text-[10px] uppercase tracking-wider text-ink-400">Max bid</p><p className="font-display text-lg font-bold">{moneyShort(me.maxBid, cc)}</p></Card>
          <Card className="p-3"><p className="text-[10px] uppercase tracking-wider text-ink-400">Squad</p><p className="font-display text-lg font-bold">{me.squadSize}/{state.tournament.maxSquad}</p></Card>
        </div>
      )}

      <div className="mt-5 flex-1">
        {cur ? (
          <Card className="p-5">
            <PlayerSpotlight player={cur.player} basePrice={cur.basePrice} currency={cc} size="md" />
            <div className="mt-5 flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-ink-400">{cur.currentBid === null ? 'Opens at' : 'Current bid'}</p>
                <p className="font-display text-4xl font-black tabular">{money(cur.currentBid ?? cur.basePrice, cc)}</p>
              </div>
              {live && cur.currentBid !== null && <BidTimer endsAt={cur.timerEndsAt} skew={skew} total={state.tournament.bidTimerSec} />}
            </div>
            <AnimatePresence>
              {leading && live && (
                <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold" style={{ background: `${team.color}26`, color: team.color }}>
                  <Crown className="h-4 w-4" /> You’re leading
                </motion.p>
              )}
            </AnimatePresence>
            <div className="mt-4"><BidHistory snap={state} limit={4} /></div>
          </Card>
        ) : (
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            {paused ? <Pause className="h-10 w-10 text-gold" /> : <Gavel className="h-10 w-10 text-ink-400" />}
            <p className="font-semibold">{state.tournament.status === 'COMPLETED' ? 'Auction complete' : state.tournament.status === 'LIVE' ? 'Between players' : 'Auction hasn’t started yet'}</p>
            <p className="text-sm text-ink-400">Keep this page open — it updates by itself.</p>
          </Card>
        )}
      </div>

      <div className="sticky bottom-4 mt-6">
        <motion.button
          whileTap={blocked || sending ? undefined : { scale: 0.96 }}
          disabled={!!blocked || sending}
          onClick={placeBid}
          className="relative flex h-24 w-full flex-col items-center justify-center overflow-hidden rounded-3xl font-display text-on-accent shadow-2xl transition disabled:cursor-not-allowed"
          style={{ background: blocked ? '#222c41' : team.color, color: blocked ? '#8a94ad' : '#fff' }}
        >
          {blocked ? (
            <span className="flex items-center gap-2 text-base font-semibold">{leading ? <Crown className="h-5 w-5" /> : <Ban className="h-5 w-5" />} {blocked}</span>
          ) : (
            <>
              <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest opacity-90"><Hand className="h-4 w-4" /> Tap to bid</span>
              <span className="text-4xl font-black tabular">{money(cur?.nextBid, cc)}</span>
            </>
          )}
        </motion.button>
      </div>
      <RoleIntro snap={state} compact />
      <HammerOverlay snap={state} duration={2500} />
    </main>
    </div>
  )
}
