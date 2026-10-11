# CricBid — live cricket player auctions

Replace the Excel → PPT → WhatsApp-screenshots routine with a dynamic auction:

1. **Collect players** with a shareable registration form (photo upload, custom questions, optional approval) and/or by uploading any Excel / CSV / Google Forms export. Columns are detected automatically; Drive photo links are converted.
2. **Answer a few questions.** A setup wizard covers teams, purse, base price (per category too), squad size, bid steps, player order, a countdown and remote bidding, with smart defaults based on your player pool.
3. **Go live.** Run the auction from the control room (keyboard shortcuts, undo, reopen, skip, pause, re-auction unsold). Share **one live link** for the projector, team owners and fans. It updates in realtime and shows a rich WhatsApp/X preview.
4. **Export results** to Excel: one sheet per team, plus summary and unsold.

## Stack

| | |
|---|---|
| `backend/` | **NestJS 11**, **Prisma 7** + **PostgreSQL**, Socket.IO realtime, JWT auth, class-validator, rate limiting, Helmet |
| `frontend/` | **Next.js 16** (App Router), React 19, Tailwind CSS 4, **Motion** (`motion/react`), SheetJS, socket.io-client |

## Run it locally

Requires Node 20.19+.

```bash
npm install                                       # installs both apps, generates the Prisma client
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Pick ONE database option (both listen on localhost:5433):
npm run db:local        # zero-install Postgres from node_modules (keep this terminal open)
# or: npm run db:up      # Docker

npm run db:deploy       # apply migrations (in a second terminal)
npm run db:seed         # optional demo data (see below)
npm run dev             # API on :4000, web on :3000
```

Open http://localhost:3000.

> Port 3000 busy? `PORT=3100 npm run dev -w frontend`, then set `NEXT_PUBLIC_SITE_URL` in `frontend/.env.local` and add the origin to `WEB_ORIGIN` in `backend/.env`.

### Demo data

`npm run db:seed` resets `demo@cricbid.app` / `demo12345` with five tournaments covering different situations:

| Tournament | State | What it shows |
|---|---|---|
| Demo Premier League 2026 | Ready (Pro) | 72 players with photos, Marquee/A/B categories, a custom base price, a very long name, no-photo / broken-photo fallbacks, entries awaiting approval with custom answers |
| Corporate Cricket Cup | **Live** (Pro, Royal theme) | Mid-auction: sales, unsold players, a full squad, a purse-locked team, a record buy, a live player with a phone bid |
| Society Box Cricket League | Completed (Free, Emerald) | Re-auction round done, results to export |
| Women's T10 Championship | Draft (Free, Crimson) | Registrations open, approval queue, rules not set |
| Weekend Tennis Ball Cup | Empty | First-run empty states |

Photos are placeholder portraits from pravatar.cc / randomuser.me.

## Production

```bash
npm run build
npm run db:deploy
npm start
```

Set these for production:

- **Backend:** `DATABASE_URL`, `JWT_SECRET` (long random value; the API refuses to boot with the default), `WEB_ORIGIN` (your site URL), `API_PUBLIC_URL`, and the optional `SMTP_*` for password-reset mail.
- **Frontend:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL` (canonical URL used for SEO, sitemap and share links; set it at build time), and optionally `API_INTERNAL_URL`.
- **Billing:** `BILLING_MODE=demo` makes upgrades activate instantly with no charge. It is the default outside production. In production it defaults to `disabled` (upgrades return 402) until a payment gateway is wired into `backend/src/billing/billing.controller.ts`.
- **Uploads:** stored on disk in `backend/uploads`. Use a persistent volume, or swap `src/uploads/uploads.ts` for S3/R2.
- **Scaling:** realtime runs in-process. For multiple API instances, add the Socket.IO Redis adapter. Bid correctness is already safe across instances, because each state write is version-checked.

## Plans, themes, sounds

- **Plans:** limits are defined once in `backend/src/common/plans.ts` and enforced by the API. Pricing copy lives in `frontend/src/lib/plans.ts`.
  - Free: 6 teams, 60 players.
  - Pro (₹1,499 per tournament): 16 teams, 500 players, remote bidding, brand colour, white-label.
  - Season Pass (₹4,999 per year): Pro on every tournament the organiser owns.
- **Themes:** 7 presets, plus a custom accent colour on Pro. They apply to the live screen, registration form, team paddles and link-preview images by swapping the CSS colour tokens (`frontend/src/lib/themes.ts`).
- **Sounds:** synthesized with Web Audio, so there are no audio files (`frontend/src/lib/sound.ts`). They cover bids, countdown ticks, the gavel, a sold fanfare with crowd (bigger for a record buy), unsold, and per-role intros. Sound is off until someone taps the speaker icon, as browsers require.
- **Role effects:** each new player gets a role-specific entrance (`frontend/src/components/effects.tsx`) and a matching backdrop on their card:
  - Batter: a six.
  - Bowler: stumps flying.
  - Keeper: a glove catch with "HOWZAT!".
  - All-rounder: bat and ball orbiting.

## How the auction engine stays correct

- All rules live on the server (`backend/src/auction`). Clients only ever render a snapshot.
- Each auction's actions run one at a time, and every state write checks a version number (optimistic locking). Simultaneous bids from the auctioneer and team phones can never both win.
- **Max bid** = purse − (players still needed for the minimum squad − 1) × base price, so a team can always complete its squad. The maximum squad size is also enforced.
- Remote paddles send the price they saw. If someone outbid them in between, the bid is rejected with the new price.
- Random order uses a crypto-secure shuffle. The queue is never sent to clients, so nobody can see who's next.
- Public snapshots never include phone numbers, emails or custom answers.

## API overview

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/signup` `login` `forgot-password` `reset-password` `change-password`, `GET/PATCH /auth/me` |
| Tournaments | `GET/POST /tournaments`, `GET/PATCH/DELETE /tournaments/:id`, `GET :id/suggestions`, `POST :id/rotate-token` |
| Teams | `GET/POST :id/teams`, `PUT :id/teams/count`, `PATCH/DELETE :id/teams/:teamId`, `POST :id/teams/:teamId/rotate-token` |
| Players | `GET/POST :id/players`, `POST :id/players/import` `approve` `category`, `PATCH/DELETE :id/players/:playerId` |
| Auction | `GET :id/auction`, `GET :id/auction/results`, `POST :id/auction/{start,next,bid,sell,unsold,undo,reopen,skip,pause,resume,reauction,finish,reset}` |
| Public | `GET /public/live/:token` `/meta` `/squads`, `GET/POST /public/register/:token`, `POST /public/register/:token/photo`, `GET/POST /public/bid/:token` |
| Realtime | Socket.IO namespace `/live`: `join {liveToken}`, `join-owner {tournamentId, token}` → `state`, `viewers`, `registration` |

## Legacy code

The previous Convex version was moved to `legacy/` untouched (a tarball backup is in the parent folder). Delete it once you no longer need it.
