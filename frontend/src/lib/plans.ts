import { ordinal } from './format'

/**
 * Pricing copy for pay-per-use. Amounts are enforced by the API (backend/src/common/plans.ts → PRICING)
 * and the live numbers also arrive on every tournament as `planInfo.pricing` — keep these in sync.
 */
export const PRICING = {
  includedTeams: 6,
  perExtraTeam: 100,
  themeUnlock: 200,
  auctionFee: 500,
  randomAuction: 300,
  pro: 800,
  freeAuctions: 2,
  maxTeams: 16,
  maxPlayers: 500,
} as const

export interface AddOn {
  id: 'teams' | 'theme' | 'auction' | 'random'
  name: string
  price: string
  unit: string
  text: string
}

export const FREE_FEATURES = [
  `Up to ${PRICING.includedTeams} teams`,
  `Up to ${PRICING.maxPlayers} players`,
  'Excel import & registration form',
  'Live big-screen link with sounds & effects',
  'Team owners bid from their phones',
  'Remove “Powered by BidWicket”',
  'Excel & PDF results',
]

/** Pro on one auction: every add-on at once. */
export const PRO_FEATURES = [
  `Up to ${PRICING.maxTeams} teams (no per-team charge)`,
  'Custom theme, brand colour & backgrounds',
  'One-click random auction',
  'Auction fee included',
]

export const ADD_ONS: AddOn[] = [
  { id: 'teams', name: 'Extra teams', price: `₹${PRICING.perExtraTeam}`, unit: 'per team', text: `Every team above ${PRICING.includedTeams}, up to ${PRICING.maxTeams}.` },
  { id: 'theme', name: 'Theme customisation', price: `₹${PRICING.themeUnlock}`, unit: 'per auction', text: 'All 7 colour themes, your brand colour and stadium, pitch, night-sky or your own image backgrounds.' },
  { id: 'random', name: 'Random auction', price: `₹${PRICING.randomAuction}`, unit: 'per auction', text: 'No bidding night needed: one click shares every player out evenly at base price — grade by grade (A → B → C) if you use categories, fully random if you don’t.' },
  { id: 'auction', name: 'Auction fee', price: `₹${PRICING.auctionFee}`, unit: 'per auction', text: `Your first ${PRICING.freeAuctions} auctions are free. From your ${ordinal(PRICING.freeAuctions + 1)} auction on, each one is ₹${PRICING.auctionFee}.` },
]

export const PRICING_FAQ: { q: string; a: string }[] = [
  { q: 'Do I pay anything to try it?', a: `No. Your first ${PRICING.freeAuctions} auctions with up to ${PRICING.includedTeams} teams cost nothing — players, registration form, live screen, phone bidding and results included.` },
  { q: 'When do I pay?', a: `Only when you add something: more than ${PRICING.includedTeams} teams, a custom theme, a random auction, or an auction after your ${ordinal(PRICING.freeAuctions)}. You see the total before you confirm.` },
  { q: 'Add-ons or Pro?', a: `Pro (₹${PRICING.pro}) unlocks every add-on for one auction. It’s the better deal once your add-ons would cost more than ₹${PRICING.pro} — for example a 12-team auction with a custom theme.` },
  { q: 'What are reward points?', a: 'Send a suggestion or report a bug (Settings → Feedback & rewards) and earn 5 points each. Every 100 points takes 10% off a purchase (up to 50%).' },
  { q: 'I got a plan code', a: 'Enter it under Settings → Plan activation. It unlocks everything on your account until the BidWicket team turns it off.' },
]
