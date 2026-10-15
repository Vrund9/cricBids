'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import { ArrowLeft, ClipboardList, Crown, Gavel, LayoutDashboard, ListChecks, Palette, Shield, Trophy, Users } from 'lucide-react'
import { UpgradeProvider } from '@/components/upgrade'
import { TournamentProvider, useTournament } from '@/components/tournament-context'
import { Avatar, EmptyState, PageLoader, StatusBadge } from '@/components/ui'
import { cn } from '@/lib/cn'

const TABS = [
  { href: '', label: 'Overview', icon: LayoutDashboard },
  { href: '/players', label: 'Players', icon: Users },
  { href: '/registration', label: 'Registration', icon: ClipboardList },
  { href: '/teams', label: 'Teams', icon: Shield },
  { href: '/setup', label: 'Auction rules', icon: ListChecks },
  { href: '/theme', label: 'Theme', icon: Palette },
  { href: '/auction', label: 'Control room', icon: Gavel },
  { href: '/results', label: 'Results', icon: Trophy },
]

function Header({ id }: { id: string }) {
  const { t } = useTournament()
  const pathname = usePathname()
  const base = `/t/${id}`
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
              <h1 className="truncate font-display text-2xl font-bold sm:text-3xl">{t.name}</h1>
              <StatusBadge status={t.status} />
              {t.planInfo.plan === 'PRO' && <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-gold"><Crown className="h-3 w-3" /> Pro</span>}
            </div>
            <p className="mt-0.5 text-sm text-ink-400">
              {t.stats.players} players · {t.teams.length} teams{t.venue ? ` · ${t.venue}` : ''}
            </p>
          </div>
        </div>
        <nav className="no-scrollbar -mb-px mt-6 flex gap-1 overflow-x-auto" aria-label="Tournament sections" data-tour="tabs">
          {TABS.map((tab) => {
            const href = base + tab.href
            const active = tab.href === '' ? pathname === base : pathname.startsWith(href)
            return (
              <Link key={tab.href} href={href} className={cn('relative flex shrink-0 items-center gap-2 px-3.5 py-3 text-sm font-medium transition', active ? 'text-white' : 'text-ink-400 hover:text-ink-100')}>
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.href === '/auction' && t.status === 'LIVE' && <span className="h-1.5 w-1.5 rounded-full bg-lime-bright shadow-[0_0_8px_#c8ff2e]" />}
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
