'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft, Crown, Gavel, LayoutDashboard, ListChecks, Shield, Trophy, Users } from 'lucide-react'
import { UpgradeProvider } from '@/components/upgrade'
import { TournamentProvider, useTournament } from '@/components/tournament-context'
import { Avatar, EmptyState, PageLoader, StatusBadge } from '@/components/ui'
import { cn } from '@/lib/cn'

/**
 * `also` lists sub-pages that highlight the same tab (the registration form lives under Players).
 * `beforeDone` tabs disappear once the auction is complete — there is nothing left to set up or run.
 */
const TABS = [
  { href: '', label: 'Overview', short: 'Overview', icon: LayoutDashboard },
  { href: '/players', label: 'Players', short: 'Players', icon: Users, also: ['/registration'] },
  { href: '/teams', label: 'Teams', short: 'Teams', icon: Shield },
  { href: '/setup', label: 'Auction rules', short: 'Rules', icon: ListChecks },
  { href: '/auction', label: 'Control room', short: 'Auction', icon: Gavel, beforeDone: true },
  { href: '/results', label: 'Results', short: 'Results', icon: Trophy },
]

/** Pages that make no sense after the auction: they redirect to the overview. */
const CLOSED_WHEN_DONE = ['/registration', '/auction']

function Header({ id }: { id: string }) {
  const { t } = useTournament()
  const pathname = usePathname()
  const router = useRouter()
  const base = `/t/${id}`
  const done = t.status === 'COMPLETED'
  const tabs = TABS.filter((tab) => !(done && tab.beforeDone))

  useEffect(() => {
    if (done && CLOSED_WHEN_DONE.some((p) => pathname.startsWith(base + p))) router.replace(base)
  }, [done, pathname, base, router])
  return (
    <div className="border-b border-white/5 bg-ink-900/40">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs text-ink-400 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> All tournaments
        </Link>
        <div className="mt-3 flex items-center gap-4">
          <Avatar src={t.logoUrl} name={t.name} size={52} rounded="xl" color="#222c41" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="line-clamp-2 font-display text-2xl font-bold break-words sm:line-clamp-1 sm:text-3xl">{t.name}</h1>
              <StatusBadge status={t.status} />
              {t.planInfo.plan === 'PRO' && <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-gold"><Crown className="h-3 w-3" /> {t.planInfo.source === 'TOURNAMENT' ? 'Pro' : 'Unlocked'}</span>}
            </div>
            <p className="mt-0.5 text-sm text-ink-400">
              {t.stats.players} players · {t.teams.length} teams{t.venue ? ` · ${t.venue}` : ''}
            </p>
          </div>
        </div>
        {/* Phones: every tab fits as an icon over a short label, so Control room is never scrolled out of sight. */}
        <nav className="no-scrollbar -mx-2 -mb-px mt-5 flex overflow-x-auto sm:mx-0 sm:mt-6 sm:gap-1" aria-label="Tournament sections" data-tour="tabs">
          {tabs.map((tab) => {
            const href = base + tab.href
            const active = tab.href === '' ? pathname === base : [tab.href, ...(tab.also ?? [])].some((h) => pathname.startsWith(base + h))
            return (
              <Link key={tab.href} href={href} className={cn('relative flex min-w-14 flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium transition sm:flex-none sm:shrink-0 sm:flex-row sm:gap-2 sm:px-3.5 sm:py-3 sm:text-sm', active ? 'text-white' : 'text-ink-400 hover:text-ink-100')}>
                <tab.icon className="h-4 w-4" />
                <span className="sm:hidden">{tab.short}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.href === '/auction' && t.status === 'LIVE' && <span className="absolute right-[calc(50%-14px)] top-2 h-1.5 w-1.5 rounded-full bg-lime-bright shadow-[0_0_8px_var(--color-lime-bright)] sm:static" />}
                {active && <motion.span layoutId="tab-underline" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-lime-bright" />}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

export function TournamentFrame({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <TournamentProvider
      id={id}
      fallback={<PageLoader />}
      onError={(e) => (
        <div className="mx-auto max-w-xl px-4 py-20">
          <EmptyState title="Can’t open this tournament" action={<Link href="/dashboard" className="text-sm font-semibold text-lime-glow">Back to dashboard</Link>}>
            {e.message}
          </EmptyState>
        </div>
      )}
    >
      <UpgradeProvider>
        <Header id={id} />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</div>
      </UpgradeProvider>
    </TournamentProvider>
  )
}
