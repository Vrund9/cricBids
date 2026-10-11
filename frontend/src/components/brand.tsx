import Link from 'next/link'
import { cn } from '@/lib/cn'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8', className)} aria-hidden>
      <defs>
        <linearGradient id="cb-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e9ff9a" />
          <stop offset="1" stopColor="#9fd400" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="#0c1019" />
      <circle cx="16" cy="16" r="9" fill="url(#cb-g)" />
      <path d="M10.2 11.5c3.2 2.4 3.2 6.6 0 9M21.8 11.5c-3.2 2.4-3.2 6.6 0 9" stroke="#0c1019" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeDasharray="1.6 1.4" />
    </svg>
  )
}

export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2.5', className)} aria-label="CricBid home">
      <LogoMark />
      <span className="font-display text-xl font-extrabold tracking-tight">
        Cric<span className="text-lime-glow">Bid</span>
      </span>
    </Link>
  )
}
