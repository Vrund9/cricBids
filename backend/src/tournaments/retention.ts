import type { Prisma, PrismaClient } from '../generated/prisma/client'

/**
 * Retained players: a team keeps a player before the auction. The player is marked SOLD to that
 * team (so they never come up for bidding and count towards the squad) with `retained: true`.
 * `soldPrice` is what the retention took from the purse — 0 when the organiser chose not to deduct.
 */

type Db = Prisma.TransactionClient | PrismaClient

/** Every team's purse at the start of the auction: the full purse minus what its retentions cost. */
export async function resetPurses(tx: Db, tournamentId: string, teamPurse: number) {
  const spent = await tx.player.groupBy({
    by: ['soldTeamId'],
    where: { tournamentId, retained: true, soldTeamId: { not: null } },
    _sum: { soldPrice: true },
  })
  const byTeam = new Map(spent.map((s) => [s.soldTeamId!, s._sum.soldPrice ?? 0]))
  const teams = await tx.team.findMany({ where: { tournamentId }, select: { id: true } })
  await Promise.all(teams.map((team) => tx.team.update({ where: { id: team.id }, data: { purse: teamPurse - (byTeam.get(team.id) ?? 0) } })))
}

/** Put a team's retained players back in the pool (used before a team is deleted). */
export function releaseRetained(db: PrismaClient, teamIds: string[]) {
  return db.player.updateMany({
    where: { soldTeamId: { in: teamIds }, retained: true },
    data: { status: 'AVAILABLE', retained: false, soldTeamId: null, soldPrice: null, soldAt: null },
  })
}
