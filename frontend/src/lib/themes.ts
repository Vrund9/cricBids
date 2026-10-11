import type { CSSProperties } from 'react'

export interface ThemeConfig {
  preset: ThemePreset
  accent?: string
  hideBranding?: boolean
}

export type ThemePreset = 'floodlight' | 'royal' | 'crimson' | 'emerald' | 'saffron' | 'violet' | 'ocean'

interface Palette {
  name: string
  vibe: string
  accent: string
  gold: string
  second: string
  ink: [string, string, string, string, string] // 950, 900, 850, 800, 700
}

/** Public-screen themes. Each swaps the CSS colour tokens the whole UI is built on. */
export const THEMES: Record<ThemePreset, Palette> = {
  floodlight: { name: 'Floodlight', vibe: 'Night match under lights', accent: '#c8ff2e', gold: '#ffb020', second: '#38bdf8', ink: ['#05070c', '#080b13', '#0c1019', '#111622', '#182031'] },
  royal: { name: 'Royal', vibe: 'Blue & gold, league-final energy', accent: '#5b8cff', gold: '#f5c542', second: '#a78bfa', ink: ['#04061a', '#070b24', '#0b1030', '#10163b', '#18204d'] },
  crimson: { name: 'Crimson', vibe: 'Fiery red for rivalry nights', accent: '#ff4d6d', gold: '#ffc43d', second: '#ff8a3d', ink: ['#0d0407', '#14070b', '#1b0b10', '#231016', '#30161e'] },
  emerald: { name: 'Emerald', vibe: 'Fresh outfield green', accent: '#2ee59d', gold: '#ffd166', second: '#4dd4ff', ink: ['#020c08', '#04120c', '#071a12', '#0b2118', '#112e22'] },
  saffron: { name: 'Saffron', vibe: 'Warm festival colours', accent: '#ff9933', gold: '#ffd700', second: '#2ee59d', ink: ['#0d0702', '#140b04', '#1b1007', '#23150a', '#2f1d0f'] },
  violet: { name: 'Violet', vibe: 'Neon league night', accent: '#b388ff', gold: '#ffcf5c', second: '#ff7ad9', ink: ['#07040f', '#0b0716', '#110b20', '#170f2a', '#211639'] },
  ocean: { name: 'Ocean', vibe: 'Coastal cool cyan', accent: '#22d3ee', gold: '#fbbf24', second: '#818cf8', ink: ['#020a10', '#041019', '#071722', '#0b1e2c', '#10293b'] },
}

export function palette(theme?: Partial<ThemeConfig> | null) {
  const base = THEMES[(theme?.preset as ThemePreset) ?? 'floodlight'] ?? THEMES.floodlight
  return { ...base, accent: theme?.accent || base.accent }
}

/** Inline style that re-skins everything inside it (Tailwind v4 utilities read these variables). */
export function themeStyle(theme?: Partial<ThemeConfig> | null): CSSProperties {
  const p = palette(theme)
  const [i950, i900, i850, i800, i700] = p.ink
  return {
    '--color-lime-glow': p.accent,
    '--color-gold': p.gold,
    '--color-sky-live': p.second,
    '--color-ink-950': i950,
    '--color-ink-900': i900,
    '--color-ink-850': i850,
    '--color-ink-800': i800,
    '--color-ink-700': i700,
    background: `radial-gradient(1200px 600px at 85% -10%, ${p.accent}17, transparent 60%), radial-gradient(900px 500px at -10% 10%, ${p.second}12, transparent 60%), ${i900}`,
  } as CSSProperties
}
