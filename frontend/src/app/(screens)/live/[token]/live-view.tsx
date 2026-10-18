'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, Crown, Maximize2, Minimize2, Pause, Trophy, Users, Volume2, VolumeX } from 'lucide-react'
import { LogoMark } from '@/components/brand'
import { Avatar, Card } from '@/components/ui'
import { BidDisplay, BidHistory, ConnIndicator, HammerOverlay, LiveDot, PlayerSpotlight, PurseBoard, RecentSales, TeamPurses } from '@/components/auction'
import { RoleAura, RoleIntro, useAuctionAudio } from '@/components/effects'
import { unlock } from '@/lib/sound'
import { themeStyle } from '@/lib/themes'
import { api } from '@/lib/api'
import { money, moneyShort, roleMeta } from '@/lib/format'
import { useLiveAuction } from '@/lib/live'
import type { PublicPlayer, Snapshot } from '@/lib/types'
import { cn } from '@/lib/cn'

type Tab = 'live' | 'teams' | 'squads'

export function LiveView({ token, initial }: { token: string; initial: Snapshot }) {
  const { state, conn, viewers, skew } = useLiveAuction({ liveToken: token, initial })
  const snap = state ?? initial
  const [tab, setTab] = useState<Tab>('live')
  const [sound, setSound] = useState(false)
  const [full, setFull] = useState(false)
  const [wide, setWide] = useState(true)
  useAuctionAudio(sound, snap, skew)

  // Phones get a compact card so the live bid stays above the fold.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const on = () => setWide(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  useEffect(() => {
    try {
      setSound(localStorage.getItem('cricbid.sound') === '1')
    } catch {}
    const on = () => setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])

  const toggleSound = () => {
    unlock() // must happen inside the click for browsers to allow audio
    setSound((s) => {
      try {
        localStorage.setItem('cricbid.sound', s ? '0' : '1')
      } catch {}
      return !s
    })
  }
  const toggleFull = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())

  const t = snap.tournament
  const running = t.status === 'LIVE' || t.status === 'PAUSED'

  return (
    <div className="screen-perf relative min-h-dvh overflow-hidden" style={themeStyle(t.theme)}>
      {(t.theme?.background ?? 'glow') === 'glow' && <div className="grid-bg pointer-events-none absolute inset-0 opacity-50" />}
      <header className="relative z-10 border-b border-white/5 bg-ink-900/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
          {t.logoUrl ? <Avatar src={t.logoUrl} name={t.name} size={36} rounded="xl" /> : <LogoMark />}
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-bold sm:text-xl">{t.name}</h1>
            <p className="hidden truncate text-xs text-ink-400 sm:block">
              {snap.counts.sold} sold · {snap.counts.unsold} unsold · {snap.counts.available + snap.counts.live} to go{snap.round > 1 ? ` · Round ${snap.round}` : ''}
            </p>
          </div>
          {t.status === 'LIVE' && <LiveDot />}
          {t.status === 'PAUSED' && <LiveDot label="PAUSED" color="#ffb020" />}
          <div className="hidden sm:block"><ConnIndicator conn={conn} viewers={viewers} /></div>
          <button onClick={toggleSound} className="rounded-xl p-2 text-ink-300 hover:bg-white/5 hover:text-white" aria-label={sound ? 'Mute sounds' : 'Turn on sounds'}>
            {sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
          <button onClick={toggleFull} className="hidden rounded-xl p-2 text-ink-300 hover:bg-white/5 hover:text-white sm:block" aria-label="Toggle full screen">
            {full ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
        </div>
        <div className="flex border-t border-white/5 lg:hidden">
          {(['live', 'teams', 'squads'] as Tab[]).map((x) => (
            <button key={x} onClick={() => setTab(x)} className={cn('relative flex-1 py-2.5 text-sm font-semibold capitalize', tab === x ? 'text-white' : 'text-ink-400')}>
              {x}
              {tab === x && <motion.span layoutId="live-tab" className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-lime-bright" />}
            </button>
          ))}
        </div>
      </header>
      <div className="sm:hidden">{conn !== 'live' && <div className="flex justify-center py-2"><ConnIndicator conn={conn} viewers={viewers} /></div>}</div>

      <main className="relative z-10 mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:py-6">
        {tab === 'squads' ? (
          <Squads token={token} snap={snap} />
        ) : !running && t.status !== 'COMPLETED' ? (
          <WaitingRoom snap={snap} />
        ) : t.status === 'COMPLETED' ? (
          <Finished snap={snap} token={token} />
        ) : (
          <>
          {/* Wide screens: every purse in a couple of rows above the auction, never in a scrolling list. */}
          <div className="mb-6 hidden lg:block">
            <PurseBoard snap={snap} highlightId={snap.current?.leadingTeamId} className="grid-cols-[repeat(auto-fill,minmax(150px,1fr))]" />
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(340px,1fr)]">
            <section className={cn('space-y-6', tab !== 'live' && 'hidden lg:block')}>
              {t.status === 'PAUSED' && (
                <div className="flex items-center gap-3 rounded-2xl border border-gold/30 bg-gold/10 px-5 py-3 text-gold">
                  <Pause className="h-5 w-5" /> The auctioneer has paused bidding. Back shortly.
                </div>
              )}
              {snap.current ? (
                <>
                  <Card className="relative overflow-hidden p-5 sm:p-8">
                    <RoleAura role={snap.current.player.role} />
                    <AnimatePresence mode="wait">
                      <PlayerSpotlight key={snap.current.player.id} player={snap.current.player} basePrice={snap.current.basePrice} currency={t.currency} size={wide ? 'xl' : 'md'} />
                    </AnimatePresence>
                  </Card>
                  <BidDisplay snap={snap} skew={skew} size={wide ? 'xl' : 'md'} />
                </>
              ) : (
                <RoundBreak snap={snap} />
              )}
            </section>
            <aside className={cn('space-y-6', tab === 'live' && 'hidden lg:block')}>
              {snap.current && (
                <Card className="p-5">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Bidding</h3>
                  <BidHistory snap={snap} limit={6} />
                </Card>
              )}
              <Card className="p-5 lg:hidden">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Team purses</h3>
                <TeamPurses snap={snap} compact highlightId={snap.current?.leadingTeamId} />
              </Card>
              <Card className="p-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Recent sales</h3>
                <RecentSales snap={snap} />
              </Card>
            </aside>
          </div>
          </>
        )}
      </main>

      {running && snap.sold.length > 0 && tab !== 'squads' && <SalesTicker snap={snap} />}
      <RoleIntro snap={snap} sound={sound} compact={!wide} />
      <HammerOverlay snap={snap} />
      <footer className="relative z-10 pb-20 pt-4 text-center text-xs text-ink-500">
        {!t.theme?.hideBranding && (
          <>
            Powered by <Link href="/" className="font-semibold text-ink-300 hover:text-lime-glow">BidWicket</Link>
          </>
        )}
      </footer>
    </div>
  )
}

function SalesTicker({ snap }: { snap: Snapshot }) {
  const items = snap.sold.slice(0, 12)
  const teams = new Map(snap.teams.map((t) => [t.id, t]))
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 hidden overflow-hidden border-t border-white/5 bg-ink-950/90 py-2.5 backdrop-blur lg:block">
      <div className="flex w-max animate-marquee gap-10" style={{ animationDuration: `${Math.max(20, items.length * 6)}s` }}>
        {[...items, ...items].map((p, i) => {
          const tm = teams.get(p.soldTeamId!)
          return (
            <span key={`${p.id}-${i}`} className="inline-flex items-center gap-2 text-sm text-ink-300">
              <span className="h-2 w-2 rounded-full" style={{ background: tm?.color }} />
              <b className="text-white">{p.name}</b> → {tm?.shortName} <b className="text-gold">{moneyShort(p.soldPrice, snap.tournament.currency)}</b>
            </span>
          )
        })}
      </div>
    </div>
  )
}

