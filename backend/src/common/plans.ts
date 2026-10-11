import { BadRequestException, ForbiddenException } from '@nestjs/common'

/**
 * Plan limits — the single source of truth the API enforces.
 * Prices live in the web app (frontend/src/lib/plans.ts) because they're display copy;
 * if you change a limit here, update the pricing page there too.
 */
export const PLAN_LIMITS = {
  FREE: { maxTeams: 6, maxPlayers: 60, remoteBidding: false, customTheme: false, hideBranding: false },
  PRO: { maxTeams: 16, maxPlayers: 500, remoteBidding: true, customTheme: true, hideBranding: true },
} as const

export type PlanName = keyof typeof PLAN_LIMITS
export type PlanLimits = (typeof PLAN_LIMITS)[PlanName]

export interface PlanInfo {
  plan: PlanName
  /** Why the tournament has this plan — a per-tournament upgrade or the owner's Season Pass. */
  source: 'FREE' | 'TOURNAMENT' | 'SEASON_PASS'
  seasonPassUntil: Date | null
  limits: PlanLimits
  billingMode: BillingMode
}

export type BillingMode = 'demo' | 'disabled'

/** "demo" activates upgrades instantly with no charge — for development and trials until a payment gateway is wired in. */
export function billingMode(): BillingMode {
  const m = process.env.BILLING_MODE
  if (m === 'demo' || m === 'disabled') return m
  return process.env.NODE_ENV === 'production' ? 'disabled' : 'demo'
}

export function planInfo(t: { plan: string }, owner?: { seasonPassUntil: Date | null } | null): PlanInfo {
  const pass = owner?.seasonPassUntil && owner.seasonPassUntil > new Date() ? owner.seasonPassUntil : null
  const plan: PlanName = t.plan === 'PRO' || pass ? 'PRO' : 'FREE'
  return {
    plan,
    source: t.plan === 'PRO' ? 'TOURNAMENT' : pass ? 'SEASON_PASS' : 'FREE',
    seasonPassUntil: owner?.seasonPassUntil ?? null,
    limits: PLAN_LIMITS[plan],
    billingMode: billingMode(),
  }
}

/** Thrown when a Free tournament hits a Pro-only limit. `code` lets the UI show an upgrade prompt. */
export function planLimit(message: string): never {
  throw new ForbiddenException({ statusCode: 403, code: 'PLAN_LIMIT', message })
}

// ───────────── Themes ─────────────

export const THEME_PRESETS = ['floodlight', 'royal', 'crimson', 'emerald', 'saffron', 'violet', 'ocean'] as const

export interface Theme {
  preset: (typeof THEME_PRESETS)[number]
  accent?: string
  hideBranding?: boolean
}

export function sanitizeTheme(input: unknown, limits: PlanLimits): Theme {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const preset = THEME_PRESETS.includes(raw.preset as any) ? (raw.preset as Theme['preset']) : 'floodlight'
  const theme: Theme = { preset }
  if (raw.accent !== undefined && raw.accent !== null && raw.accent !== '') {
    if (typeof raw.accent !== 'string' || !/^#[0-9a-f]{6}$/i.test(raw.accent)) throw new BadRequestException('Accent must be a hex colour like #22c55e')
    if (!limits.customTheme) planLimit('Custom brand colours are a Pro feature')
    theme.accent = raw.accent.toLowerCase()
  }
  if (raw.hideBranding) {
    if (!limits.hideBranding) planLimit('Removing CricBid branding is a Pro feature')
    theme.hideBranding = true
  }
  return theme
}

/** What public screens get: theme minus anything the current plan doesn't allow. */
export function publicTheme(theme: unknown, limits: PlanLimits): Theme {
  try {
    return sanitizeTheme(theme, limits)
  } catch {
    const raw = (theme && typeof theme === 'object' ? theme : {}) as Record<string, unknown>
    return { preset: THEME_PRESETS.includes(raw.preset as any) ? (raw.preset as Theme['preset']) : 'floodlight' }
  }
}
