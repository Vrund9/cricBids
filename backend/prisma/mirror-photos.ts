// One-off: copy every player photo still served from Google Drive to Cloudinary.
//
//   npm run photos:mirror            → only counts what would be copied
//   npm run photos:mirror -- --apply → copies them and updates the players
//
// New imports and registrations are copied automatically (PlayersService.mirrorPhotos); this
// catches the players added before that. Safe to run again: done photos are no longer Drive URLs,
// and a photo that can't be copied (not shared publicly) keeps its Drive URL.
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { eachLimit, mirrorDrivePhoto } from '../src/uploads/drive-mirror'

const apply = process.argv.includes('--apply')
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })

async function main() {
  if (apply && !process.env.CLOUDINARY_URL) throw new Error('CLOUDINARY_URL is not set')
  const players = await prisma.player.findMany({
    where: { photoUrl: { startsWith: 'https://lh3.googleusercontent.com/d/' } },
    select: { id: true, photoUrl: true, tournamentId: true },
  })
  const tournaments = new Set(players.map((p) => p.tournamentId)).size
  console.log(`${players.length} Drive photos across ${tournaments} tournaments`)
  if (!apply) return console.log('Dry run — pass --apply to copy them to Cloudinary')

  let done = 0
  let failed = 0
  await eachLimit(players, 4, async (p) => {
    const url = await mirrorDrivePhoto(p.photoUrl)
    if (url) {
      const res = await prisma.player.updateMany({ where: { id: p.id, photoUrl: p.photoUrl }, data: { photoUrl: url } })
      done += res.count
    } else failed++
    if ((done + failed) % 25 === 0) console.log(`  ${done + failed}/${players.length}`)
  })
  console.log(`Copied ${done}, kept on Drive ${failed} (couldn't be fetched — usually not shared publicly)`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
