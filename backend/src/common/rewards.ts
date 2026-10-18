/**
 * Reward points: organisers earn points for every suggestion or bug report and spend them
 * as a percentage discount on a plan purchase.
 */
export const REWARDS = {
  /** Points for each suggestion or bug report */
  pointsPerEntry: 5,
  /** Only this many entries a day earn points, so the form can't be farmed */
  rewardedPerDay: 5,
  /** Every block of this many points is worth `pctPerBlock` percent off */
  pointsPerBlock: 100,
  pctPerBlock: 10,
  /** The discount never goes above this */
  maxPct: 50,
} as const

/** How much of a balance can be spent on one purchase: whole blocks only, capped at `maxPct`. */
export function rewardDiscount(points: number) {
  const blocks = Math.min(Math.floor(Math.max(0, points) / REWARDS.pointsPerBlock), REWARDS.maxPct / REWARDS.pctPerBlock)
  return { pct: blocks * REWARDS.pctPerBlock, pointsUsed: blocks * REWARDS.pointsPerBlock }
}

export function discounted(price: number, pct: number) {
  return Math.round((price * (100 - pct)) / 100)
}
