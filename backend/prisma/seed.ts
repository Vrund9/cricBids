// Demo data: `npm run db:seed`  →  log in as demo@bidwicket.app / demo12345
//
// Five tournaments, each exercising different situations:
//  1. Demo Premier League 2026  READY      Pro · 8 teams · 72 players · categories, custom base price,
//                                           photo fallbacks, long names, pending approvals with custom answers
//  2. Corporate Cricket Cup     LIVE       Pro · Royal theme · mid-auction: sold/unsold history, a full squad,
//                                           a purse-locked team, a record buy, live player with a phone bid
//  3. Society Box Cricket League COMPLETED Free · Emerald theme · re-auction round done, results to export
//  4. Women's T10 Championship  DRAFT      Free · Crimson theme · registrations open, approval queue, no rules yet
//  5. Weekend Tennis Ball Cup   DRAFT      empty — first-run empty states
//
// Photos are placeholder portraits (pravatar.cc / randomuser.me) — replace with real uploads.
import 'dotenv/config'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { DEFAULT_REG_FIELDS } from '../src/common/registration'
import { DEFAULT_INCREMENTS } from '../src/common/auction-rules'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
const token = () => randomBytes(18).toString('base64url')

// Deterministic PRNG so the demo looks the same every time you seed.
let seed = 20261010
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]
const shuffle = <T,>(arr: T[]) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Hand-picked HD portraits (adults only) + randomuser for volume.
const HD_MEN = [3, 8, 11, 12, 13, 14, 18, 33, 51, 52, 53, 54, 56, 57, 59, 60, 61, 67, 68].map((n) => `https://i.pravatar.cc/600?img=${n}`)
const HD_WOMEN = [5, 16, 23, 25, 26, 27, 31, 32, 34, 35, 36, 38, 41, 42, 43, 44, 45, 47, 48, 49].map((n) => `https://i.pravatar.cc/600?img=${n}`)
const menPhoto = (i: number) => (i < HD_MEN.length ? HD_MEN[i] : `https://randomuser.me/api/portraits/men/${(i * 7) % 100}.jpg`)
const womenPhoto = (i: number) => (i < HD_WOMEN.length ? HD_WOMEN[i] : `https://randomuser.me/api/portraits/women/${(i * 11) % 100}.jpg`)
const logo = (seedName: string) => `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seedName)}&backgroundType=gradientLinear`

const MEN = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Kabir', 'Rudra', 'Dhruv', 'Ayaan', 'Rohan', 'Kunal', 'Yash', 'Harsh', 'Manav', 'Parth', 'Nikhil', 'Pranav', 'Siddharth', 'Tanmay', 'Varun', 'Jay', 'Neel', 'Om', 'Dev']
const WOMEN = ['Ananya', 'Diya', 'Aadhya', 'Saanvi', 'Myra', 'Kiara', 'Ira', 'Riya', 'Meera', 'Tara', 'Avni', 'Navya', 'Pari', 'Sara', 'Ishita', 'Kavya', 'Nisha', 'Pooja', 'Sneha', 'Shreya']
const SURNAMES = ['Shah', 'Patel', 'Rao', 'Mehta', 'Nair', 'Kumar', 'Gupta', 'Iyer', 'Joshi', 'Singh', 'Desai', 'Khan', 'Pillai', 'Verma', 'Reddy', 'Chauhan', 'Bhatt', 'Kulkarni', 'Menon', 'Sheikh']
const ROLES = ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper'] as const
const BAT = ['Right-hand bat', 'Left-hand bat']
const BOWL = ['Right-arm fast', 'Right-arm medium', 'Right-arm off-spin', 'Right-arm leg-spin', 'Left-arm medium', 'Left-arm orthodox', 'Does not bowl']
const CITIES = ['Ahmedabad', 'Surat', 'Vadodara', 'Gandhinagar', 'Rajkot', 'Anand']

function roleFor(i: number) {
  // Realistic mix: ~35% bat, 30% bowl, 25% AR, 10% WK
  const r = (i * 37) % 20
  return r < 7 ? ROLES[0] : r < 13 ? ROLES[1] : r < 18 ? ROLES[2] : ROLES[3]
}

