const SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', GBP: '£', AUD: 'A$', AED: 'AED ', PKR: 'Rs ', LKR: 'Rs ', BDT: '৳', NPR: 'Rs ', ZAR: 'R ', NZD: 'NZ$', CAD: 'C$', EUR: '€', PTS: '',
}

export const CURRENCIES = Object.keys(SYMBOLS)

export function money(value: number | null | undefined, currency = 'INR') {
  if (value === null || value === undefined) return '—'
  const sym = SYMBOLS[currency] ?? ''
  const locale = currency === 'INR' ? 'en-IN' : 'en-US'
  const n = Math.round(value).toLocaleString(locale)
  return currency === 'PTS' ? `${n} pts` : `${sym}${n}`
}

/** Compact money for big screens: ₹1.25L, ₹2.4Cr, $1.2M */
export function moneyShort(value: number | null | undefined, currency = 'INR') {
  if (value === null || value === undefined) return '—'
  const sym = SYMBOLS[currency] ?? ''
  const suffix = currency === 'PTS' ? ' pts' : ''
  const trim = (n: number) => (Math.round(n * 100) / 100).toString()
  if (currency === 'INR') {
    if (value >= 1e7) return `${sym}${trim(value / 1e7)}Cr`
    if (value >= 1e5) return `${sym}${trim(value / 1e5)}L`
    if (value >= 1e3) return `${sym}${trim(value / 1e3)}K`
    return `${sym}${value}`
  }
  if (value >= 1e6) return `${sym}${trim(value / 1e6)}M${suffix}`
  if (value >= 1e3) return `${sym}${trim(value / 1e3)}K${suffix}`
  return `${sym}${value}${suffix}`
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function timeAgo(date: string | number) {
  const s = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 1000))
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(date).toLocaleDateString()
}

export const ROLE_META: Record<string, { short: string; color: string }> = {
  Batsman: { short: 'BAT', color: '#38bdf8' },
  Bowler: { short: 'BOWL', color: '#ff4d6d' },
  'All-rounder': { short: 'AR', color: '#c8ff2e' },
  'Wicket-keeper': { short: 'WK', color: '#ffb020' },
}

export function roleMeta(role: string) {
  return ROLE_META[role] ?? { short: role.slice(0, 4).toUpperCase(), color: '#8a94ad' }
}

/** 1 → "1st", 2 → "2nd", 3 → "3rd", 4 → "4th", 11 → "11th" */
export function ordinal(n: number) {
  const v = n % 100
  const suffix = v >= 11 && v <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
  return `${n}${suffix}`
}