function RoundBreak({ snap }: { snap: Snapshot }) {
  const unsold = snap.lastEvent?.type === 'ROUND_END' ? snap.lastEvent.unsold ?? snap.counts.unsold : snap.counts.unsold
  return (
    <Card className="flex min-h-[420px] flex-col items-center justify-center gap-4 p-10 text-center">
      <motion.div animate={{ rotate: [0, -12, 12, 0] }} transition={{ repeat: Infinity, duration: 2.4 }}><Trophy className="h-14 w-14 text-gold" /></motion.div>
      <h2 className="font-display text-4xl font-extrabold">Round {snap.round} complete</h2>
      <p className="max-w-md text-ink-300">
        {snap.counts.sold} players sold for {money(snap.totalSpent, snap.tournament.currency)}.{unsold ? ` ${unsold} unsold — they may come back in a re-auction.` : ''}
      </p>
    </Card>
  )
}

function WaitingRoom({ snap }: { snap: Snapshot }) {
  const t = snap.tournament
  // null until mounted: the countdown depends on the viewer's clock, not the server's.
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const when = t.auctionDate ? new Date(t.auctionDate).getTime() : null
  const diff = when && now !== null ? Math.max(0, when - now) : 0
  const parts = [Math.floor(diff / 86400000), Math.floor((diff / 3600000) % 24), Math.floor((diff / 60000) % 60), Math.floor((diff / 1000) % 60)]
  return (
    <div className="mx-auto max-w-4xl py-10 text-center">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        {t.logoUrl && <Avatar src={t.logoUrl} name={t.name} size={110} rounded="xl" className="mx-auto mb-6 rounded-3xl" />}
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-lime-glow">Player auction</p>
        <h2 className="mt-3 font-display text-5xl font-extrabold sm:text-7xl">{t.name}</h2>
        {t.venue && <p className="mt-3 text-ink-300">{t.venue}</p>}
      </motion.div>
      {now === null ? (
        <div className="mt-12 h-[104px]" />
      ) : when && diff > 0 ? (
        <div className="mt-12 flex justify-center gap-3 sm:gap-5">
          {['days', 'hrs', 'min', 'sec'].map((l, i) => (
            <div key={l} className="card w-20 py-4 sm:w-28">
              <p className="font-display text-4xl font-black tabular sm:text-5xl">{String(parts[i]).padStart(2, '0')}</p>
              <p className="text-xs uppercase tracking-widest text-ink-400">{l}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-12 inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2 text-ink-200">
          <CalendarDays className="h-4 w-4" /> Starting soon — keep this page open, it updates by itself.
        </p>
      )}
      <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-5"><p className="font-display text-4xl font-black">{snap.counts.total}</p><p className="text-sm text-ink-400">players</p></Card>
        <Card className="p-5"><p className="font-display text-4xl font-black">{snap.teams.length}</p><p className="text-sm text-ink-400">teams</p></Card>
        <Card className="col-span-2 p-5 sm:col-span-1"><p className="font-display text-4xl font-black">{moneyShort(t.teamPurse, t.currency)}</p><p className="text-sm text-ink-400">purse per team</p></Card>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {snap.teams.map((tm, i) => (
          <motion.div key={tm.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] py-1.5 pl-1.5 pr-4">
            <Avatar src={tm.logoUrl} name={tm.shortName} size={32} rounded="xl" color={tm.color} />
            <span className="text-sm font-semibold">{tm.name}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function Finished({ snap, token }: { snap: Snapshot; token: string }) {
  const t = snap.tournament
  return (
    <div className="space-y-8">
      <div className="text-center">
        <Trophy className="mx-auto h-12 w-12 text-gold" />
        <h2 className="mt-3 font-display text-4xl font-extrabold sm:text-6xl">Auction complete</h2>
        <p className="mt-3 text-ink-300">{snap.counts.sold} players sold for {money(snap.totalSpent, t.currency)}</p>
      </div>
      {snap.topBuys.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {snap.topBuys.map((p, i) => {
            const tm = snap.teams.find((x) => x.id === p.soldTeamId)
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className="relative h-full p-5 text-center">
                  {i === 0 && <Crown className="absolute right-4 top-4 h-5 w-5 text-gold" />}
                  <Avatar src={p.photoUrl} name={p.name} size={84} rounded="xl" className="mx-auto" />
                  <p className="mt-3 font-semibold">{p.name}</p>
                  <p className="text-xs" style={{ color: tm?.color }}>{tm?.name}</p>
                  <p className="mt-2 font-display text-2xl font-black text-gold">{moneyShort(p.soldPrice, t.currency)}</p>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
      <Squads token={token} snap={snap} />
    </div>
  )
}

interface SquadsData {
  teams: { id: string; name: string; shortName: string; color: string; logoUrl?: string | null; purse: number; players: PublicPlayer[] }[]
  unsold: PublicPlayer[]
}

function Squads({ token, snap }: { token: string; snap: Snapshot }) {
  const [data, setData] = useState<SquadsData | null>(null)
  const load = useCallback(() => api<SquadsData>(`/public/live/${token}/squads`, { auth: false }).then(setData).catch(() => undefined), [token])
  useEffect(() => {
    void load()
  }, [load, snap.counts.sold, snap.counts.unsold])
  if (!data) return <p className="py-10 text-center text-ink-400">Loading squads…</p>
  const cur = snap.tournament.currency
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.teams.map((tm) => (
        <Card key={tm.id} className="overflow-hidden">
          <div className="flex items-center gap-3 p-4" style={{ background: `linear-gradient(90deg, ${tm.color}26, transparent)` }}>
            <Avatar src={tm.logoUrl} name={tm.shortName} size={40} rounded="xl" color={tm.color} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{tm.name}</p>
              <p className="text-xs text-ink-400">{tm.players.length} players · {moneyShort(tm.purse, cur)} left</p>
            </div>
          </div>
          <ul className="divide-y divide-white/5">
            {tm.players.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2">
                <Avatar src={p.photoUrl} name={p.name} size={28} />
                <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                <span className="text-[10px] font-bold" style={{ color: roleMeta(p.role).color }}>{roleMeta(p.role).short}</span>
                <span className="w-16 text-right font-mono text-xs text-gold">{moneyShort(p.soldPrice, cur)}</span>
              </li>
            ))}
            {tm.players.length === 0 && <li className="px-4 py-4 text-sm text-ink-400">No players yet</li>}
          </ul>
        </Card>
      ))}
      {data.unsold.length > 0 && (
        <Card className="p-4 md:col-span-2 xl:col-span-3">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-hot"><Users className="h-4 w-4" /> Unsold ({data.unsold.length})</p>
          <div className="flex flex-wrap gap-2">
            {data.unsold.map((p) => <span key={p.id} className="rounded-full border border-white/10 px-3 py-1 text-xs text-ink-300">{p.name}</span>)}
          </div>
        </Card>
      )}
    </div>
  )
}
