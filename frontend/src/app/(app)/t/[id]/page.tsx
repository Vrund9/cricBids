'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Check, ClipboardList, Crown, FileDown, FileSpreadsheet, Gavel, ListChecks, Radio, Trophy, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useTournament } from '@/components/tournament-context'
import { Avatar, Button, Card, fadeUp, stagger } from '@/components/ui'
import { ShareLink } from '@/components/share'
import { Tour } from '@/components/tour'
import { CricketScene } from '@/components/cricket-scene'
import { TournamentDetails } from '@/components/tournament-details'
import { api, SITE_URL } from '@/lib/api'
import { exportResults } from '@/lib/excel'
import { moneyShort, tintText } from '@/lib/format'
import type { Player, Team, Tournament } from '@/lib/types'
import { cn } from '@/lib/cn'

export default function Overview() {
  const { t } = useTournament()
  return t.status === 'COMPLETED' ? <CompletedOverview /> : <SetupOverview />
}

// ───────────────────────── Before / during the auction ─────────────────────────

function SetupOverview() {
  const { t } = useTournament()
  const base = `/t/${t.id}`
  const origin = typeof window !== 'undefined' ? window.location.origin : SITE_URL
  const liveUrl = `${origin}/live/${t.liveToken}`
  const regUrl = `${origin}/register/${t.registrationToken}`
  const running = t.status === 'LIVE' || t.status === 'PAUSED'

  // Three plain steps; the first one that isn't done is "now", and gets the one big button.
  const steps = [
    { key: 'players', icon: Users, label: 'Add players', done: t.stats.players > 0 && t.stats.available > 0 },
    { key: 'rules', icon: ListChecks, label: 'Set auction rules', done: t.setupComplete && t.teams.length >= 2 },
    { key: 'live', icon: Gavel, label: 'Go live', done: running },
  ] as const
  const now = steps.findIndex((s) => !s.done)
  const current = now === -1 ? 'live' : steps[now].key
  const defaultTeamNames = t.teams.length > 0 && t.teams.every((x) => /^Team \d+$/.test(x.name))

  const next = running
    ? { title: t.status === 'PAUSED' ? 'Your auction is paused' : 'Your auction is live', text: 'Run bids, sell players and track every purse from the control room.', href: `${base}/auction`, cta: 'Open control room', icon: Gavel }
    : current === 'players'
      ? { title: 'Add your players', text: 'Upload your Excel sheet, or share the registration link and let players sign up themselves.', href: `${base}/players#import`, cta: 'Upload Excel', icon: FileSpreadsheet, alt: { href: `${base}/registration`, label: 'Share registration link' } }
      : current === 'rules'
        ? { title: 'Set the auction rules', text: 'A few quick questions: teams, purse, base price, squad size and order. We suggest the numbers.', href: `${base}/setup`, cta: 'Set rules', icon: ListChecks }
        : { title: 'Ready for auction day', text: `${t.stats.available} players and ${t.teams.length} teams are set. Open the control room when everyone is in the room.`, href: `${base}/auction`, cta: 'Open control room', icon: Gavel }

  // minmax(0,…) + min-w-0: long share links must truncate, not widen the columns past the screen.
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      {/* Both columns share the row height: with registration closed the live link card stretches to match. */}
      <div className="min-w-0">
        <Card className="h-full overflow-hidden" data-tour="checklist">
          <ol className="grid grid-cols-3 border-b border-white/5">
            {steps.map((s, i) => {
              const isNow = s.key === current && !running
              return (
                <li key={s.key} className={cn('relative flex flex-col items-center gap-2 px-2 py-5 text-center sm:flex-row sm:justify-center sm:text-left', isNow && 'bg-lime-glow/[0.06]')}>
                  <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold', s.done ? 'bg-lime-bright text-on-accent' : isNow ? 'border-2 border-lime-glow text-lime-glow' : 'border border-white/15 text-ink-400')}>
                    {s.done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className={cn('text-xs font-semibold sm:text-sm', s.done || isNow ? 'text-white' : 'text-ink-400')}>{s.label}</span>
                  {isNow && <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-lime-bright" />}
                </li>
              )
            })}
          </ol>
          <motion.div key={next.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-glow">{running ? 'Now' : 'Next step'}</p>
            <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{next.title}</h2>
            <p className="mt-2 max-w-xl text-ink-300">{next.text}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link data-tour="control-room" href={next.href} className="inline-flex h-11 items-center gap-2 rounded-xl bg-lime-bright px-5 font-semibold text-on-accent hover:bg-lime-hover">
                <next.icon className="h-4 w-4" /> {next.cta} <ArrowRight className="h-4 w-4" />
              </Link>
              {'alt' in next && next.alt && (
                <Link href={next.alt.href} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 px-5 text-sm font-semibold hover:bg-white/5">
                  {next.alt.label}
                </Link>
              )}
            </div>
            {!running && defaultTeamNames && current !== 'players' && (
              <p className="mt-6 text-sm text-ink-400">
                Tip: <Link href={`${base}/teams`} className="font-semibold text-lime-glow hover:underline">name your teams and add logos</Link> so they look right on the big screen.
              </p>
            )}
          </motion.div>
        </Card>
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <Card className="flex flex-1 flex-col justify-center p-6" data-tour="live-link">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-lime-glow" />
            <h3 className="font-semibold">Live auction link</h3>
          </div>
          <p className="mb-4 mt-1 text-sm text-ink-400">Projector, TV, team owners, players at home — everyone sees bids in realtime.</p>
          <ShareLink url={liveUrl} title={`${t.name} live`} message={`🏏 Watch the ${t.name} player auction LIVE`} />
        </Card>
        {/* Only while registrations are open; reopening lives on Players → Registration form. */}
        {t.registrationOpen && (
          <Card className="p-6" data-tour="registration">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-sky-live" />
              <h3 className="font-semibold">Player registration</h3>
              <span className="ml-auto text-xs font-semibold text-lime-glow">Open</span>
            </div>
            <div className="mt-4">
              <ShareLink url={regUrl} title={`${t.name} registration`} message={`🏏 Register for ${t.name} player auction`} />
            </div>
          </Card>
        )}
      </div>

      <div className="min-w-0 lg:col-span-2">
        <TournamentDetails />
      </div>

      <Tour
        id="tournament"
        steps={[
          { target: 'tabs', title: 'Everything for this auction', body: 'Players (and their registration form), teams, auction rules, the control room and results — all in these tabs. Tournament details are on this page; the screen theme lives in Settings.' },
          { target: 'checklist', title: 'Three steps to auction day', body: 'Add players, set the rules, go live. This card always shows the one thing to do next.' },
          ...(t.registrationOpen ? [{ target: 'registration', title: 'Let players register themselves', body: 'Share this link in your WhatsApp groups. Players fill in their name, role and photo and appear in your player list instantly.' }] : []),
          { target: 'live-link', title: 'The live auction link', body: 'Put this on the projector and send it to team owners and fans. Every screen updates in realtime during the auction.' },
          { target: 'control-room', title: 'Your next step', body: 'This button takes you straight to whatever comes next — on auction day, the control room.' },
        ]}
      />
    </div>
  )
}

// ───────────────────────── After the auction ─────────────────────────

interface Results {
  tournament: Tournament
  teams: Team[]
  players: Player[]
  bidCount: number
}

/** The auction is over: a read-only recap instead of a setup checklist. */
function CompletedOverview() {
  const { t } = useTournament()
  const base = `/t/${t.id}`
  const [r, setR] = useState<Results | null>(null)
  useEffect(() => {
    api<Results>(`/tournaments/${t.id}/auction/results`).then(setR).catch((e) => toast.error(e.message))
  }, [t.id])

  const sold = useMemo(() => (r?.players ?? []).filter((p) => p.status === 'SOLD').sort((a, b) => (b.soldPrice ?? 0) - (a.soldPrice ?? 0)), [r])
  const spent = sold.reduce((a, p) => a + (p.soldPrice ?? 0), 0)
  const teamRows = useMemo(() => {
    if (!r) return []
    return r.teams
      .map((team) => {
        const squad = sold.filter((p) => p.soldTeamId === team.id)
        return { team, count: squad.length, spent: squad.reduce((a, p) => a + (p.soldPrice ?? 0), 0) }
      })
      .sort((a, b) => b.spent - a.spent)
  }, [r, sold])
  const maxSpent = Math.max(1, ...teamRows.map((x) => x.spent))
  const cur = t.currency

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-6">
        <Card className="grain relative overflow-hidden p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <CricketScene variant="trophy" className="h-28 shrink-0" />
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Auction complete</p>
              <h2 className="mt-1 font-display text-3xl font-extrabold">{sold.length || t.stats.sold} players sold for {moneyShort(spent, cur)}</h2>
              <p className="mt-1 text-sm text-ink-400">
                {t.stats.unsold} unsold · {t.teams.length} teams{r ? ` · ${r.bidCount} bids` : ''}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
                <Link href={`${base}/results`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-lime-bright px-4 text-sm font-semibold text-on-accent hover:bg-lime-hover">
                  <Trophy className="h-4 w-4" /> View results
                </Link>
                <Button variant="secondary" disabled={!r} onClick={() => r && exportResults(r.players, r.teams, r.tournament)}>
                  <FileSpreadsheet className="h-4 w-4" /> Excel
                </Button>
                <a href={`/report/${t.id}`} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold hover:bg-white/5">
                  <FileDown className="h-4 w-4" /> PDF report
                </a>
              </div>
            </div>
          </div>
        </Card>

        {sold.length > 0 && (
          <Card className="p-6">
            <h3 className="mb-4 font-semibold">Top buys</h3>
            <motion.ol variants={stagger} initial="hidden" animate="show" className="grid gap-3 sm:grid-cols-3">
              {sold.slice(0, 3).map((p, i) => {
                const team = r?.teams.find((x) => x.id === p.soldTeamId)
                return (
                  <motion.li key={p.id} variants={fadeUp} className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center">
                    {i === 0 && <Crown className="absolute right-3 top-3 h-4 w-4 text-gold" />}
                    <Avatar src={p.photoUrl} name={p.name} size={56} rounded="xl" className="mx-auto" />
                    <p className="mt-2 truncate text-sm font-semibold">{p.name}</p>
                    <p className="truncate text-xs" style={{ color: team?.color && tintText(team.color) }}>{team?.name}</p>
                    <p className="mt-1 font-display text-xl font-black text-gold">{moneyShort(p.soldPrice, cur)}</p>
                  </motion.li>
                )
              })}
            </motion.ol>
          </Card>
        )}

        {teamRows.length > 0 && (
          <Card className="p-6">
            <h3 className="mb-4 font-semibold">Spending by team</h3>
            <ul className="space-y-3">
              {teamRows.map(({ team, count, spent: s }) => (
                <li key={team.id} className="flex items-center gap-3">
                  <Avatar src={team.logoUrl} name={team.shortName} size={30} rounded="xl" color={team.color} />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{team.name}</span>
                      <span className="shrink-0 font-mono text-xs text-ink-300">{count} players · {moneyShort(s, cur)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                      <motion.div className="h-full rounded-full" style={{ background: team.color }} initial={{ width: 0 }} animate={{ width: `${(s / maxSpent) * 100}%` }} transition={{ type: 'spring', stiffness: 70, damping: 20 }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <div className="min-w-0 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {[
            ['Players', t.stats.players],
            ['Sold', t.stats.sold],
            ['Unsold', t.stats.unsold],
            ['Teams', t.teams.length],
          ].map(([label, value]) => (
            <Card key={label as string} className="p-4">
              <p className="text-xs text-ink-400">{label}</p>
              <p className="mt-1 font-display text-2xl font-bold">{value}</p>
            </Card>
          ))}
        </div>
      </div>
      <div className="min-w-0 lg:col-span-2">
        <TournamentDetails stats={false} />
      </div>
    </div>
  )
}
