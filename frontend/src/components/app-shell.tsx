'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { LayoutGrid, LogOut, UserRound } from 'lucide-react'
import { Logo } from './brand'
import { Avatar, PageLoader } from './ui'
import { useRequireAuth } from '@/lib/auth'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useRequireAuth()
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
            <Link href="/dashboard" className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-200 hover:bg-white/5 hover:text-white sm:inline-flex">
              <LayoutGrid className="h-4 w-4" /> Tournaments
            </Link>
            <div className="relative" ref={ref}>
              <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 rounded-xl p-1.5 pr-3 hover:bg-white/5" aria-haspopup="menu" aria-expanded={menu}>
                <Avatar src={user.avatarUrl} name={user.name} size={30} color="#34405a" />
                <span className="hidden max-w-32 truncate text-sm font-medium sm:block">{user.name}</span>
              </button>
              <AnimatePresence>
                {menu && (
                  <motion.div role="menu" initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/10 bg-ink-800 p-1.5 shadow-2xl">
                    <div className="px-3 py-2 text-xs text-ink-400">{user.email}</div>
                    <Link href="/account" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/5">
                      <UserRound className="h-4 w-4" /> Account
                    </Link>
                    <button
                      onClick={() => {
                        signOut()
                        router.replace('/login')
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
      {children}
    </div>
  )
}
