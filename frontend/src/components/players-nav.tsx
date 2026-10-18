'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardList, Users } from 'lucide-react'
import { useTournament } from './tournament-context'
import { cn } from '@/lib/cn'

/**
 * Players and the registration form are one job ("get players in"), so they share the
 * Players tab: the list, and the form players fill in themselves.
 */
export function PlayersNav() {
  const { t } = useTournament()
  const pathname = usePathname()
  if (t.status === 'COMPLETED') return null
  const base = `/t/${t.id}`
  const items = [
    { href: `${base}/players`, label: 'Player list', icon: Users, hint: `${t.stats.players}` },
    { href: `${base}/registration`, label: 'Registration form', icon: ClipboardList, hint: t.registrationOpen ? 'open' : 'closed' },
  ]
  return (
    <div className="mb-6 inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1" role="tablist" aria-label="Players">
      {items.map((it) => {
        const active = pathname.startsWith(it.href)
        return (
          <Link
            key={it.href}
            href={it.href}
            role="tab"
            aria-selected={active}
            className={cn('inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors', active ? 'bg-lime-bright text-on-accent' : 'text-ink-300 hover:bg-white/5 hover:text-white')}
          >
            <it.icon className="h-4 w-4" />
            {it.label}
            <span className={cn('rounded-full px-1.5 text-[10px] font-bold', active ? 'bg-black/15' : 'bg-white/10 text-ink-300')}>{it.hint}</span>
          </Link>
        )
      })}
    </div>
  )
}
