'use client'

import { Children, Fragment, forwardRef, isValidElement, useCallback, useEffect, useId, useRef, useState } from 'react'
import ReactSelect from 'react-select'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useSpring, useTransform } from 'motion/react'
import { Check, Eye, EyeOff, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'

// ───────────────────────── Button ─────────────────────────

const variants = {
  primary: 'bg-lime-bright text-on-accent hover:bg-lime-hover shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-lime-bright)_40%,transparent),0_8px_30px_-8px_color-mix(in_oklab,var(--color-lime-bright)_55%,transparent)]',
  secondary: 'bg-white/[0.07] text-white hover:bg-white/[0.12] border border-white/10',
  ghost: 'text-ink-200 hover:text-white hover:bg-white/[0.06]',
  outline: 'border border-white/15 text-white hover:bg-white/[0.06]',
  danger: 'bg-rose-hot/15 text-rose-hot border border-rose-hot/30 hover:bg-rose-hot/25',
  gold: 'bg-gold-bright text-on-gold hover:brightness-110 shadow-[0_8px_30px_-8px_rgba(255,176,32,0.6)]',
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

/** A password input with an eye button that shows or hides what was typed. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>>(function PasswordInput({ className, ...props }, ref) {
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <input ref={ref} type={shown ? 'text' : 'password'} autoCapitalize="none" spellCheck={false} className={cn(control, 'h-11 pr-11', className)} {...props} />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-ink-400 transition hover:text-white"
        aria-label={shown ? 'Hide password' : 'Show password'}
        aria-pressed={shown}
      >
        {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(control, 'min-h-24 py-3', className)} {...props} />
})

interface SelectOption {
  value: string
  label: string
  isDisabled?: boolean
}

function textOf(node: React.ReactNode): string {
  return Children.toArray(node).map((n) => (typeof n === 'string' || typeof n === 'number' ? String(n) : isValidElement<{ children?: React.ReactNode }>(n) ? textOf(n.props.children) : '')).join('')
}

/** Reads `<option>` children (also inside fragments and arrays) into react-select options. */
function optionsFrom(children: React.ReactNode) {
  const out: SelectOption[] = []
  const walk = (nodes: React.ReactNode) =>
    Children.forEach(nodes, (n) => {
      if (!isValidElement<{ children?: React.ReactNode; value?: string | number; disabled?: boolean }>(n)) return
      if (n.type === Fragment) return walk(n.props.children)
      if (n.type === 'option') {
        const label = textOf(n.props.children)
        out.push({ value: String(n.props.value ?? label), label, isDisabled: !!n.props.disabled })
      }
    })
  walk(children)
  return out
}

interface SelectProps {
  value?: string | number
  /** Called with a change-event-shaped object so callers can keep reading `e.target.value`. */
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  disabled?: boolean
  className?: string
  id?: string
  name?: string
  placeholder?: string
  'aria-label'?: string
  children?: React.ReactNode
}

/**
 * Themed dropdown built on react-select. It takes plain `<option>` children like a native
 * `<select>`; `className` sizes the box (h-9, w-40 …) and can recolour its border and text.
 * Long lists become searchable.
 */
export function Select({ value, onChange, disabled, className, id, name, placeholder, children, 'aria-label': ariaLabel }: SelectProps) {
  const instanceId = useId()
  const options = optionsFrom(children)
  const selected = options.find((o) => o.value === String(value ?? '')) ?? null
  return (
    <ReactSelect<SelectOption>
      unstyled
      instanceId={instanceId}
      inputId={id}
      name={name}
      aria-label={ariaLabel}
      options={options}
      value={selected}
      isDisabled={disabled}
      isSearchable={options.length > 8}
      placeholder={placeholder ?? 'Select…'}
      menuPlacement="auto"
      menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
      onChange={(o) => o && onChange?.({ target: { value: o.value }, currentTarget: { value: o.value } } as unknown as React.ChangeEvent<HTMLSelectElement>)}
      formatOptionLabel={(o, { context }) =>
        context === 'menu' ? (
          <span className="flex items-center gap-2">
            <span className="min-w-0 flex-1">{o.label}</span>
            {o.value === selected?.value && <Check className="h-3.5 w-3.5 shrink-0" />}
          </span>
        ) : (
          o.label
        )
      }
      classNames={{
        // The container carries the caller's size and colour classes; the control inherits the border colour.
        container: () => cn('h-11 w-full border-white/10 text-sm text-white', className),
        control: ({ isFocused, isDisabled }) =>
          cn(
            'h-full !min-h-0 cursor-pointer rounded-xl border bg-ink-850/80 pl-3.5 pr-2.5 transition',
            isFocused ? 'border-lime-glow/60 bg-ink-850 ring-4 ring-lime-glow/10' : '[border-color:inherit] hover:bg-ink-850',
            isDisabled && 'cursor-not-allowed opacity-50',
          ),
        valueContainer: () => 'gap-1',
        singleValue: () => 'truncate',
        placeholder: () => 'text-ink-400',
        input: () => 'text-white',
        indicatorSeparator: () => 'hidden',
        dropdownIndicator: ({ selectProps }) => cn('pl-2 text-ink-400 transition-transform duration-200', selectProps.menuIsOpen && 'rotate-180'),
        menuPortal: () => '!z-[70]',
        menu: () => 'mt-1.5 mb-1.5 !w-max min-w-full max-w-[min(90vw,24rem)] overflow-hidden rounded-xl border border-white/10 bg-ink-800 p-1 text-sm text-white shadow-2xl',
        menuList: () => 'scroll-thin',
        option: ({ isFocused, isSelected, isDisabled }) =>
          cn('cursor-pointer whitespace-nowrap rounded-lg px-3 py-2', isFocused && 'bg-white/[0.07]', isSelected && 'font-semibold text-lime-glow', isDisabled && 'cursor-not-allowed opacity-40'),
        noOptionsMessage: () => 'px-3 py-2 text-ink-400',
      }}
    />
  )
}

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
          className={cn('absolute top-0.5 h-5 w-5 rounded-full shadow', checked ? 'right-0.5 bg-ink-950' : 'left-0.5 bg-snow')}
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
      style={color ? { color: `color-mix(in oklab, ${color} var(--tint-strength), black)`, borderColor: `color-mix(in oklab, ${color} 33%, transparent)`, background: `color-mix(in oklab, ${color} 8%, transparent)` } : undefined}
    >
      {children}
    </span>
  )
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#8a94ad',
  READY: '#38bdf8',
  LIVE: 'var(--color-lime-glow)',
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

/** `art` is a larger illustration (e.g. <CricketScene />) shown instead of the small icon tile. */
export function EmptyState({ icon, art, title, children, action }: { icon?: React.ReactNode; art?: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
      {art ?? (icon && <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-ink-200">{icon}</div>)}
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {children && <p className="max-w-md text-sm text-ink-300">{children}</p>}
      {action}
    </div>
  )
}

export function Modal({ open, onClose, title, children, className, wide, stacked }: { open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode; className?: string; wide?: boolean; /** Opens above another open modal */ stacked?: boolean }) {
  // Rendered into <body>: a modal opened from inside an animated card would otherwise be positioned
  // relative to that card (transforms trap `position: fixed`) and later cards would paint over it.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // A stacked modal listens first (capture) and keeps Escape from also closing the one beneath it.
      if (stacked) e.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, stacked)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey, stacked)
      document.body.style.overflow = prev
    }
  }, [open, onClose, stacked])
  if (!mounted) return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className={cn('fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-6', stacked ? 'z-[70]' : 'z-[60]')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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

/** Waits between full passes over a photo's URLs; after the last one we give up and show initials. */
const PHOTO_RETRY_MS = [1500, 4000, 8000, 15000, 30000]

/**
 * URLs to try for one photo. Drive photos get a second Google host: Google throttles each by IP, and
 * every big screen at a venue shares one, so when lh3 starts refusing, the thumbnail host often still serves.
 */
function photoUrls(src: string) {
  const drive = src.match(/^https:\/\/lh3\.googleusercontent\.com\/d\/([\w-]+)/)?.[1]
  return drive ? [src, `https://drive.google.com/thumbnail?id=${drive}&sz=w800`] : [src]
}

/** A failed image is cached by URL, so a retry needs a URL the browser hasn't seen. */
function retryUrl(url: string, pass: number) {
  if (!pass) return url
  return `${url}${url.includes('?') ? '&' : '?'}retry=${pass}`
}

/**
 * `fit="photo"` keeps the height but lets the width follow the photo, so a portrait or landscape shot
 * is shown whole instead of cropped to a square. Initials stay square.
 * `eager` skips lazy loading, for the one photo everybody is looking at.
 */
export function Avatar({ src, name, size = 40, className, color, rounded = 'full', fit = 'square', eager }: { src?: string | null; name: string; size?: number; className?: string; color?: string; rounded?: 'full' | 'xl'; fit?: 'square' | 'photo'; eager?: boolean }) {
  // Tied to the src it belongs to, so a new photo starts again from its first URL.
  const [tries, setTries] = useState({ src, attempt: 0, waiting: false })
  const { attempt, waiting } = tries.src === src ? tries : { attempt: 0, waiting: false }
  const img = useRef<HTMLImageElement>(null)
  const urls = src ? photoUrls(src) : []
  const pass = Math.floor(attempt / Math.max(1, urls.length))
  const failed = !src || pass > PHOTO_RETRY_MS.length

  const onError = useCallback(() => {
    const next = attempt + 1
    // Try the other host straight away; once every host has failed, back off before the next pass.
    setTries({ src, attempt: next, waiting: next % urls.length === 0 && next / urls.length <= PHOTO_RETRY_MS.length })
  }, [src, attempt, urls.length])

  useEffect(() => {
    if (!waiting) return
    const t = setTimeout(() => setTries((s) => ({ ...s, waiting: false })), PHOTO_RETRY_MS[pass - 1])
    return () => clearTimeout(t)
  }, [waiting, pass])

  // A server-rendered image can fail before React attaches onError, so check once it's mounted.
  useEffect(() => {
    const el = img.current
    if (el && el.complete && el.naturalWidth === 0) onError()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  const radius = rounded === 'full' ? 'rounded-full' : 'rounded-xl'
  if (src && !failed && !waiting) {
    const photo = fit === 'photo'
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={img}
        key={attempt}
        src={retryUrl(urls[attempt % urls.length], pass)}
        alt={name}
        width={photo ? undefined : size}
        height={size}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : undefined}
        referrerPolicy="no-referrer"
        onError={onError}
        className={cn('shrink-0 bg-ink-700', photo ? 'object-contain' : 'object-cover', radius, className)}
        style={photo ? { height: size, width: 'auto', minWidth: size * 0.6, maxWidth: size * 1.5 } : { width: size, height: size }}
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
