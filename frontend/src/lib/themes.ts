import type { CSSProperties } from 'react'

export interface ThemeConfig {
  preset: ThemePreset
  accent?: string
  hideBranding?: boolean
  background?: ThemeBackground
  /** Used when background is 'image' */
  backgroundImage?: string
}

export type ThemeBackground = 'glow' | 'stadium' | 'pitch' | 'stars' | 'grid' | 'solid' | 'image'

export const BACKGROUNDS: { id: ThemeBackground; name: string; vibe: string }[] = [
  { id: 'glow', name: 'Glow', vibe: 'Soft colour wash' },
  { id: 'stadium', name: 'Stadium lights', vibe: 'Floodlight beams over the ground' },
  { id: 'pitch', name: 'Pitch stripes', vibe: 'Mown outfield stripes' },
  { id: 'stars', name: 'Night sky', vibe: 'Day-night match under the stars' },
  { id: 'grid', name: 'Scoreboard grid', vibe: 'Clean broadcast grid' },
  { id: 'solid', name: 'Solid', vibe: 'Plain, no distractions' },
  { id: 'image', name: 'Your image', vibe: 'Upload a poster or ground photo' },
]

/** CSS background for a theme's backdrop. Images get a dark wash so text stays readable. */
export function themeBackground(theme: Partial<ThemeConfig> | null | undefined, p: Palette & { accent: string }) {
  const [i950, i900] = p.ink
  switch (theme?.background) {
    case 'stadium':
      return `radial-gradient(ellipse 45% 70% at 8% -12%, ${p.accent}2e, transparent 65%), radial-gradient(ellipse 45% 70% at 92% -12%, ${p.second}26, transparent 65%), radial-gradient(ellipse 80% 40% at 50% 115%, #1f7a3a55, transparent 70%), linear-gradient(180deg, ${i950}, ${i900})`
    case 'pitch':
      return `radial-gradient(900px 500px at 50% -10%, ${p.accent}1a, transparent 60%), repeating-linear-gradient(90deg, #2ea04314 0 90px, #2ea04308 90px 180px), linear-gradient(180deg, ${i900}, #07170e)`
    case 'stars':
      return `radial-gradient(1.5px 1.5px at 12% 18%, #ffffffaa, transparent), radial-gradient(1px 1px at 28% 62%, #ffffff88, transparent), radial-gradient(1.5px 1.5px at 47% 12%, #ffffffaa, transparent), radial-gradient(1px 1px at 63% 44%, #ffffff77, transparent), radial-gradient(1.5px 1.5px at 81% 22%, #ffffffaa, transparent), radial-gradient(1px 1px at 91% 70%, #ffffff88, transparent), radial-gradient(1px 1px at 6% 82%, #ffffff77, transparent), radial-gradient(1200px 600px at 85% -10%, ${p.accent}14, transparent 60%), ${i950}`
    case 'grid':
      return `linear-gradient(${p.accent}0d 1px, transparent 1px) 0 0 / 48px 48px, linear-gradient(90deg, ${p.accent}0d 1px, transparent 1px) 0 0 / 48px 48px, radial-gradient(1000px 500px at 50% -10%, ${p.accent}17, transparent 60%), ${i900}`
    case 'solid':
      return i900
    case 'image':
      return theme.backgroundImage
        ? `linear-gradient(${i950}c7, ${i950}e6), url("${theme.backgroundImage.replace(/"/g, '%22')}") center / cover no-repeat fixed, ${i900}`
        : i900
    default:
      return `radial-gradient(1200px 600px at 85% -10%, ${p.accent}17, transparent 60%), radial-gradient(900px 500px at -10% 10%, ${p.second}12, transparent 60%), ${i900}`
  }
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
    // Screens are always dark: pin every token light mode would otherwise flip.
    '--color-ink-600': '#222c41',
    '--color-ink-500': '#34405a',
    '--color-ink-400': '#5b6783',
    '--color-ink-300': '#8a94ad',
    '--color-ink-200': '#b8c0d4',
    '--color-ink-100': '#e3e7f0',
    '--color-white': '#ffffff',
    '--color-rose-hot': '#ff4d6d',
    '--color-lime-bright': p.accent,
    '--color-lime-hover': p.accent,
    '--color-lime-deep': p.accent,
    // Light mode paints accent fills with a gradient; screens use their own flat accent instead.
    '--accent-fill': 'none',
    '--accent-fill-hover': 'none',
    '--color-gold-bright': p.gold,
    '--color-on-accent': i950,
    '--color-on-gold': i950,
    '--border': 'rgb(255 255 255 / 0.08)',
    '--border-strong': 'rgb(255 255 255 / 0.14)',
    '--tint-strength': '100%',
    '--card-bg': 'linear-gradient(180deg, rgb(255 255 255 / 0.035), rgb(255 255 255 / 0.015))',
    '--card-shadow': 'none',
    '--avatar-bg': 'linear-gradient(135deg, #34405a, #34405a88)',
    '--avatar-fg': '#ffffff',
    '--gradient-end': '#e9ff9a',
    '--fg': '#ffffff',
    colorScheme: 'dark',
    color: '#ffffff',
    background: themeBackground(theme, p),
  } as CSSProperties
}
