// Realtime watcher load: N spectators doing what a phone on a live link does.
//   1. load the live page (SSR)            → page time
//   2. connect to /live over WebSocket and `join` → join time (connect → ack with snapshot)
//   3. stay connected; every `state` push  → delivery delay (receive time − snapshot.serverTime)
//   4. open the squads tab now and then    → squads time
//
//   node loadtest/watchers.mjs --api http://localhost:4000 --web http://localhost:3000 \
//     --watchers 5000 --ramp 300 --hold 300 --workers 4 --out results/watchers.json
//
// Live tokens come from loadtest/data/live.csv (written by `npm run seed:loadtest`); watchers are spread evenly over them.
// Run the harness on a different machine from the server when you can: parsing thousands of snapshots costs CPU too.
import { fork } from 'child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { io } from 'socket.io-client'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : fallback
}
const API = arg('api', 'http://localhost:4000')
const WEB = arg('web', 'http://localhost:3000')
const WATCHERS = Number(arg('watchers', 100))
const RAMP = Number(arg('ramp', 60)) * 1000
const HOLD = Number(arg('hold', 60)) * 1000
const WORKERS = Number(arg('workers', 1))
const OUT = arg('out', '')
const here = dirname(fileURLToPath(import.meta.url))
const tokens = readFileSync(join(here, 'data', 'live.csv'), 'utf8').trim().split('\n').slice(1)

const pct = (a, p) => {
  if (!a.length) return null
  const s = Float64Array.from(a).sort()
  return Math.round(s[Math.min(s.length - 1, Math.floor((s.length - 1) * p / 100))])
}
const dist = (a) => ({ n: a.length, p50: pct(a, 50), p90: pct(a, 90), p95: pct(a, 95), p99: pct(a, 99), max: pct(a, 100) })

if (process.env.WATCHER_WORKER) worker()
else main()

// ── coordinator ──
function main() {
  const started = Date.now()
  const all = { page: [], join: [], delivery: [], squads: [], snapshotBytes: [] }
  const counters = { connected: 0, pageErrors: 0, joinErrors: 0, connectErrors: 0, disconnects: 0, reconnects: 0, squadErrors: 0, events: 0 }
  const live = new Map()
  const timeline = []
  let interval = { delivery: [], join: [], page: [] }
  let done = 0

  for (let w = 0; w < WORKERS; w++) {
    const share = Math.floor(WATCHERS / WORKERS) + (w < WATCHERS % WORKERS ? 1 : 0)
    const child = fork(fileURLToPath(import.meta.url), process.argv.slice(2), {
      env: { ...process.env, WATCHER_WORKER: '1', W_INDEX: String(w), W_COUNT: String(share), W_STRIDE: String(WORKERS), W_START: String(started) },
    })
    child.on('message', (m) => {
      for (const k of Object.keys(all)) { all[k].push(...m[k]); if (interval[k]) interval[k].push(...m[k]) }
      for (const k of Object.keys(counters)) if (k !== 'connected') counters[k] += m.counters[k]
      live.set(w, m.counters.connected)
    })
    child.on('exit', () => { if (++done === WORKERS) finish() })
  }

  const tick = setInterval(() => {
    const t = Math.round((Date.now() - started) / 1000)
    const connected = [...live.values()].reduce((a, b) => a + b, 0)
    const row = { t, connected, eventsPerSec: Math.round(interval.delivery.length / 10), delivery: dist(interval.delivery), join: dist(interval.join), page: dist(interval.page) }
    timeline.push(row)
    console.log(`t=${String(t).padStart(4)}s connected=${String(connected).padStart(5)} pushes/s=${String(row.eventsPerSec).padStart(6)} delivery p50/p95/p99=${row.delivery.p50}/${row.delivery.p95}/${row.delivery.p99}ms join p95=${row.join.p95}ms page p95=${row.page.p95}ms disc=${counters.disconnects} errs=${counters.connectErrors + counters.joinErrors + counters.pageErrors}`)
    interval = { delivery: [], join: [], page: [] }
  }, 10_000)

  function finish() {
    clearInterval(tick)
    const peak = Math.max(0, ...timeline.map((r) => r.connected))
    const summary = {
      config: { api: API, web: WEB, watchers: WATCHERS, auctions: tokens.length, rampSec: RAMP / 1000, holdSec: HOLD / 1000, workers: WORKERS },
      peakConnected: peak, counters,
      page: dist(all.page), join: dist(all.join), delivery: dist(all.delivery), squads: dist(all.squads), snapshotBytes: dist(all.snapshotBytes),
      timeline,
    }
    console.log(JSON.stringify({ ...summary, timeline: undefined }, null, 1))
    if (OUT) { mkdirSync(dirname(OUT), { recursive: true }); writeFileSync(OUT, JSON.stringify(summary, null, 1)) }
    process.exit(0)
  }
}