const FIELDS_WITH_QUESTIONS = [
  ...DEFAULT_REG_FIELDS.map((f) => (f.key === 'city' ? { ...f, enabled: true } : f)),
  { key: 'q_jersey', label: 'Jersey size', type: 'select', required: true, enabled: true, options: ['S', 'M', 'L', 'XL', 'XXL'] },
  { key: 'q_available', label: 'Available on all match days?', type: 'select', required: true, enabled: true, options: ['Yes', 'No — some days'] },
  { key: 'q_prev_team', label: 'Previous team (if any)', type: 'text', required: false, enabled: true },
]

interface PlayerSeed {
  name: string
  role: string
  category?: string | null
  photoUrl?: string | null
  basePrice?: number | null
  approved?: boolean
  source?: 'EXCEL' | 'FORM' | 'MANUAL'
  extra?: Record<string, string>
}

function makePlayers(n: number, gender: 'men' | 'women', opts: { categories?: (i: number) => string | null; noPhotoEvery?: number } = {}): PlayerSeed[] {
  const first = gender === 'men' ? MEN : WOMEN
  const used = new Set<string>()
  return Array.from({ length: n }, (_, i) => {
    let name = `${first[i % first.length]} ${SURNAMES[(i * 7 + Math.floor(i / first.length)) % SURNAMES.length]}`
    while (used.has(name)) name = `${pick(first)} ${pick(SURNAMES)}`
    used.add(name)
    const noPhoto = opts.noPhotoEvery ? i % opts.noPhotoEvery === opts.noPhotoEvery - 1 : false
    return {
      name,
      role: roleFor(i),
      category: opts.categories?.(i) ?? null,
      photoUrl: noPhoto ? null : gender === 'men' ? menPhoto(i) : womenPhoto(i),
      source: i % 3 === 0 ? 'FORM' : 'EXCEL',
    }
  })
}

async function createTournament(ownerId: string, data: Record<string, unknown>) {
  return prisma.tournament.create({
    data: {
      ownerId,
      slug: `${String(data.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${randomBytes(3).toString('hex')}`,
      bidIncrements: DEFAULT_INCREMENTS as any,
      registrationFields: DEFAULT_REG_FIELDS as any,
      registrationToken: token(),
      liveToken: token(),
      ...data,
    } as any,
  })
}

async function createTeams(tournamentId: string, purse: number, teams: { name: string; short: string; color: string; owner?: string; logo?: boolean }[]) {
  return prisma.team.createManyAndReturn({
    data: teams.map((t, i) => ({
      tournamentId,
      name: t.name,
      shortName: t.short,
      color: t.color,
      ownerName: t.owner ?? null,
      logoUrl: t.logo === false ? null : logo(t.name),
      purse,
      bidToken: token(),
      sortOrder: i + 1,
    })),
  })
}

async function createPlayers(tournamentId: string, players: PlayerSeed[]) {
  return prisma.player.createManyAndReturn({
    data: players.map((p, i) => ({
      tournamentId,
      serial: i + 1,
      name: p.name,
      role: p.role,
      category: p.category ?? null,
      photoUrl: p.photoUrl ?? null,
      basePrice: p.basePrice ?? null,
      approved: p.approved ?? true,
      source: p.source ?? 'EXCEL',
      extra: p.extra as any,
      battingStyle: BAT[i % 2 === 0 ? 0 : (i % 5 === 1 ? 1 : 0)],
      bowlingStyle: p.role === 'Batsman' || p.role === 'Wicket-keeper' ? 'Does not bowl' : BOWL[i % (BOWL.length - 1)],
      age: 17 + ((i * 13) % 22),
      city: CITIES[i % CITIES.length],
      phone: `98${String(25000000 + tournamentId.length * 1000 + i * 173).slice(-8)}`,
      email: i % 4 === 0 ? `${p.name.toLowerCase().replace(/\s+/g, '.')}@example.com` : null,
    })),
  })
}

