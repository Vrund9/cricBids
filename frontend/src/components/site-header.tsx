'use client'

import Link from 'next/link'
import { ThemeToggle } from './theme-toggle'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Menu, X } from 'lucide-react'
import { Logo } from './brand'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'

const NAV = [
  ['/#how', 'How it works'],
  ['/#new', 'What’s new'],
  ['/#features', 'Features'],
  ['/pricing', 'Pricing'],
  ['/#faq', 'FAQ'],
] as const

export function SiteHeader() {
  const { user } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn('fixed inset-x-0 top-0 z-40 transition-all', scrolled || open ? 'border-b border-white/5 bg-ink-900/75 backdrop-blur-xl' : 'bg-transparent')}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-ink-200 md:flex" aria-label="Main">
          {NAV.map(([href, label]) => <Link key={href} href={href} className="hover:text-white">{label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <Link href="/dashboard" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-lime-bright px-4 text-sm font-semibold text-on-accent hover:bg-lime-hover">
              Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden h-9 items-center rounded-xl px-3 text-sm font-medium text-ink-200 hover:text-white sm:inline-flex">
                Log in
              </Link>
              <Link href="/signup" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-lime-bright px-4 text-sm font-semibold text-on-accent hover:bg-lime-hover">
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
          <button
            className="-mr-1 grid h-10 w-10 place-items-center rounded-xl text-ink-200 hover:bg-white/5 hover:text-white md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-nav"
            aria-label="Main"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border-b border-white/5 bg-ink-900/95 px-4 pb-4 backdrop-blur-xl md:hidden"
          >
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} className="flex h-12 items-center border-b border-white/5 text-base text-ink-100">
                {label}
              </Link>
            ))}
            {!user && (
              <Link href="/login" onClick={() => setOpen(false)} className="mt-3 flex h-12 items-center justify-center rounded-xl border border-white/10 text-base font-semibold">
                Log in
              </Link>
            )}
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