// ── worker: runs its share of watchers and reports every 5 s ──
function worker() {
  const index = Number(process.env.W_INDEX), count = Number(process.env.W_COUNT), stride = Number(process.env.W_STRIDE)
  const started = Number(process.env.W_START)
  const end = started + RAMP + HOLD
  let buf = { page: [], join: [], delivery: [], squads: [], snapshotBytes: [] }
  const counters = { connected: 0, pageErrors: 0, joinErrors: 0, connectErrors: 0, disconnects: 0, reconnects: 0, squadErrors: 0, events: 0 }
  const sockets = []
  const timers = []

  const flush = () => {
    process.send({ ...buf, counters: { ...counters } })
    buf = { page: [], join: [], delivery: [], squads: [], snapshotBytes: [] }
    for (const k of Object.keys(counters)) if (k !== 'connected') counters[k] = 0
  }
  const report = setInterval(flush, 5000)

  const timed = async (url, bucket, errKey) => {
    const t = performance.now()
    try {
      const res = await fetch(url)
      await res.arrayBuffer()
      if (!res.ok) throw new Error(String(res.status))
      buf[bucket].push(performance.now() - t)
    } catch { counters[errKey]++ }
  }

  for (let i = 0; i < count; i++) {
    const global = index + i * stride
    const token = tokens[global % tokens.length]
    const delay = (global / WATCHERS) * RAMP
    timers.push(setTimeout(() => watch(token, global), delay))
  }

  async function watch(token, id) {
    await timed(`${WEB}/live/${token}`, 'page', 'pageErrors')
    const socket = io(`${API}/live`, { transports: ['websocket'], reconnection: true, reconnectionDelay: 500, reconnectionDelayMax: 4000, timeout: 20000 })
    sockets.push(socket)
    let joinedOnce = false
    socket.on('connect', () => {
      const t = performance.now()
      socket.timeout(20000).emit('join', { liveToken: token }, (err, res) => {
        if (err || !res?.ok) { counters.joinErrors++; return }
        buf.join.push(performance.now() - t)
        if (joinedOnce) counters.reconnects++
        joinedOnce = true
        counters.connected++
      })
    })
    socket.on('disconnect', () => { if (joinedOnce) { counters.connected--; counters.disconnects++ } })
    socket.on('connect_error', () => counters.connectErrors++)
    socket.on('state', (snap) => {
      buf.delivery.push(Date.now() - snap.serverTime)
      counters.events++
      if (id % 100 === 0 && Math.random() < 0.05) buf.snapshotBytes.push(JSON.stringify(snap).length)
    })
    // Squads tab every 45–75 s, as long as the run lasts.
    const squads = () => {
      if (Date.now() > end) return
      void timed(`${API}/public/live/${token}/squads`, 'squads', 'squadErrors')
      timers.push(setTimeout(squads, 45000 + Math.random() * 30000))
    }
    timers.push(setTimeout(squads, 45000 + Math.random() * 30000))
  }

  setTimeout(() => {
    for (const t of timers) clearTimeout(t)
    for (const s of sockets) { s.off('disconnect'); s.close() }
    counters.connected = 0
    flush()
    clearInterval(report)
    setTimeout(() => process.exit(0), 200)
  }, end - Date.now())
}
