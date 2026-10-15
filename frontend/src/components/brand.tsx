import Link from 'next/link'
import { useId } from 'react'
import { cn } from '@/lib/cn'

/** BidWicket mark (see lib/brand-mark.ts): three stumps, one bail flying off. */
export function LogoMark({ className }: { className?: string }) {
  const g = `bw-${useId().replace(/:/g, '')}`
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8', className)} aria-hidden>
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9ff9a" />
          <stop offset="1" stopColor="#9fd400" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="#0c1019" />
      <rect x="9.2" y="12.2" width="2.7" height="13" rx="1.35" fill={`url(#${g})`} />
      <rect x="14.65" y="12.2" width="2.7" height="13" rx="1.35" fill={`url(#${g})`} />
      <rect x="20.1" y="12.2" width="2.7" height="13" rx="1.35" fill={`url(#${g})`} />
      <rect x="9.2" y="9.5" width="6.3" height="1.8" rx=".9" fill="#c8ff2e" />
      <rect x="16.8" y="7.6" width="6.3" height="1.8" rx=".9" fill="#c8ff2e" transform="rotate(-28 19.95 8.5)" />
    </svg>
  )
}

export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2.5', className)} aria-label="BidWicket home">
      <LogoMark />
      <span className="font-display text-xl font-extrabold tracking-tight">
        Bid<span className="text-lime-glow">Wicket</span>
      </span>
    </Link>
  )
}
