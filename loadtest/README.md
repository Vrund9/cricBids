# Load testing (JMeter + realtime watchers)

Two tools, run together:

- **`bidwicket.jmx`**: a JMeter 5.6 plan for the HTTP side. It also imports into OctoPerf, where each thread group becomes a virtual user.
- **`watchers.mjs`**: a Node harness for the realtime side. It runs thousands of spectators that hold a Socket.IO
  connection, the way the live screen does, and measures how long each pushed update takes to arrive.

| JMeter thread group | What it does | Data |
| --- | --- | --- |
| Spectator - Live View | Opens `/live/:token` (SSR), fetches the snapshot, squads and meta, with 15–30 s pauses | `live.csv` |
| Team Owner - Remote Bid | Reads the paddle (`GET /public/bid/:token`) and bids the shown `nextBid`, every 2–6 s | `teams.csv` |
| Auctioneer - Control Room | Every `LOT_MS` (12 s): sells the lot, or marks it unsold if nobody bid, then moves to the next | `auctioneer.csv` |
| Organiser - Dashboard | Signs in once, then loads `/auth/me`, `/tournaments`, a tournament and its teams | `organisers.csv` |
| Visitor - Website | Landing, pricing, how-it-works, login pages and `/health` | — |

Virtual user *n* always takes row *n* of its CSV (wrapping around), so each VU keeps one account, team or auction for the
whole run. Two VUs on the same account would sign each other out, because each sign-in revokes that account's older tokens.
`teams.csv` is written round-robin across auctions, so 40 team-owner VUs over 10 auctions puts 4 bidders on each.

A bid that answers **409** (someone else bid first) or **400** (this team already leads) counts as a success,
because that is the app working as designed when many teams bid at once.

## 1. Staging environment

Never run this against production. It writes hundreds of accounts, and the throttler has to be off.

1. Deploy a copy of the Render stack (API + web + Postgres) under different names, e.g. `bidwicket-api-staging`.
   Use the same plans as production, or the numbers won't carry over.
2. On the staging API, set `THROTTLE_DISABLED=true`. Load generators share a few IPs, so with the
   300 req/min-per-IP limit the test would only measure 429s.
3. Seed it from your machine with the staging `DATABASE_URL`:
   ```sh
   DATABASE_URL='<staging external URL>' npm run seed:loadtest -w backend -- --staging 200 --auctions=10
   ```
   That creates 200 organisers and 10 auctioneers, each with a live 2,000-player auction, and writes `loadtest/data/*.csv`
   (git-ignored: they hold staging tokens and passwords). Re-running replaces all `@loadtest.bidwicket.dev` data,
   so seed again before each run to get fresh auctions.

## 2. Run

JMeter resolves the CSVs relative to the plan file, so copy them next to the `.jmx` first:

```sh
cp loadtest/data/*.csv loadtest/
# HTTP: 10 auctioneers, 40 bidders, 50 organisers, 30 visitors for 10 minutes
jmeter -n -t loadtest/bidwicket.jmx -l results.jtl -e -o report \
  -JAPI_HOST=bidwicket-api-staging.onrender.com -JWEB_HOST=bidwicket-web-staging.onrender.com \
  -JSPECTATORS=0 -JTEAM_OWNERS=40 -JAUCTIONEERS=10 -JORGANISERS=50 -JVISITORS=30 -JRAMP_SEC=120 -JDURATION_SEC=600
# Realtime, at the same time: 5,000 watchers spread over the auctions in live.csv, 5 min ramp + 5 min hold
node loadtest/watchers.mjs --api https://bidwicket-api-staging.onrender.com --web https://bidwicket-web-staging.onrender.com \
  --watchers 5000 --ramp 300 --hold 300 --workers 4 --out results/watchers.json
```

For a local target add `-JPROTOCOL=http -JAPI_PORT=4000 -JWEB_PORT=3000` with `localhost` hosts.
The watcher harness parses every snapshot it receives, so if you can, run it on a different machine from the server.

### OctoPerf

Import `bidwicket.jmx`, upload the CSVs as project files, set `API_HOST`/`WEB_HOST`, and build the scenario from
`scenario.json`. Pick a load-generator region near Singapore. Run `watchers.mjs` alongside it: OctoPerf's
JMeter virtual users don't hold Socket.IO connections.
