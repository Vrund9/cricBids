'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BadgeIndianRupee, Compass, Info, LayoutGrid, LogOut, Route, Settings, ShieldCheck, TriangleAlert, X } from 'lucide-react'
import { Logo } from './brand'
import { Avatar, PageLoader } from './ui'
import { resetTours } from './tour'
import { ThemeToggle } from './theme-toggle'
import { useRequireAuth } from '@/lib/auth'
import { api, setToken } from '@/lib/api'

interface Announcement { text: string; tone: 'info' | 'success' | 'warning' }

const TONES = {
  info: 'border-sky-live/30 bg-sky-live/10 text-sky-100',
  success: 'border-lime-glow/30 bg-lime-glow/10 text-lime-100',
  warning: 'border-gold/30 bg-gold/10 text-amber-100',
}

/** Platform-wide message set from the admin panel. Dismissal is remembered per message. */
function AnnouncementBar() {
  const [a, setA] = useState<Announcement | null>(null)
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    api<{ announcement: Announcement | null }>('/config', { auth: false })
      .then((c) => {
        if (!c.announcement) return
        try {
          if (localStorage.getItem('cricbid:dismissed') === c.announcement.text) return
        } catch {}
        setA(c.announcement)
      })
      .catch(() => {})
  }, [])
  if (!a || hidden) return null
  const Icon = a.tone === 'warning' ? TriangleAlert : Info
  return (
    <div className={`border-b px-4 py-2.5 text-sm ${TONES[a.tone]}`}>
      <div className="mx-auto flex max-w-7xl items-center gap-3 sm:px-2">
        <Icon className="h-4 w-4 shrink-0" />
        <p className="flex-1">{a.text}</p>
        <button
          aria-label="Dismiss"
          className="rounded-lg p-1 opacity-70 hover:bg-white/10 hover:opacity-100"
          onClick={() => {
            setHidden(true)
            try {
              localStorage.setItem('cricbid:dismissed', a.text)
            } catch {}
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRequireAuth()
  const router = useRouter()
  const [menu, setMenu] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setMenu(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  if (loading || !user) return <PageLoader />

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-900/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link href="/dashboard" className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-200 hover:bg-white/5 hover:text-white sm:inline-flex">
              <LayoutGrid className="h-4 w-4" /> Tournaments
            </Link>
            <Link href="/how-it-works" className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-200 hover:bg-white/5 hover:text-white md:inline-flex">
              <Route className="h-4 w-4" /> How it works
            </Link>
            <Link href="/plans" className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-200 hover:bg-white/5 hover:text-white md:inline-flex">
              <BadgeIndianRupee className="h-4 w-4" /> Pricing
            </Link>
            {user.isAdmin && (
              <Link href="/admin" className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm text-lime-glow hover:bg-lime-glow/10 sm:inline-flex">
                <ShieldCheck className="h-4 w-4" /> Admin
              </Link>
            )}
            <div className="relative" ref={ref}>
              <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 rounded-xl p-1.5 pr-3 hover:bg-white/5" aria-haspopup="menu" aria-expanded={menu} data-tour="account-menu">
                <Avatar src={user.avatarUrl} name={user.name} size={30} color="#34405a" />
                <span className="hidden max-w-32 truncate text-sm font-medium sm:block">{user.name}</span>
              </button>
              <AnimatePresence>
                {menu && (
                  <motion.div role="menu" initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/10 bg-ink-800 p-1.5 shadow-2xl">
                    <div className="px-3 py-2 text-xs text-ink-400">{user.email}</div>
                    <Link href="/account/theme" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/5">
                      <Settings className="h-4 w-4" /> Settings
                    </Link>
                    <Link href="/how-it-works" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/5 md:hidden">
                      <Route className="h-4 w-4" /> How it works
                    </Link>
                    <Link href="/plans" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/5 md:hidden">
                      <BadgeIndianRupee className="h-4 w-4" /> Pricing
                    </Link>
                    <button
                      onClick={() => {
                        setMenu(false)
                        resetTours(user.id)
                        router.push('/dashboard?tour=1')
                        if (window.location.pathname === '/dashboard') window.location.reload()
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/5"
                    >
                      <Compass className="h-4 w-4" /> Take the tour
                    </button>
                    {user.isAdmin && (
                      <Link href="/admin" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-lime-glow hover:bg-lime-glow/10">
                        <ShieldCheck className="h-4 w-4" /> Admin panel
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        // Clear the session and land on the home page. Leaving with a full page load
                        // (instead of clearing `user` first) stops the auth guard bouncing to /login.
                        setToken(null)
                        window.location.replace('/')
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-hot hover:bg-rose-hot/10"
                    >
                      <LogOut className="h-4 w-4" /> Log out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>
      <AnnouncementBar />
      {children}
    </div>
  )
}
