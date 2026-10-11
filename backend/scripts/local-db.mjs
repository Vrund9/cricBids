// Zero-install Postgres for local development: `npm run db:local`.
// Runs a real PostgreSQL 17 server from node_modules, storing data in backend/.pgdata.
// Use Docker (`npm run db:up`) or any managed Postgres instead if you prefer — same DATABASE_URL.
import EmbeddedPostgres from 'embedded-postgres'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'

const dir = fileURLToPath(new URL('../.pgdata', import.meta.url))
const port = Number(process.env.LOCAL_PG_PORT || 5433)
process.env.LANG ??= 'en_US.UTF-8'
process.env.LC_ALL ??= 'en_US.UTF-8'

const pg = new EmbeddedPostgres({
  databaseDir: dir,
  user: 'cricbid',
  password: 'cricbid',
  port,
  persistent: true,
  initdbFlags: ['--locale=C', '--encoding=UTF8'],
})

if (!existsSync(dir)) {
  console.log('Initialising local Postgres data directory…')
  await pg.initialise()
}
await pg.start()
try {
  await pg.createDatabase('cricbid')
} catch {
  /* already exists */
}
console.log(`\n✔ Postgres ready: postgresql://cricbid:cricbid@localhost:${port}/cricbid\n  Leave this running. Press Ctrl+C to stop.\n`)

const stop = async () => {
  await pg.stop()
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
setInterval(() => {}, 1 << 30)
