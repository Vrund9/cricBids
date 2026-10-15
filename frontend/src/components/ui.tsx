'use client'

import { forwardRef, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useSpring, useTransform } from 'motion/react'
import { Loader2, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'

// ───────────────────────── Button ─────────────────────────

const variants = {
  primary: 'bg-lime-bright text-on-accent hover:bg-[#d6ff5c] shadow-[0_0_0_1px_rgba(200,255,46,0.4),0_8px_30px_-8px_rgba(200,255,46,0.55)]',
  secondary: 'bg-white/[0.07] text-white hover:bg-white/[0.12] border border-white/10',
  ghost: 'text-ink-200 hover:text-white hover:bg-white/[0.06]',
  outline: 'border border-white/15 text-white hover:bg-white/[0.06]',
  danger: 'bg-rose-hot/15 text-rose-hot border border-rose-hot/30 hover:bg-rose-hot/25',
  gold: 'bg-gold-bright text-on-accent hover:bg-[#ffc24d] shadow-[0_8px_30px_-8px_rgba(255,176,32,0.6)]',
} as const

const sizes = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
  xl: 'h-14 px-8 text-lg gap-2.5 rounded-2xl',
  icon: 'h-9 w-9 rounded-xl',
} as const

type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> & {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, disabled, children, ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </motion.button>
  )
})

// ───────────────────────── Form controls ─────────────────────────

const control =
  'w-full rounded-xl border border-white/10 bg-ink-850/80 px-3.5 text-sm text-white placeholder:text-ink-400 transition focus:border-lime-glow/60 focus:bg-ink-850 focus:outline-none focus:ring-4 focus:ring-lime-glow/10 disabled:opacity-50'

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(control, 'h-11', className)} {...props} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(control, 'min-h-24 py-3', className)} {...props} />
})

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        control,
        'h-11 appearance-none bg-[url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 fill=%27none%27 stroke=%27%238a94ad%27 stroke-width=%272%27><path d=%27M2 4l4 4 4-4%27/></svg>")] bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-9',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
})

export function Field({ label, hint, error, children, className, htmlFor }: { label?: React.ReactNode; hint?: React.ReactNode; error?: string | null; children: React.ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink-200">
          {label}
        </label>
      )}
      {children}
      {error ? <p className="text-xs text-rose-hot">{error}</p> : hint ? <p className="text-xs text-ink-400">{hint}</p> : null}
    </div>
  )
}

export function Switch({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: React.ReactNode; description?: React.ReactNode; disabled?: boolean }) {
  const id = useId()
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-start justify-between gap-4', disabled && 'cursor-not-allowed opacity-50')}>
      {(label || description) && (
        <span className="space-y-0.5">
          {label && <span className="block text-sm font-medium text-white">{label}</span>}
          {description && <span className="block text-xs text-ink-300">{description}</span>}
        </span>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-lime-bright' : 'bg-white/15')}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 600, damping: 35 }}
          className={cn('absolute top-0.5 h-5 w-5 rounded-full shadow', checked ? 'right-0.5 bg-ink-950' : 'left-0.5 bg-white')}
        />
      </button>
    </label>
  )
}

// ───────────────────────── Surfaces ─────────────────────────

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('card', className)} {...props}>
      {children}
    </div>
  )
}

export function Badge({ children, className, color }: { children: React.ReactNode; className?: string; color?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide', className)}
      style={color ? { color: `color-mix(in oklab, ${color} var(--tint-strength), black)`, borderColor: `${color}55`, background: `${color}14` } : undefined}
    >
      {children}
    </span>
  )
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#8a94ad',
  READY: '#38bdf8',
  LIVE: '#c8ff2e',
  PAUSED: '#ffb020',
  COMPLETED: '#a78bfa',
  AVAILABLE: '#8a94ad',
  SOLD: '#ffb020',
  UNSOLD: '#ff4d6d',
}

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? '#8a94ad'
  return (
    <Badge color={color}>
      {status === 'LIVE' && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full" style={{ background: color }} />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        </span>
      )}
      {status.toLowerCase()}
    </Badge>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-ink-300', className)} />
}

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="h-7 w-7" />
    </div>
  )
}

export function EmptyState({ icon, title, children, action }: { icon?: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
      {icon && <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-ink-200">{icon}</div>}
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {children && <p className="max-w-md text-sm text-ink-300">{children}</p>}
      {action}
    </div>
  )
}

export function Modal({ open, onClose, title, children, className, wide }: { open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode; className?: string; wide?: boolean }) {
  // Rendered into <body>: a modal opened from inside an animated card would otherwise be positioned
  // relative to that card (transforms trap `position: fixed`) and later cards would paint over it.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!mounted) return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={cn('relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-ink-850 p-6 shadow-2xl scroll-thin sm:rounded-3xl', wide ? 'sm:max-w-4xl' : 'sm:max-w-lg', className)}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              {title && <h2 className="font-display text-xl font-semibold">{title}</h2>}
              <button onClick={onClose} className="-m-1 ml-auto rounded-lg p-1 text-ink-300 hover:bg-white/5 hover:text-white" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// ───────────────────────── Avatars ─────────────────────────

const NEUTRAL_AVATARS = ['#34405a', '#222c41', '#182031', '#111622']

export function Avatar({ src, name, size = 40, className, color, rounded = 'full' }: { src?: string | null; name: string; size?: number; className?: string; color?: string; rounded?: 'full' | 'xl' }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  const radius = rounded === 'full' ? 'rounded-full' : 'rounded-xl'
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn('shrink-0 bg-ink-700 object-cover', radius, className)}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      aria-label={name}
      className={cn('grid shrink-0 place-items-center font-display font-bold text-snow', radius, className)}
      style={{
        width: size, height: size, fontSize: Math.max(10, size * (name.length > 2 && /^[A-Z0-9]{3,4}$/.test(name) ? 0.28 : 0.36)),
        // Neutral placeholders follow the theme; real colours (team colours) are kept as-is.
        ...(!color || NEUTRAL_AVATARS.includes(color.toLowerCase())
          ? { background: 'var(--avatar-bg)', color: 'var(--avatar-fg)' }
          : { background: `linear-gradient(135deg, ${color}, ${color}88)` }),
      }}
    >
      {/^[A-Z0-9]{1,4}$/.test(name) ? name : initials(name) || '?'}
    </div>
  )
}

// ───────────────────────── Motion helpers ─────────────────────────

/** Number that springs to its new value — used for bids and purses. */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const spring = useSpring(value, { stiffness: 140, damping: 22, mass: 0.6 })
  const display = useTransform(spring, (v) => format(Math.round(v)))
  useEffect(() => {
    spring.set(value)
  }, [spring, value])
  return <motion.span className="tabular">{display}</motion.span>
}

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 120, damping: 20 } },
}

export const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
