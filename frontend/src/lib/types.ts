export type TournamentStatus = 'DRAFT' | 'READY' | 'LIVE' | 'PAUSED' | 'COMPLETED'
export type PlayerStatus = 'AVAILABLE' | 'LIVE' | 'SOLD' | 'UNSOLD'
export type PlayerOrder = 'RANDOM' | 'CATEGORY_RANDOM' | 'SEQUENTIAL'
export type PlanName = 'FREE' | 'PRO'
import type { ThemeConfig } from './themes'

export interface Pricing {
  perExtraTeam: number
  themeUnlock: number
  auctionFee: number
  randomAuction: number
  pro: number
  freeAuctions: number
}

/** Pay-per-use: `plan` is PRO only with full access (legacy Pro, admin grant or plan code). */
export interface PlanInfo {
  plan: PlanName
  source: 'FREE' | 'TOURNAMENT' | 'SEASON_PASS' | 'PLAN_CODE'
  seasonPassUntil: string | null
  limits: {
    maxTeams: number
    includedTeams: number
    teamCap: number
    maxPlayers: number
    remoteBidding: boolean
    customTheme: boolean
    hideBranding: boolean
    auctionFeeDue: boolean
    randomAuction: boolean
  }
  purchases: { extraTeams: number; themeUnlocked: boolean; auctionFeePaid: boolean; randomUnlocked: boolean }
  sequence: number
  pricing: Pricing
  billingMode: 'demo' | 'disabled'
}

export interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
  createdAt: string
  seasonPassUntil?: string | null
  /** False for Google-only accounts that haven't set a password yet. */
  hasPassword?: boolean
  /** Platform admin — can open /admin. */
  isAdmin?: boolean
  /** Earned from feedback, spent as a discount */
  rewardPoints?: number
  /** Everything unlocked via a plan code */
  fullAccess?: boolean
}

export interface IncrementTier {
  from: number
  step: number
}

export type FieldType = 'text' | 'textarea' | 'number' | 'tel' | 'email' | 'select' | 'photo'

export interface RegField {
  key: string
  label: string
  type: FieldType
  required: boolean
  enabled: boolean
  options?: string[]
  builtin?: boolean
  locked?: boolean
}

export interface Team {
  id: string
  tournamentId: string
  name: string
  shortName: string
  color: string
  logoUrl?: string | null
  ownerName?: string | null
  purse: number
  bidToken: string
  sortOrder: number
  squadSize?: number
  maxBid?: number
}

export interface Player {
  id: string
  tournamentId: string
  serial: number
  name: string
  role: string
  category?: string | null
  battingStyle?: string | null
  bowlingStyle?: string | null
  phone?: string | null
  email?: string | null
  city?: string | null
  age?: number | null
  photoUrl?: string | null
  basePrice?: number | null
  extra?: Record<string, string> | null
  approved: boolean
  source: 'EXCEL' | 'FORM' | 'MANUAL'
  status: PlayerStatus
  soldTeamId?: string | null
  soldPrice?: number | null
  soldAt?: string | null
  /** Kept by a team before the auction */
  retained?: boolean
  createdAt: string
}

export interface TournamentSummary {
  id: string
  name: string
  slug: string
  logoUrl?: string | null
  venue?: string | null
  auctionDate?: string | null
  currency: string
  status: TournamentStatus
  plan: PlanName
  setupComplete: boolean
  registrationOpen: boolean
  liveToken: string
  updatedAt: string
  teams: number
  players: number
  sold: number
  totalSpent: number
}

export interface Tournament {
  id: string
  name: string
  slug: string
  logoUrl?: string | null
  description?: string | null
  venue?: string | null
  auctionDate?: string | null
  currency: string
  status: TournamentStatus
  teamPurse: number
  basePrice: number
  bidIncrements: IncrementTier[]
  categoryBasePrices?: Record<string, number> | null
  minSquad: number
  maxSquad: number
  playerOrder: PlayerOrder
  bidTimerSec: number
  setupComplete: boolean
  registrationOpen: boolean
  registrationToken: string
  registrationFields: RegField[]
  requireApproval: boolean
  liveToken: string
  remoteBidding: boolean
  plan: PlanName
  theme?: ThemeConfig | null
  planInfo: PlanInfo
  teams: Team[]
  stats: {
    players: number
    approved: number
    pendingApproval: number
    fromForm: number
    fromExcel: number
    sold: number
    unsold: number
    available: number
  }
  categories: { name: string; count: number }[]
}

export interface PublicPlayer {
  id: string
  serial: number
  name: string
  role: string
  category?: string | null
  battingStyle?: string | null
  bowlingStyle?: string | null
  city?: string | null
  age?: number | null
  photoUrl?: string | null
  basePrice?: number | null
  status: PlayerStatus
  soldTeamId?: string | null
  soldPrice?: number | null
  soldAt?: string | null
  /** Kept by a team before the auction */
  retained?: boolean
}

export interface SnapshotTeam {
  id: string
  name: string
  shortName: string
  color: string
  logoUrl?: string | null
  ownerName?: string | null
  purse: number
  spent: number
  squadSize: number
  maxBid: number
  canBid: boolean
}

export interface BidEntry {
  id: string
  teamId: string
  amount: number
  source: 'AUCTIONEER' | 'REMOTE'
  createdAt: string
}

export interface AuctionEvent {
  type: 'STARTED' | 'NEXT' | 'BID' | 'SOLD' | 'UNSOLD' | 'UNDO' | 'REOPEN' | 'ROUND_END' | 'PAUSED' | 'RESUMED' | 'REAUCTION' | 'COMPLETED'
  at: number
  playerId?: string
  teamId?: string
  teamName?: string
  name?: string
  amount?: number
  unsold?: number
  count?: number
  source?: string
}

export interface Snapshot {
  serverTime: number
  version: number
  tournament: {
    id: string
    name: string
    logoUrl?: string | null
    venue?: string | null
    auctionDate?: string | null
    currency: string
    status: TournamentStatus
    teamPurse: number
    basePrice: number
    minSquad: number
    maxSquad: number
    bidTimerSec: number
    remoteBidding: boolean
    playerOrder: PlayerOrder
    liveToken: string
    plan: PlanName
    theme: ThemeConfig
  }
  round: number
  current: null | {
    player: PublicPlayer
    basePrice: number
    currentBid: number | null
    leadingTeamId: string | null
    nextBid: number | null
    timerEndsAt: string | null
    bids: BidEntry[]
  }
  teams: SnapshotTeam[]
  counts: { total: number; available: number; sold: number; unsold: number; live: number; queue: number; bids: number }
  totalSpent: number
  sold: PublicPlayer[]
  topBuys: PublicPlayer[]
  lastEvent: AuctionEvent | null
}
