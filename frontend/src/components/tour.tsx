'use client'

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { Button } from './ui'
import { useAuth } from '@/lib/auth'
import { uiFlags } from '@/lib/flags'

export interface TourStep {
  /** Matches an element's `data-tour` attribute. Omit for a centred intro/outro card. */
  target?: string
  title: string
  body: React.ReactNode
}

const PAD = 8
const GAP = 14
const CARD_W = 340

const storageKey = (id: string, userId: string) => `cricbid.tour.${id}.${userId}`

/** Clears every tour's "seen" flag so they replay (used by "Take the tour" in the account menu). */
export function resetTours(userId: string) {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('cricbid.tour.') && k.endsWith(`.${userId}`)) localStorage.removeItem(k)
  } catch {}
}

/**
 * First-run guided tour: spotlights one element at a time with a tooltip.
 * Shown once per user per tour id; `when` lets the page wait until its content has rendered.
 */
export function Tour({ id, steps, when = true, onlyNewUsers = false }: { id: string; steps: TourStep[]; when?: boolean; onlyNewUsers?: boolean }) {
  const { user } = useAuth()
  const [active, setActive] = useState(false)
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [vw, setVw] = useState(0)
  const [vh, setVh] = useState(0)

  useEffect(() => {
    if (!when || !user) return
    let seen = true
    try {
      seen = !!localStorage.getItem(storageKey(id, user.id))
    } catch {}
    // "New" = joined in the last 3 days, so existing organisers aren't interrupted after an update.
    const isNew = Date.now() - new Date(user.createdAt).getTime() < 3 * 24 * 60 * 60 * 1000
    const replay = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('tour')
    // Arriving to buy add-ons (pricing calculator link) — don't cover the checkout with the tour.
    if (window.location.hash.startsWith('#addons') || uiFlags.checkoutFromLink) return
    if (!seen && (!onlyNewUsers || isNew || replay)) {
      const t = setTimeout(() => setActive(true), 600)
      return () => clearTimeout(t)
    }
  }, [id, user, when, onlyNewUsers])

  const finish = useCallback(() => {
    setActive(false)
    if (user) {
      try {
        localStorage.setItem(storageKey(id, user.id), new Date().toISOString())
      } catch {}
    }
  }, [id, user])

  const step = steps[i]

  // Track the target's position (it can move while the page settles or the user scrolls).
  useLayoutEffect(() => {
    if (!active) return
    const el = step?.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const measure = () => {
      setVw(window.innerWidth)
      setVh(window.innerHeight)
      const r = el?.getBoundingClientRect()
      setRect(r && r.width > 0 && r.height > 0 ? r : null)
    }
    measure()
    const t = setInterval(measure, 200)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearInterval(t)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [active, step?.target])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      if (e.key === 'ArrowRight') setI((n) => (n < steps.length - 1 ? n + 1 : n))
      if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, finish, steps.length])

  if (!active || !step || typeof document === 'undefined') return null

  const last = i === steps.length - 1
  const cardW = Math.min(CARD_W, vw - 32)
  // Below the target if there's room, otherwise above; centred when there's no target.
  let pos: React.CSSProperties = { left: (vw - cardW) / 2, top: Math.max(16, vh / 2 - 120) }
  if (rect) {
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - cardW / 2), vw - cardW - 16)
    const below = rect.bottom + PAD + GAP
    pos = vh - below > 230 ? { left, top: below } : { left, bottom: vh - rect.top + PAD + GAP }
  }

  return createPortal(
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={step.title}>
      {/* Click-blocker; the spotlight's huge shadow does the dimming. */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} style={rect ? undefined : { background: 'rgba(5,7,12,0.72)' }} />
      {rect && (
        <motion.div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-lime-glow"
          initial={false}
          animate={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          style={{ boxShadow: '0 0 0 9999px rgba(5,7,12,0.72), 0 0 40px color-mix(in oklab, var(--color-lime-bright) 35%, transparent)' }}
        />
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="absolute rounded-2xl border border-white/10 bg-ink-800 p-5 shadow-2xl"
          style={{ ...pos, width: cardW }}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-lime-glow">
              {steps.length > 1 ? `Step ${i + 1} of ${steps.length}` : 'Tip'}
            </p>
            <button onClick={finish} className="-m-1 rounded-lg p-1 text-ink-400 hover:bg-white/5 hover:text-white" aria-label="Skip tour">
              <X className="h-4 w-4" />
            </button>
          </div>
          <h3 className="mt-2 font-display text-lg font-semibold">{step.title}</h3>
          <div className="mt-1.5 text-sm leading-relaxed text-ink-300">{step.body}</div>
          <div className="mt-5 flex items-center gap-2">
            <div className="flex flex-1 gap-1.5">
              {steps.map((_, n) => (
                <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-5 bg-lime-bright' : 'w-1.5 bg-white/15'}`} />
              ))}
            </div>
            {i > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setI(i - 1)} aria-label="Previous">
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
            )}
            {i === 0 && !last && <Button size="sm" variant="ghost" onClick={finish}>Skip</Button>}
            <Button size="sm" onClick={() => (last ? finish() : setI(i + 1))}>
              {last ? 'Got it' : 'Next'} {!last && <ArrowRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body,
  )
}
