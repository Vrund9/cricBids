/**
 * Pure auction maths, shared by the engine, the snapshot builder and the setup wizard.
 * Keeping it pure makes the rules easy to reason about and to unit test.
 */

export interface IncrementTier {
  from: number
  step: number
}

export interface RuleSettings {
  basePrice: number
  bidIncrements: unknown
  categoryBasePrices: unknown
  minSquad: number
  maxSquad: number
}

export function parseIncrements(raw: unknown): IncrementTier[] {
  const tiers = Array.isArray(raw) ? raw : []
  const valid = tiers
    .map((t: any) => ({ from: Number(t?.from) || 0, step: Number(t?.step) || 0 }))
    .filter((t) => t.step > 0 && t.from >= 0)
    .sort((a, b) => a.from - b.from)
  return valid.length ? valid : [{ from: 0, step: 500 }]
}

export function stepFor(amount: number, tiers: IncrementTier[]) {
  let step = tiers[0].step
  for (const t of tiers) if (amount >= t.from) step = t.step
  return step
}

export function basePriceFor(
  player: { basePrice: number | null; category: string | null },
  settings: Pick<RuleSettings, 'basePrice' | 'categoryBasePrices'>,
) {
  if (player.basePrice && player.basePrice > 0) return player.basePrice
  const cats = (settings.categoryBasePrices || {}) as Record<string, number>
  if (player.category && cats[player.category] > 0) return Number(cats[player.category])
  return settings.basePrice
}

/** Amount the next bid must be: base price when nobody has bid, else current + tier step. */
export function nextBidAmount(currentBid: number | null, base: number, tiers: IncrementTier[]) {
  if (currentBid === null || currentBid === undefined) return base
  return currentBid + stepFor(currentBid, tiers)
}

/**
 * Highest bid a team may place while still being able to fill its minimum squad
 * at base price. This stops a team from blowing its purse on one player.
 */
export function maxBidFor(purse: number, squadSize: number, settings: Pick<RuleSettings, 'basePrice' | 'minSquad'>) {
  const slotsToReserve = Math.max(0, settings.minSquad - squadSize - 1)
  return Math.max(0, purse - slotsToReserve * settings.basePrice)
}

export const DEFAULT_INCREMENTS: IncrementTier[] = [
  { from: 0, step: 500 },
  { from: 10000, step: 1000 },
  { from: 50000, step: 2500 },
]