/** Write a sale + a believable bid war that ends at `price`. */
async function sell(tournamentId: string, playerId: string, teamId: string, price: number, base: number, otherTeamIds: string[], round: number, at: Date) {
  const steps: { teamId: string; amount: number }[] = []
  let amount = price
  let bidder = teamId
  const rivals = otherTeamIds.filter((t) => t !== teamId)
  // walk backwards from the final price to the base price
  while (amount >= base && steps.length < 6) {
    steps.unshift({ teamId: bidder, amount })
    const step = amount > 10000 ? 1000 : 500
    amount -= step * (1 + Math.floor(rand() * 2))
    bidder = bidder === teamId ? pick(rivals) : teamId
  }
  await prisma.bid.createMany({
    data: steps.map((s, i) => ({ tournamentId, playerId, teamId: s.teamId, amount: s.amount, round, createdAt: new Date(at.getTime() - (steps.length - i) * 4000) })),
  })
  await prisma.player.update({ where: { id: playerId }, data: { status: 'SOLD', soldTeamId: teamId, soldPrice: price, soldAt: at } })
  await prisma.team.update({ where: { id: teamId }, data: { purse: { decrement: price } } })
}

async function main() {
  const email = 'demo@bidwicket.app'
  await prisma.user.deleteMany({ where: { email } })
  const user = await prisma.user.create({ data: { email, name: 'Demo Organiser', passwordHash: await bcrypt.hash('demo12345', 12) } })

  // ── 1. READY, Pro, rich player pool ─────────────────────────────────────
  {
    const t = await createTournament(user.id, {
      name: 'Demo Premier League 2026',
      description: 'Annual inter-society T20 league. Auction night at the clubhouse — bring your team owners!',
      venue: 'Ahmedabad',
      auctionDate: new Date(Date.now() + 3 * 86400000),
      status: 'READY',
      plan: 'PRO',
      planActivatedAt: new Date(),
      theme: { preset: 'floodlight' },
      teamPurse: 100000,
      basePrice: 2000,
      bidIncrements: [{ from: 0, step: 500 }, { from: 10000, step: 1000 }, { from: 25000, step: 2500 }],
      categoryBasePrices: { MARQUEE: 10000, A: 5000 },
      minSquad: 8,
      maxSquad: 10,
      playerOrder: 'CATEGORY_RANDOM',
      bidTimerSec: 20,
      setupComplete: true,
      registrationOpen: true,
      registrationFields: FIELDS_WITH_QUESTIONS,
      remoteBidding: true,
    })
    await createTeams(t.id, 100000, [
      { name: 'Royal Strikers', short: 'RS', color: '#3B82F6', owner: 'Mehul Shah' },
      { name: 'Desert Kings', short: 'DK', color: '#F59E0B', owner: 'Rakesh Patel' },
      { name: 'Coastal Titans', short: 'CT', color: '#EF4444', owner: 'Anil Nair' },
      { name: 'Hill Warriors', short: 'HW', color: '#10B981', owner: 'Sunil Joshi' },
      { name: 'Thunder Bolts', short: 'TB', color: '#8B5CF6', owner: 'Priya Mehta' },
      { name: 'Lake City Lions', short: 'LCL', color: '#EC4899', owner: 'Farhan Sheikh' },
      { name: 'Metro Mavericks', short: 'MM', color: '#06B6D4', logo: false }, // no logo → initials fallback
      { name: 'Village Vipers', short: 'VV', color: '#84CC16', logo: false },
    ])
    const players = makePlayers(72, 'men', { categories: (i) => (i < 6 ? 'MARQUEE' : i < 24 ? 'A' : 'B'), noPhotoEvery: 11 })
    // Edge cases
    players[2].basePrice = 15000 // own base price above the category
    players[30].name = 'Venkatanarasimha Raghavendra Subramanyam' // very long name
    players[31].photoUrl = 'https://images.example.invalid/broken.jpg' // broken image → initials
    players[32].photoUrl = 'https://drive.google.com/open?id=DEMO-NOT-A-REAL-FILE' // Drive link from a Google Form (unreachable → fallback)
    for (const i of [68, 69, 70, 71]) {
      players[i].approved = false
      players[i].source = 'FORM'
      players[i].extra = { 'Jersey size': pick(['M', 'L', 'XL']), 'Available on all match days?': i % 2 ? 'Yes' : 'No — some days', 'Previous team (if any)': i % 2 ? 'Gymkhana XI' : '' }
    }
    for (const p of players.filter((p) => p.source === 'FORM' && !p.extra)) p.extra = { 'Jersey size': pick(['S', 'M', 'L', 'XL']), 'Available on all match days?': 'Yes' }
    await createPlayers(t.id, players)
    console.log(`1. ${t.name}  → /live/${t.liveToken}  (register: /register/${t.registrationToken})`)
  }

  // ── 2. LIVE mid-auction ─────────────────────────────────────────────────
  {
    const purse = 50000
    const base = 1000
    const t = await createTournament(user.id, {
      name: 'Corporate Cricket Cup',
      description: 'Inter-department tournament. Owners bid from their phones.',
      venue: 'GIFT City, Gandhinagar',
      auctionDate: new Date(Date.now() - 45 * 60000),
      status: 'LIVE',
      plan: 'PRO',
      planActivatedAt: new Date(),
      theme: { preset: 'royal' },
      teamPurse: purse,
      basePrice: base,
      bidIncrements: [{ from: 0, step: 500 }, { from: 10000, step: 1000 }],
      minSquad: 7,
      maxSquad: 9,
      playerOrder: 'RANDOM',
      bidTimerSec: 30,
      setupComplete: true,
      remoteBidding: true,
    })
    const teams = await createTeams(t.id, purse, [
      { name: 'Tech Tigers', short: 'TT', color: '#F97316', owner: 'CTO Office' },
      { name: 'Finance Falcons', short: 'FF', color: '#22C55E', owner: 'CFO Office' },
      { name: 'Sales Strikers', short: 'SS', color: '#E11D48', owner: 'VP Sales' },
      { name: 'HR Hurricanes', short: 'HRH', color: '#A855F7', owner: 'People Team' },
      { name: 'Infra Titans', short: 'IT', color: '#0EA5E9', owner: 'Infra Team' },
      { name: 'Ops Warriors', short: 'OW', color: '#EAB308', owner: 'Operations' },
    ])
    const [tech, finance, sales, hr, infra, ops] = teams
    const ids = teams.map((x) => x.id)
    const players = await createPlayers(t.id, makePlayers(48, 'men', { noPhotoEvery: 9 }))
    const order = shuffle(players)
    const now = Date.now()
    let k = 0
    const at = () => new Date(now - (60 - k++) * 45000)
    // Tech Tigers: a full squad (9) bought cheaply → can't bid any more.
    for (let i = 0; i < 9; i++) await sell(t.id, order[i].id, tech.id, 1500 + (i % 3) * 500, base, ids, 1, at())
    // Sales Strikers: blew the purse on 3 stars (incl. the record buy) → purse-locked.
    await sell(t.id, order[9].id, sales.id, 21000, base, ids, 1, at()) // record buy
    await sell(t.id, order[10].id, sales.id, 14000, base, ids, 1, at())
    await sell(t.id, order[11].id, sales.id, 11000, base, ids, 1, at())
    // Healthy auction for everyone else
    const others = [finance, hr, infra, ops]
    for (let i = 12; i < 22; i++) await sell(t.id, order[i].id, others[i % 4].id, 2000 + Math.round(rand() * 8) * 500, base, ids, 1, at())
    // Unsold so far
    for (let i = 22; i < 26; i++) await prisma.player.update({ where: { id: order[i].id }, data: { status: 'UNSOLD' } })
    // Live player with an active bid war, last bid from a phone paddle.
    const current = order[26]
    await prisma.player.update({ where: { id: current.id }, data: { status: 'LIVE' } })
    const bids = [
      { teamId: finance.id, amount: 1000, source: 'AUCTIONEER' as const },
      { teamId: hr.id, amount: 1500, source: 'AUCTIONEER' as const },
      { teamId: finance.id, amount: 2000, source: 'AUCTIONEER' as const },
      { teamId: infra.id, amount: 2500, source: 'REMOTE' as const },
      { teamId: ops.id, amount: 3000, source: 'REMOTE' as const },
    ]
    await prisma.bid.createMany({ data: bids.map((b, i) => ({ ...b, tournamentId: t.id, playerId: current.id, round: 1, createdAt: new Date(now - (bids.length - i) * 5000) })) })
    await prisma.auctionState.create({
      data: {
        tournamentId: t.id,
        currentPlayerId: current.id,
        currentBid: 3000,
        leadingTeamId: ops.id,
        round: 1,
        queue: order.slice(27).map((p) => p.id),
        timerEndsAt: null, // countdown restarts on the next bid
        version: 60,
        startedAt: new Date(now - 45 * 60000),
        lastEvent: { type: 'BID', playerId: current.id, teamId: ops.id, amount: 3000, source: 'REMOTE', at: now },
      },
    })
    console.log(`2. ${t.name} (LIVE) → /live/${t.liveToken}`)
    const paddle = await prisma.team.findUniqueOrThrow({ where: { id: finance.id } })
    console.log(`   Finance Falcons phone paddle → /bid/${paddle.bidToken}`)
  }

  // ── 3. COMPLETED, Free, with a re-auction round ─────────────────────────
  {
    const purse = 30000
    const base = 1000
    const t = await createTournament(user.id, {
      name: 'Society Box Cricket League',
      venue: 'Shivranjani, Ahmedabad',
      auctionDate: new Date(Date.now() - 6 * 86400000),
      status: 'COMPLETED',
      theme: { preset: 'emerald' },
      teamPurse: purse,
      basePrice: base,
      minSquad: 6,
      maxSquad: 8,
      setupComplete: true,
      currency: 'INR',
    })
    const teams = await createTeams(t.id, purse, [
      { name: 'Tower A Avengers', short: 'TAA', color: '#10B981' },
      { name: 'Tower B Blasters', short: 'TBB', color: '#3B82F6' },
      { name: 'Tower C Chargers', short: 'TCC', color: '#F59E0B' },
      { name: 'Tower D Dynamos', short: 'TDD', color: '#EF4444' },
    ])
    const ids = teams.map((x) => x.id)
    const players = await createPlayers(t.id, makePlayers(32, 'men', { noPhotoEvery: 6 }))
    const now = Date.now() - 6 * 86400000
    for (let i = 0; i < 28; i++) {
      const round = i >= 24 ? 2 : 1 // last four were sold in the re-auction round
      await sell(t.id, players[i].id, ids[i % 4], round === 2 ? 1000 : 1500 + Math.round(rand() * 10) * 500, base, ids, round, new Date(now + i * 60000))
    }
    for (let i = 28; i < 32; i++) await prisma.player.update({ where: { id: players[i].id }, data: { status: 'UNSOLD' } })
    await prisma.auctionState.create({ data: { tournamentId: t.id, round: 2, queue: [], version: 90, startedAt: new Date(now), lastEvent: { type: 'COMPLETED', at: now + 40 * 60000 } } })
    console.log(`3. ${t.name} (COMPLETED) → /live/${t.liveToken}`)
  }

  // ── 4. DRAFT, registrations open, approval queue ────────────────────────
  {
    const t = await createTournament(user.id, {
      name: "Women's T10 Championship",
      description: 'Open to all women players 16+. Register with a clear photo — approved players enter the auction.',
      venue: 'Vadodara',
      auctionDate: new Date(Date.now() + 10 * 86400000),
      theme: { preset: 'crimson' },
      registrationOpen: true,
      requireApproval: true,
      registrationFields: FIELDS_WITH_QUESTIONS,
    })
    const players = makePlayers(26, 'women', { noPhotoEvery: 7 }).map((p, i) => ({
      ...p,
      source: 'FORM' as const,
      approved: i < 18,
      extra: { 'Jersey size': pick(['S', 'M', 'L']), 'Available on all match days?': i % 5 ? 'Yes' : 'No — some days', 'Previous team (if any)': i % 3 ? '' : pick(['Baroda Queens', 'Sunrise XI', 'College team']) },
    }))
    await createPlayers(t.id, players)
    console.log(`4. ${t.name} (DRAFT, 8 awaiting approval) → /register/${t.registrationToken}`)
  }

  // ── 5. Empty ────────────────────────────────────────────────────────────
  await createTournament(user.id, { name: 'Weekend Tennis Ball Cup', venue: 'Surat' })
  console.log('5. Weekend Tennis Ball Cup (empty)')

  console.log(`\nLog in with ${email} / demo12345`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
