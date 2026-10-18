import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { settings } from './settings'

/**
 * Pay-per-use pricing — the single source of truth the API enforces.
 * Every tournament is free with up to `includedTeams` teams; organisers pay only for extras:
 *   • ₹100 per team above the free 6
 *   • ₹200 to customise the screen theme (colours, accent, background)
 *   • ₹500 per auction from their 4th auction onwards
 *   • ₹300 for a one-click random auction (players drawn to teams grade by grade)
 *   • or ₹800 for Pro on one auction: every add-on above included
 * Remote bidding, removing branding and up to `maxPlayers` players are free for everyone.
 * "Full access" (legacy Pro, an admin-granted pass, or a redeemed plan code) unlocks everything.
 * Display copy lives in frontend/src/lib/plans.ts — keep the numbers in sync.
 */
export type PlanName = 'FREE' | 'PRO'

export const PRICING = {
  perExtraTeam: 100,
  themeUnlock: 200,
  auctionFee: 500,
  randomAuction: 300,
  /** Pro for one auction: everything unlocked (sets the tournament's plan to PRO) */
  pro: 800,
  /** Auctions an account can run before the auction fee applies */
  freeAuctions: 2,
} as const

export interface PlanLimits {
  /** Teams allowed right now (free allowance + paid extras, or the hard cap with full access) */
  maxTeams: number
  /** Teams included free */
  includedTeams: number
  /** Hard cap on teams, paid or not */
  teamCap: number
  maxPlayers: number
  remoteBidding: boolean
  customTheme: boolean
  hideBranding: boolean
  /** True when this auction needs the auction fee before it can start */
  auctionFeeDue: boolean
  /** One-click random auction available */
  randomAuction: boolean
}

/** The owner fields plan checks need — select these wherever a tournament's plan is computed. */
export const PLAN_OWNER_SELECT = { seasonPassUntil: true, fullAccess: true } as const

export interface PlanInfo {
  /** PRO = full access; FREE = pay-per-use */
  plan: PlanName
  source: 'FREE' | 'TOURNAMENT' | 'SEASON_PASS' | 'PLAN_CODE'
  seasonPassUntil: Date | null
  limits: PlanLimits
  /** What this tournament has bought */
  purchases: { extraTeams: number; themeUnlocked: boolean; auctionFeePaid: boolean; randomUnlocked: boolean }
  /** This is the owner's Nth auction */
  sequence: number
  pricing: typeof PRICING
  billingMode: BillingMode
}

export type BillingMode = 'demo' | 'disabled'

/** "demo" activates purchases instantly with no charge — for development and trials until a payment gateway is wired in. */
export function billingMode(): BillingMode {
  const override = settings().billingMode
  if (override !== 'auto') return override
  const m = process.env.BILLING_MODE
  if (m === 'demo' || m === 'disabled') return m
  return process.env.NODE_ENV === 'production' ? 'disabled' : 'demo'
}

type PlanTournament = { plan: string; extraTeams?: number; themeUnlocked?: boolean; auctionFeePaid?: boolean; randomUnlocked?: boolean; sequence?: number }
type PlanOwner = { seasonPassUntil: Date | null; fullAccess?: boolean } | null | undefined

export function planInfo(t: PlanTournament, owner?: PlanOwner): PlanInfo {
  const s = settings()
  const pass = owner?.seasonPassUntil && owner.seasonPassUntil > new Date() ? owner.seasonPassUntil : null
  const source: PlanInfo['source'] = t.plan === 'PRO' ? 'TOURNAMENT' : owner?.fullAccess ? 'PLAN_CODE' : pass ? 'SEASON_PASS' : 'FREE'
  const full = source !== 'FREE'
  const extraTeams = t.extraTeams ?? 0
  const sequence = t.sequence ?? 0
  return {
    plan: full ? 'PRO' : 'FREE',
    source,
    seasonPassUntil: owner?.seasonPassUntil ?? null,
    limits: {
      maxTeams: full ? s.proMaxTeams : Math.min(s.proMaxTeams, s.freeMaxTeams + extraTeams),
      includedTeams: s.freeMaxTeams,
      teamCap: s.proMaxTeams,
      maxPlayers: s.proMaxPlayers,
      remoteBidding: true,
      hideBranding: true,
      customTheme: full || !!t.themeUnlocked,
      auctionFeeDue: !full && sequence > PRICING.freeAuctions && !t.auctionFeePaid,
      randomAuction: full || !!t.randomUnlocked,
    },
    purchases: { extraTeams, themeUnlocked: !!t.themeUnlocked, auctionFeePaid: !!t.auctionFeePaid, randomUnlocked: !!t.randomUnlocked },
    sequence,
    pricing: PRICING,
    billingMode: billingMode(),
  }
}

