'use client'

import Image from 'next/image'
import { cn } from '@/lib/cn'

export type AuctionMode = 'RANDOM' | 'CHIT'

const MODES: { id: AuctionMode; image: string; title: string; text: string }[] = [
  { id: 'RANDOM', image: '/modes/random.png', title: 'Computer picks', text: 'A secure random draw decides who comes up next.' },
  { id: 'CHIT', image: '/modes/chit.png', title: 'Chit mode (Indian)', text: 'Draw a numbered chit from a bowl and type its number.' },
]

/** How players come up in the auction: the computer draws them, or the auctioneer draws chits. */
export function AuctionModePicker({ value, onChange, disabled }: { value: AuctionMode; onChange: (v: AuctionMode) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="How do players come up?">
      {MODES.map((m) => {
        const active = value === m.id
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(m.id)}
            className={cn('overflow-hidden rounded-xl border text-left transition disabled:cursor-not-allowed disabled:opacity-50', active ? 'border-lime-glow/60 bg-lime-glow/[0.06]' : 'border-white/10 hover:border-white/25')}
          >
            <Image src={m.image} alt="" width={640} height={400} className="aspect-[8/5] w-full object-cover" />
            <span className="flex gap-2.5 p-3">
              <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2', active ? 'border-lime-glow' : 'border-ink-400')}>
                {active && <span className="h-1.5 w-1.5 rounded-full bg-lime-glow" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{m.title}</span>
                <span className="mt-0.5 block text-xs text-ink-400">{m.text}</span>
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
