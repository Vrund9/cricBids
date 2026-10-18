// Bulk demo data for an existing account: `npm run seed:bulk -- you@example.com`
//
// Adds ten Pro tournaments (100–500 players each) to that user, in every auction state:
//   COMPLETED ×3 · LIVE ×3 · PAUSED ×1 · READY ×2 · DRAFT ×1
// Re-running replaces only tournaments with these exact names; the user's other data is untouched.
import 'dotenv/config'
import { randomBytes } from 'crypto'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { DEFAULT_REG_FIELDS } from '../src/common/registration'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
const token = () => randomBytes(18).toString('base64url')

let seed = 20261017
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]
const between = (lo: number, hi: number, step: number) => lo + Math.floor(rand() * ((hi - lo) / step + 1)) * step
const shuffle = <T,>(arr: T[]) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const MEN = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Kabir', 'Rudra', 'Dhruv', 'Ayaan', 'Rohan', 'Kunal', 'Yash', 'Harsh', 'Manav', 'Parth', 'Nikhil', 'Pranav', 'Siddharth', 'Tanmay', 'Varun', 'Jay', 'Neel', 'Om', 'Dev']
const WOMEN = ['Ananya', 'Diya', 'Aadhya', 'Saanvi', 'Myra', 'Kiara', 'Ira', 'Riya', 'Meera', 'Tara', 'Avni', 'Navya', 'Pari', 'Sara', 'Ishita', 'Kavya', 'Nisha', 'Pooja', 'Sneha', 'Shreya']
const SURNAMES = ['Shah', 'Patel', 'Rao', 'Mehta', 'Nair', 'Kumar', 'Gupta', 'Iyer', 'Joshi', 'Singh', 'Desai', 'Khan', 'Pillai', 'Verma', 'Reddy', 'Chauhan', 'Bhatt', 'Kulkarni', 'Menon', 'Sheikh']
const ROLES = ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper']
const BOWL = ['Right-arm fast', 'Right-arm medium', 'Right-arm off-spin', 'Right-arm leg-spin', 'Left-arm medium', 'Left-arm orthodox']
const CITIES = ['Ahmedabad', 'Surat', 'Vadodara', 'Gandhinagar', 'Rajkot', 'Anand', 'Bhavnagar', 'Jamnagar']
const TEAM_WORDS = ['Strikers', 'Kings', 'Titans', 'Warriors', 'Lions', 'Mavericks', 'Vipers', 'Panthers', 'Chargers', 'Blasters', 'Royals', 'Gladiators', 'Hawks', 'Rangers', 'Sultans', 'Knights']
const TEAM_PREFIX = ['Royal', 'Desert', 'Coastal', 'Hill', 'Thunder', 'Lake City', 'Metro', 'Village', 'Diamond', 'Textile', 'Riverside', 'Sunrise', 'Golden', 'Iron', 'Silver', 'Night']
const COLORS = ['#3B82F6', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#22C55E', '#E11D48', '#A855F7', '#0EA5E9', '#EAB308', '#14B8A6', '#6366F1']

const BASE = 2000
const CATEGORY_BASE = { A: 10000, B: 5000 } as const
const INCREMENTS = [{ from: 0, step: 500 }, { from: 10000, step: 1000 }, { from: 25000, step: 2500 }]
const PURSE = 250000
const MIN_SQUAD = 11

type Status = 'DRAFT' | 'READY' | 'LIVE' | 'PAUSED' | 'COMPLETED'
interface Plan {
  name: string
  players: number
  status: Status
  /** LIVE/PAUSED: share of the pool already auctioned */
  progress?: number
  venue: string
  preset: string
  women?: boolean
}

const PLANS: Plan[] = [
  { name: 'Navratri Premier League', players: 100, status: 'COMPLETED', venue: 'Ahmedabad', preset: 'saffron' },
  { name: 'Surat Super Cup', players: 200, status: 'LIVE', progress: 0.45, venue: 'Surat', preset: 'ocean' },
  { name: 'Gujarat Corporate T20', players: 300, status: 'COMPLETED', venue: 'GIFT City, Gandhinagar', preset: 'royal' },
  { name: 'Ahmedabad Box Cricket League', players: 400, status: 'READY', venue: 'Ahmedabad', preset: 'floodlight' },
  { name: 'Saurashtra Mega Auction', players: 500, status: 'LIVE', progress: 0.6, venue: 'Rajkot', preset: 'crimson' },
  { name: 'Rajkot Night Cricket', players: 100, status: 'DRAFT', venue: 'Rajkot', preset: 'violet' },
  { name: 'Vadodara Champions Trophy', players: 200, status: 'PAUSED', progress: 0.3, venue: 'Vadodara', preset: 'emerald' },
  { name: "Anand Women's League", players: 300, status: 'READY', venue: 'Anand', preset: 'violet', women: true },
  { name: 'Gandhinagar Masters', players: 400, status: 'COMPLETED', venue: 'Gandhinagar', preset: 'emerald' },
  { name: 'Diamond City Premier League', players: 500, status: 'LIVE', progress: 0.2, venue: 'Surat', preset: 'royal' },
]

function stepFor(amount: number) {
  let step = INCREMENTS[0].step
  for (const t of INCREMENTS) if (amount >= t.from) step = t.step
  return step
}

function categoryFor(i: number, n: number) {
  return i < n * 0.08 ? 'A' : i < n * 0.33 ? 'B' : 'C'
}

function baseFor(category: string) {
  return category === 'A' ? CATEGORY_BASE.A : category === 'B' ? CATEGORY_BASE.B : BASE
}

function priceFor(category: string) {
  return category === 'A' ? between(10000, 40000, 1000) : category === 'B' ? between(5000, 15000, 500) : between(2000, 6000, 500)
}

/** A believable bid war ending at `price`, oldest bid first. */
function bidTrail(price: number, base: number, winner: string, teamIds: string[]) {
  const rivals = teamIds.filter((t) => t !== winner)
  const steps: { teamId: string; amount: number }[] = []
  let amount = price
  let bidder = winner
  while (amount >= base && steps.length < 8) {
    steps.unshift({ teamId: bidder, amount })
    amount -= stepFor(amount - 1) * (1 + Math.floor(rand() * 2))
    bidder = bidder === winner ? pick(rivals) : winner
  }
  return steps
}

function makePlayers(n: number, women: boolean) {
  const first = women ? WOMEN : MEN
  const used = new Set<string>()
  return Array.from({ length: n }, (_, i) => {
    let name = `${first[i % first.length]} ${SURNAMES[(i * 7 + Math.floor(i / first.length)) % SURNAMES.length]}`
    while (used.has(name)) name = `${pick(first)} ${pick(SURNAMES)}`
    used.add(name)
    const r = (i * 37) % 20
    const role = r < 7 ? ROLES[0] : r < 13 ? ROLES[1] : r < 18 ? ROLES[2] : ROLES[3]
    const photo = i % 10 === 9 ? null : `https://randomuser.me/api/portraits/${women ? 'women' : 'men'}/${(i * 7) % 100}.jpg`
    return {
      serial: i + 1,
      name,
      role,
      category: categoryFor(i, n),
      photoUrl: photo,
      source: (i % 3 === 0 ? 'FORM' : 'EXCEL') as 'FORM' | 'EXCEL',
      battingStyle: i % 4 === 1 ? 'Left-hand bat' : 'Right-hand bat',
      bowlingStyle: role === 'Batsman' || role === 'Wicket-keeper' ? 'Does not bowl' : BOWL[i % BOWL.length],
      age: 17 + ((i * 13) % 22),
      city: CITIES[i % CITIES.length],
      phone: `9${String(800000000 + i * 7919).slice(-9)}`,
      email: i % 4 === 0 ? `${name.toLowerCase().replace(/\s+/g, '.')}${i}@example.com` : null,
    }
  })
}

async function build(ownerId: string, plan: Plan, index: number) {
  const n = plan.players
  const teamCount = Math.min(16, Math.max(6, Math.round(n / 25)))
  const maxSquad = Math.min(25, Math.ceil((n * 0.85) / teamCount))
  const started = plan.status === 'LIVE' || plan.status === 'PAUSED' || plan.status === 'COMPLETED'
  const auctionDate =
    plan.status === 'COMPLETED' ? new Date(Date.now() - (5 + index * 3) * 86400000)
    : started ? new Date(Date.now() - 50 * 60000)
    : new Date(Date.now() + (4 + index * 2) * 86400000)

  const t = await prisma.tournament.create({
    data: {
      ownerId,
      name: plan.name,
      slug: `${plan.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${randomBytes(3).toString('hex')}`,
      description: `${n}-player auction · ${teamCount} teams`,
      venue: plan.venue,
      auctionDate,
      status: plan.status,
      plan: 'PRO',
      planActivatedAt: new Date(),
      theme: { preset: plan.preset },
      teamPurse: PURSE,
      basePrice: BASE,
      bidIncrements: INCREMENTS,
      categoryBasePrices: CATEGORY_BASE,
      minSquad: MIN_SQUAD,
      maxSquad,
      playerOrder: 'CATEGORY_RANDOM',
      bidTimerSec: 30,
      setupComplete: plan.status !== 'DRAFT',
      registrationOpen: plan.status === 'DRAFT' || plan.status === 'READY',
      registrationFields: DEFAULT_REG_FIELDS as any,
      registrationToken: token(),
      liveToken: token(),
      remoteBidding: true,
    },
  })

  const teams = await prisma.team.createManyAndReturn({
    data: Array.from({ length: teamCount }, (_, i) => ({
      tournamentId: t.id,
      name: `${TEAM_PREFIX[(i + index) % TEAM_PREFIX.length]} ${TEAM_WORDS[(i * 3 + index) % TEAM_WORDS.length]}`,
      shortName: `${TEAM_PREFIX[(i + index) % TEAM_PREFIX.length][0]}${TEAM_WORDS[(i * 3 + index) % TEAM_WORDS.length][0]}${i + 1}`,
      color: COLORS[i % COLORS.length],
      ownerName: `${pick(MEN)} ${pick(SURNAMES)}`,
      logoUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(plan.name + i)}&backgroundType=gradientLinear`,
      purse: PURSE,
      bidToken: token(),
      sortOrder: i + 1,
    })),
  })
  const teamIds = teams.map((x) => x.id)

  const pool = makePlayers(n, !!plan.women)
  // DRAFT: last 12% registered through the form and still awaiting approval.
  const approved = (i: number) => plan.status !== 'DRAFT' || i < n * 0.88
  const players = await prisma.player.createManyAndReturn({
    data: pool.map((p, i) => ({ ...p, tournamentId: t.id, approved: approved(i) })),
    select: { id: true, serial: true, category: true },
  })

  if (!started) return { t, teamCount, sold: 0, unsold: 0 }

  // Auction order: categories A → B → C, shuffled within each (CATEGORY_RANDOM).
  const order = ['A', 'B', 'C'].flatMap((c) => shuffle(players.filter((p) => p.category === c)))
  const doneCount = plan.status === 'COMPLETED' ? order.length : Math.floor(order.length * (plan.progress ?? 0.5))

  const purse = new Map(teamIds.map((id) => [id, PURSE]))
  const squad = new Map(teamIds.map((id) => [id, 0]))
  const sales = new Map<string, { teamId: string; price: number; at: Date; round: number }>()
  const bids: { tournamentId: string; playerId: string; teamId: string; amount: number; round: number; createdAt: Date }[] = []
  const unsold = new Set<string>()
  const start = auctionDate.getTime()
  let clock = 0

  const canAfford = (teamId: string, price: number) => {
    const left = purse.get(teamId)! - price
    const stillNeeded = Math.max(0, MIN_SQUAD - squad.get(teamId)! - 1)
    return squad.get(teamId)! < maxSquad && left >= stillNeeded * BASE
  }
  const auction = (p: { id: string; category: string | null }, round: number) => {
    const base = baseFor(p.category ?? 'C')
    const at = new Date(start + clock++ * 40000)
    // ~12% go unsold in round one; round two sells about half of them at base.
    if (round === 1 && rand() < 0.12) return unsold.add(p.id)
    if (round === 2 && rand() < 0.5) return
    const price = round === 2 ? base : priceFor(p.category ?? 'C')
    const buyers = shuffle(teamIds).filter((id) => canAfford(id, price))
    if (!buyers.length) return unsold.add(p.id)
    const winner = buyers[0]
    purse.set(winner, purse.get(winner)! - price)
    squad.set(winner, squad.get(winner)! + 1)
    unsold.delete(p.id)
    sales.set(p.id, { teamId: winner, price, at, round })
    bidTrail(price, base, winner, teamIds).forEach((b, i, all) =>
      bids.push({ tournamentId: t.id, playerId: p.id, ...b, round, createdAt: new Date(at.getTime() - (all.length - i) * 4000) }),
    )
  }

  for (const p of order.slice(0, doneCount)) auction(p, 1)
  if (plan.status === 'COMPLETED') for (const p of order.filter((p) => unsold.has(p.id))) auction(p, 2)

  // Group sale writes per team so 500-player tournaments stay quick.
  const byPrice = new Map<string, string[]>()
  for (const [playerId, s] of sales) {
    const key = `${s.teamId}|${s.price}|${s.at.getTime()}`
    byPrice.set(key, [...(byPrice.get(key) ?? []), playerId])
  }
  await prisma.$transaction([
    ...[...byPrice].map(([key, ids]) => {
      const [teamId, price, at] = key.split('|')
      return prisma.player.updateMany({ where: { id: { in: ids } }, data: { status: 'SOLD', soldTeamId: teamId, soldPrice: Number(price), soldAt: new Date(Number(at)) } })
    }),
    prisma.player.updateMany({ where: { id: { in: [...unsold] } }, data: { status: 'UNSOLD' } }),
    ...teamIds.map((id) => prisma.team.update({ where: { id }, data: { purse: purse.get(id)! } })),
  ])
  for (let i = 0; i < bids.length; i += 1000) await prisma.bid.createMany({ data: bids.slice(i, i + 1000) })

  if (plan.status === 'COMPLETED') {
    await prisma.auctionState.create({
      data: { tournamentId: t.id, round: 2, queue: [], version: bids.length, startedAt: auctionDate, lastEvent: { type: 'COMPLETED', at: start + clock * 40000 } },
    })
  } else {
    // LIVE / PAUSED: next player on stage with a bid war in progress.
    const current = order[doneCount]
    const base = baseFor(current.category ?? 'C')
    const able = shuffle(teamIds.filter((id) => canAfford(id, base * 2)))
    const [a, b] = able.length >= 2 ? able : shuffle(teamIds)
    const live = [a, b, a, b].map((teamId, i) => ({ teamId, amount: base + i * stepFor(base) }))
    const now = Date.now()
    await prisma.player.update({ where: { id: current.id }, data: { status: 'LIVE' } })
    await prisma.bid.createMany({
      data: live.map((x, i) => ({ ...x, tournamentId: t.id, playerId: current.id, round: 1, source: i === 3 ? 'REMOTE' : 'AUCTIONEER', createdAt: new Date(now - (live.length - i) * 5000) })),
    })
    const last = live[live.length - 1]
    await prisma.auctionState.create({
      data: {
        tournamentId: t.id,
        currentPlayerId: current.id,
        currentBid: last.amount,
        leadingTeamId: last.teamId,
        round: 1,
        queue: order.slice(doneCount + 1).map((p) => p.id),
        timerEndsAt: null,
        version: bids.length + live.length,
        startedAt: auctionDate,
        lastEvent: plan.status === 'PAUSED' ? { type: 'PAUSED' } : { type: 'BID', playerId: current.id, teamId: last.teamId, amount: last.amount, source: 'REMOTE', at: now },
      },
    })
  }
  return { t, teamCount, sold: sales.size, unsold: unsold.size }
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase()
  if (!email) throw new Error('Usage: npm run seed:bulk -- <email of an existing account>')
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new Error(`No account with email ${email} — sign up first, then re-run.`)

  const removed = await prisma.tournament.deleteMany({ where: { ownerId: user.id, name: { in: PLANS.map((p) => p.name) } } })
  if (removed.count) console.log(`Replaced ${removed.count} previously seeded tournament(s).`)

  for (const [i, plan] of PLANS.entries()) {
    const { t, teamCount, sold, unsold } = await build(user.id, plan, i)
    console.log(`${String(i + 1).padStart(2)}. ${plan.name.padEnd(30)} ${plan.status.padEnd(9)} ${String(plan.players).padStart(3)} players · ${String(teamCount).padStart(2)} teams · ${sold} sold · ${unsold} unsold  → /live/${t.liveToken}`)
  }
  console.log(`\nAdded to ${user.name} <${email}>`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