/** Why a team count isn't allowed, phrased as what to buy. */
export function teamLimitMessage(limits: PlanLimits, wanted: number) {
  if (wanted > limits.teamCap) return `An auction can have at most ${limits.teamCap} teams`
  const extra = wanted - limits.includedTeams
  return `${limits.includedTeams} teams are free. ${extra} more team${extra === 1 ? '' : 's'} cost ₹${extra * PRICING.perExtraTeam} (₹${PRICING.perExtraTeam} each)`
}

/** Thrown when a Free tournament hits a Pro-only limit. `code` lets the UI show an upgrade prompt. */
export function planLimit(message: string): never {
  throw new ForbiddenException({ statusCode: 403, code: 'PLAN_LIMIT', message })
}

// ───────────── Themes ─────────────

export const THEME_PRESETS = ['floodlight', 'royal', 'crimson', 'emerald', 'saffron', 'violet', 'ocean'] as const

/** Backdrop behind the public screens. `image` uses `backgroundImage`. */
export const THEME_BACKGROUNDS = ['glow', 'stadium', 'pitch', 'stars', 'grid', 'solid', 'image'] as const

export interface Theme {
  preset: (typeof THEME_PRESETS)[number]
  accent?: string
  hideBranding?: boolean
  background?: (typeof THEME_BACKGROUNDS)[number]
  backgroundImage?: string
}

const THEME_LOCKED = `Theme customisation is a ₹${PRICING.themeUnlock} add-on for this auction`

export function sanitizeTheme(input: unknown, limits: PlanLimits): Theme {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const preset = THEME_PRESETS.includes(raw.preset as any) ? (raw.preset as Theme['preset']) : 'floodlight'
  if (preset !== 'floodlight' && !limits.customTheme) planLimit(THEME_LOCKED)
  const theme: Theme = { preset }
  if (raw.accent !== undefined && raw.accent !== null && raw.accent !== '') {
    if (typeof raw.accent !== 'string' || !/^#[0-9a-f]{6}$/i.test(raw.accent)) throw new BadRequestException('Accent must be a hex colour like #22c55e')
    if (!limits.customTheme) planLimit(THEME_LOCKED)
    theme.accent = raw.accent.toLowerCase()
  }
  if (raw.hideBranding) {
    if (!limits.hideBranding) planLimit('Removing BidWicket branding is a Pro feature')
    theme.hideBranding = true
  }
  if (THEME_BACKGROUNDS.includes(raw.background as any) && raw.background !== 'glow') {
    if (!limits.customTheme) planLimit(THEME_LOCKED)
    theme.background = raw.background as Theme['background']
    if (theme.background === 'image') {
      const url = typeof raw.backgroundImage === 'string' ? raw.backgroundImage.trim() : ''
      if (!/^(https?:\/\/|\/)/.test(url) || url.length > 1000) throw new BadRequestException('Upload a background image first')
      theme.backgroundImage = url
    }
  }
  return theme
}

/** What public screens get: theme minus anything the current plan doesn't allow. */
export function publicTheme(theme: unknown, limits: PlanLimits): Theme {
  try {
    return sanitizeTheme(theme, limits)
  } catch {
    const raw = (theme && typeof theme === 'object' ? theme : {}) as Record<string, unknown>
    // Anything not paid for falls back to the default look.
    return { preset: 'floodlight', hideBranding: raw.hideBranding ? true : undefined }
  }
}
