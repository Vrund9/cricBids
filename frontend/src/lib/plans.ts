/**
 * Pricing copy. Limits are enforced by the API (backend/src/common/plans.ts) —
 * keep the numbers here in sync when you change them there.
 */
export interface PricingPlan {
  id: 'free' | 'pro' | 'season' | 'enterprise'
  name: string
  price: string
  priceNote: string
  tagline: string
  cta: string
  highlight?: boolean
  features: string[]
}

export const PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    priceNote: 'forever',
    tagline: 'Gully & society leagues trying it out',
    cta: 'Start free',
    features: ['Up to 6 teams', 'Up to 60 players', 'Excel import & registration form', 'Live big-screen link', 'All 7 screen themes', 'Sounds & role effects', 'Excel results export'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹1,499',
    priceNote: 'per tournament',
    tagline: 'One serious auction, fully loaded',
    cta: 'Go Pro',
    highlight: true,
    features: ['Everything in Free', 'Up to 16 teams & 500 players', 'Team owners bid from their phones', 'Your brand colour on every screen', 'Remove BidWicket branding', 'Priority WhatsApp support'],
  },
  {
    id: 'season',
    name: 'Season Pass',
    price: '₹4,999',
    priceNote: 'per year',
    tagline: 'Organisers running several events',
    cta: 'Get Season Pass',
    features: ['Pro on every tournament you create', 'Unlimited tournaments for 12 months', 'Ideal for academies & corporate HR', 'Early access to new features'],
  },
  {
    id: 'enterprise',
    name: 'League',
    price: 'Custom',
    priceNote: 'talk to us',
    tagline: 'Franchise-style leagues & broadcasters',
    cta: 'Contact sales',
    features: ['Custom domain & white-label', 'Broadcast overlay for live streams', 'On-site auction support', 'Invoices with GST'],
  },
]

export const COMPARISON: { feature: string; free: string | boolean; pro: string | boolean }[] = [
  { feature: 'Teams per tournament', free: '6', pro: '16' },
  { feature: 'Players per tournament', free: '60', pro: '500' },
  { feature: 'Registration form with photo & custom questions', free: true, pro: true },
  { feature: 'Excel import with auto column detection', free: true, pro: true },
  { feature: 'Realtime live link + WhatsApp preview', free: true, pro: true },
  { feature: 'Screen themes, sounds & role effects', free: true, pro: true },
  { feature: 'Remote bidding paddles for team owners', free: false, pro: true },
  { feature: 'Custom brand colour', free: false, pro: true },
  { feature: 'Remove “Powered by BidWicket”', free: false, pro: true },
]
