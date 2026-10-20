'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Gift, KeyRound, Lock, Palette, UserRound } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'

const ITEMS = [
  { href: '/account/theme', label: 'Theme', icon: Palette },
  { href: '/account', label: 'Profile', icon: UserRound },
  { href: '/account/password', label: 'Password', icon: Lock },
  { href: '/account/feedback', label: 'Feedback & rewards', icon: Gift },
  { href: '/account/plan', label: 'Plan activation', icon: KeyRound },
]

export function AccountNav() {
  const path = usePathname()
  const { user } = useAuth()
  return (
    <nav className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto md:w-56 md:flex-col" aria-label="Account">
      {ITEMS.map((it) => {
        const active = it.href === '/account' ? path === '/account' : path.startsWith(it.href)
        return (
          <Link key={it.href} href={it.href} className={cn('inline-flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', active ? 'bg-lime-bright text-on-accent' : 'text-ink-300 hover:bg-white/5 hover:text-white')}>
            <it.icon className="h-4 w-4" />
            {it.label}
            {it.href === '/account/feedback' && !!user?.rewardPoints && <span className={cn('ml-auto rounded-full px-1.5 text-[10px] font-bold', active ? 'bg-black/15' : 'bg-gold/15 text-gold')}>{user.rewardPoints}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

/** Settings pages are short forms; only the theme editor (options + live preview) uses the full width. */
export function SettingsContent({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  return <div className={cn('min-w-0 flex-1', !path.startsWith('/account/theme') && 'max-w-3xl')}>{children}</div>
}
