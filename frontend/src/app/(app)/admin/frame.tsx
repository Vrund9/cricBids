'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CreditCard, History, KeyRound, LayoutDashboard, MessageSquareHeart, Settings, ShieldCheck, Trophy, Users } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/feedback', label: 'Feedback', icon: MessageSquareHeart },
  { href: '/admin/plan-codes', label: 'Plan codes', icon: KeyRound },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/activity', label: 'Activity log', icon: History },
]

export function AdminFrame({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const path = usePathname()

  if (!user?.isAdmin) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20">
        <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title="Admins only">
          Your account doesn’t have access to the admin panel.
        </EmptyState>
      </main>
    )
  }

  const active = (href: string) => (href === '/admin' ? path === '/admin' : path.startsWith(href))

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:py-10">
      <aside className="lg:sticky lg:top-24 lg:h-fit lg:w-56 lg:shrink-0">
        <p className="mb-3 hidden items-center gap-2 px-3 text-xs font-semibold uppercase tracking-widest text-lime-glow lg:flex">
          <ShieldCheck className="h-4 w-4" /> Admin
        </p>
        <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 scroll-thin lg:mx-0 lg:flex-col lg:px-0">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                active(href) ? 'bg-lime-glow/10 text-lime-glow' : 'text-ink-300 hover:bg-white/5 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
