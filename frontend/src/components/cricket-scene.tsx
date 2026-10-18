'use client'

import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/cn'

type Variant = 'six' | 'bowled' | 'trophy'

const LOOP = { duration: 2.6, repeat: Infinity, repeatDelay: 0.6 }

/**
 * Small looping cricket illustration for empty states:
 * `six` — a batter smashes the ball out of the ground, `bowled` — the stumps go flying,
 * `trophy` — a bouncing trophy with sparkles. Pure SVG, a few transforms, no blur.
 */
export function CricketScene({ variant = 'six', className }: { variant?: Variant; className?: string }) {
  const still = useReducedMotion()
  const loop = (t: object) => (still ? { duration: 0 } : { ...LOOP, ...t })
  return (
    <svg viewBox="0 0 240 150" className={cn('h-36 w-auto', className)} role="img" aria-label="Cricket illustration">
      {/* pitch */}
      <ellipse cx="120" cy="132" rx="104" ry="12" fill="var(--color-lime-glow)" opacity="0.12" />
      <rect x="60" y="126" width="120" height="8" rx="4" fill="#d9c08a" opacity="0.55" />

      {variant === 'six' && (
        <>
          {/* stumps behind the batter */}
          {[34, 42, 50].map((x) => <rect key={x} x={x} y="84" width="4" height="44" rx="2" fill="#e9d3a2" />)}
          <rect x="32" y="82" width="22" height="3" rx="1.5" fill="#e9d3a2" />
          {/* bat */}
          <motion.g style={{ originX: '70px', originY: '120px' }} initial={{ rotate: -70 }} animate={still ? { rotate: -20 } : { rotate: [-70, -70, 35, 10, -70] }} transition={loop({ times: [0, 0.32, 0.42, 0.6, 1] })}>
            <rect x="67" y="56" width="6" height="22" rx="3" fill="#3a3f4b" />
            <path d="M63 76 h14 l2 44 q0 6 -9 6 q-9 0 -9 -6 z" fill="#f2d39b" stroke="#c99a52" strokeWidth="1.5" />
          </motion.g>
          {/* ball: bowled in, then hit for six */}
          <motion.g initial={{ x: 220, y: 112 }} animate={still ? { x: 150, y: 40 } : { x: [220, 150, 84, 150, 250], y: [112, 120, 110, 40, -20], opacity: [1, 1, 1, 1, 0] }} transition={loop({ times: [0, 0.2, 0.38, 0.62, 0.9] })}>
            <circle r="6" fill="#d7263d" />
            <path d="M-3 -5 q3 5 0 10 M3 -5 q-3 5 0 10" stroke="#fff" strokeWidth="1" fill="none" />
          </motion.g>
          <motion.text x="168" y="42" fontSize="30" fontWeight="900" fill="var(--color-gold)" initial={{ opacity: 0, scale: 0.4 }} animate={still ? { opacity: 1 } : { opacity: [0, 0, 1, 0], scale: [0.4, 0.4, 1.15, 1.3] }} transition={loop({ times: [0, 0.45, 0.62, 0.9] })} style={{ originX: '180px', originY: '32px' }}>
            6!
          </motion.text>
        </>
      )}

      {variant === 'bowled' && (
        <>
          {[-10, 0, 10].map((dx, i) => (
            <motion.rect key={dx} x={156 + dx} y="80" width="5" height="46" rx="2.5" fill="#e9d3a2" style={{ originX: `${158 + dx}px`, originY: '126px' }} animate={still ? {} : { rotate: [0, 0, (i - 1) * 32 || -14, 0], y: [0, 0, -6, 0] }} transition={loop({ times: [0, 0.45, 0.6, 1] })} />
          ))}
          {[-5, 6].map((dx, i) => (
            <motion.rect key={dx} x={150 + dx} y="77" width="11" height="3" rx="1.5" fill="#e9d3a2" animate={still ? {} : { x: [0, 0, i ? 34 : -30, 0], y: [0, 0, -40, 0], rotate: [0, 0, i ? 200 : -220, 0], opacity: [1, 1, 1, 1] }} transition={loop({ times: [0, 0.45, 0.62, 1] })} />
          ))}
          <motion.g initial={{ x: 10, y: 70 }} animate={still ? { x: 140, y: 110 } : { x: [10, 100, 158, 158], y: [70, 124, 104, 104], opacity: [1, 1, 1, 0] }} transition={loop({ times: [0, 0.32, 0.46, 0.7] })}>
            <circle r="6" fill="#d7263d" />
          </motion.g>
          {[0, 1].map((i) => (
            <motion.circle key={i} cx="158" cy="104" r="10" fill="none" stroke="var(--color-lime-glow)" strokeWidth="2" initial={{ opacity: 0 }} animate={still ? {} : { scale: [0.5, 0.5, 2.6 + i], opacity: [0, 0, 0.8, 0] }} transition={loop({ times: [0, 0.45, 0.6, 0.85] })} style={{ originX: '158px', originY: '104px' }} />
          ))}
        </>
      )}

      {variant === 'trophy' && (
        <motion.g animate={still ? {} : { y: [0, -8, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
          <path d="M96 44 h48 v16 q0 26 -24 30 q-24 -4 -24 -30 z" fill="var(--color-gold)" />
          <path d="M96 50 q-16 0 -14 14 q2 10 16 12 M144 50 q16 0 14 14 q-2 10 -16 12" stroke="var(--color-gold)" strokeWidth="4" fill="none" />
          <rect x="114" y="90" width="12" height="14" fill="var(--color-gold)" />
          <rect x="102" y="104" width="36" height="10" rx="3" fill="var(--color-gold)" />
          <circle cx="120" cy="62" r="7" fill="#fff" opacity="0.35" />
          {[[78, 36], [160, 30], [170, 76], [70, 82]].map(([x, y], i) => (
            <motion.path key={i} d={`M${x} ${y - 6} l2 4 l4 2 l-4 2 l-2 4 l-2 -4 l-4 -2 l4 -2 z`} fill="var(--color-lime-glow)" animate={still ? {} : { opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.35 }} style={{ originX: `${x}px`, originY: `${y}px` }} />
          ))}
        </motion.g>
      )}
    </svg>
  )
}
