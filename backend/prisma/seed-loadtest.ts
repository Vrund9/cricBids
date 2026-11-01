// Load-test data for a STAGING database: `npm run seed:loadtest -w backend -- --staging [organisers] [--auctions=N]`
//
// Creates (and on re-run replaces) everything under the @loadtest.bidwicket.dev email domain:
//   · N auctioneer accounts (default 1), each owning a LIVE 2,000-player auction with 16 remote-bidding teams
//   · N organiser accounts (default 200), each owning one READY tournament, for the dashboard flow
// and writes the JMeter CSVs to loadtest/data/. Never point this at production.
import 'dotenv/config'
import { randomBytes } from 'crypto'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { DEFAULT_REG_FIELDS } from '../src/common/registration'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
const token = () => randomBytes(18).toString('base64url')

const DOMAIN = 'loadtest.bidwicket.dev'
const PASSWORD = 'LoadTest-2026!'
const OUT = join(__dirname, '..', '..', 'loadtest', 'data')
const ROLES = ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper']
const INCREMENTS = [{ from: 0, step: 500 }, { from: 10000, step: 1000 }, { from: 25000, step: 2500 }]

function tournament(ownerId: string, name: string, extra: Record<string, unknown>) {
  return prisma.tournament.create({
    data: {
      ownerId,
      name,
      slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${randomBytes(3).toString('hex')}`,
      venue: 'Load test',
      auctionDate: new Date(),
      plan: 'PRO',
      planActivatedAt: new Date(),
      basePrice: 2000,
      bidIncrements: INCREMENTS,
      playerOrder: 'SEQUENTIAL',
      bidTimerSec: 30,
      setupComplete: true,
      registrationFields: DEFAULT_REG_FIELDS as any,
      registrationToken: token(),
      liveToken: token(),
      remoteBidding: true,
      ...extra,
    },
  })
}

function teams(tournamentId: string, count: number, purse: number) {
  return prisma.team.createManyAndReturn({
    data: Array.from({ length: count }, (_, i) => ({
      tournamentId, name: `Load Team ${i + 1}`, shortName: `LT${i + 1}`, color: '#3B82F6', purse, bidToken: token(), sortOrder: i + 1,
    })),
  })
}

function players(tournamentId: string, count: number) {
  return prisma.player.createManyAndReturn({
    data: Array.from({ length: count }, (_, i) => ({ tournamentId, serial: i + 1, name: `Load Player ${i + 1}`, role: ROLES[i % ROLES.length] })),
    select: { id: true },
  })
}

const csv = (file: string, header: string, rows: string[]) => writeFileSync(join(OUT, file), [header, ...rows].join('\n') + '\n')

async function main() {
  if (!process.argv.includes('--staging')) {
    throw new Error('This writes hundreds of accounts. Run it against a staging DATABASE_URL and pass --staging to confirm.')
  }
  const organisers = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 200)
  const auctions = Number(process.argv.find((a) => a.startsWith('--auctions='))?.split('=')[1] ?? 1)
  const passwordHash = await bcrypt.hash(PASSWORD, 12)

  const old = await prisma.user.findMany({ where: { email: { endsWith: `@${DOMAIN}` } }, select: { id: true } })
  if (old.length) {
    await prisma.tournament.deleteMany({ where: { ownerId: { in: old.map((u) => u.id) } } })
    await prisma.user.deleteMany({ where: { id: { in: old.map((u) => u.id) } } })
    console.log(`Removed ${old.length} previous load-test account(s).`)
  }

  // ── Live auctions: each auctioneer sells/advances while VUs bid through team links and watch the live screen ──
  const auctioneers: string[] = []
  const liveTokens: string[] = []
  const teamTokens: string[][] = []
  for (let a = 1; a <= auctions; a++) {
    const auctioneer = await prisma.user.create({ data: { name: `Load Auctioneer ${a}`, email: `auctioneer${a}@${DOMAIN}`, passwordHash } })
    const live = await tournament(auctioneer.id, `Load Test Live Auction ${a}`, { status: 'LIVE', teamPurse: 100_000_000, minSquad: 1, maxSquad: 500 })
    const liveTeams = await teams(live.id, 16, 100_000_000)
    const pool = await players(live.id, 2000)
    await prisma.player.update({ where: { id: pool[0].id }, data: { status: 'LIVE' } })
    await prisma.auctionState.create({
      data: { tournamentId: live.id, currentPlayerId: pool[0].id, round: 1, queue: pool.slice(1).map((p) => p.id), startedAt: new Date() },
    })
    auctioneers.push(`${auctioneer.email},${PASSWORD},${live.id}`)
    liveTokens.push(live.liveToken)
    teamTokens.push(liveTeams.map((t) => t.bidToken))
    console.log(`  auction ${a}: /live/${live.liveToken}`)
  }

  // ── Organisers for login + dashboard. One account per VU: each sign-in revokes that account's older tokens. ──
  const rows: string[] = []
  for (let i = 1; i <= organisers; i++) {
    const u = await prisma.user.create({ data: { name: `Load Organiser ${i}`, email: `org${i}@${DOMAIN}`, passwordHash } })
    const t = await tournament(u.id, `Load Cup ${i}`, { status: 'READY', teamPurse: 250_000, minSquad: 11, maxSquad: 15 })
    await teams(t.id, 8, 250_000)
    await players(t.id, 120)
    rows.push(`${u.email},${PASSWORD},${t.id}`)
    if (i % 50 === 0) console.log(`  ${i}/${organisers} organisers`)
  }

  mkdirSync(OUT, { recursive: true })
  csv('organisers.csv', 'email,password,tournamentId', rows)
  csv('auctioneer.csv', 'email,password,tournamentId', auctioneers)
  csv('live.csv', 'liveToken', liveTokens)
  // Round-robin across auctions, so the first N team-owner VUs are spread over every auction.
  csv('teams.csv', 'bidToken', teamTokens[0].flatMap((_, i) => teamTokens.map((ts) => ts[i])))

  console.log(`\n${auctions} live auction(s), 16 teams and 2,000 players each`)
  console.log(`${organisers} organisers, password ${PASSWORD}`)
  console.log(`CSVs written to ${OUT}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
