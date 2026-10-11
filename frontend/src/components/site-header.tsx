'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { Logo } from './brand'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'

export function SiteHeader() {
  const { user } = useAuth()
  const [scrolled, setScrolled] = useState(false)
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
      className={cn('fixed inset-x-0 top-0 z-40 transition-all', scrolled ? 'border-b border-white/5 bg-ink-900/75 backdrop-blur-xl' : 'bg-transparent')}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-ink-200 md:flex" aria-label="Main">
          <Link href="/#how" className="hover:text-white">How it works</Link>
          <Link href="/#features" className="hover:text-white">Features</Link>
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
          <Link href="/#faq" className="hover:text-white">FAQ</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link href="/dashboard" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-lime-glow px-4 text-sm font-semibold text-ink-950 hover:bg-[#d6ff5c]">
              Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden h-9 items-center rounded-xl px-3 text-sm font-medium text-ink-200 hover:text-white sm:inline-flex">
                Log in
              </Link>
              <Link href="/signup" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-lime-glow px-4 text-sm font-semibold text-ink-950 hover:bg-[#d6ff5c]">
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.header>
  )
}
