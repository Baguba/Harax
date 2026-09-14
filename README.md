# Harax — Haramaya University Community Platform

A campus community platform for Haramaya University (Ethiopia): a Facebook-style feed, events hub, Telegram-style groups with real-time chat, official broadcast channels, and anonymous sidechat rooms — for students, lecturers, admins and super admins.

Built with **Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui + Prisma (SQLite) + Socket.IO**, styled as a **chunky game-UI** (think Supercell-style menus): Baloo 2 + Nunito typography, sticker headlines with fat ink outlines, cards and buttons with thick borders and hard bevel shadows that "press in" when clicked — all in flat lemon green + ink, with atmospheric photos of the Haramaya campus blended into the landing page.

---

## Requirements

- **Node.js 20 or newer** (`node -v` to check)
- **npm** (bundled with Node)

That's it — the database is SQLite (file-based, included and pre-seeded), no external services needed.

## Quick start

```bash
# 1. install dependencies (also generates the Prisma client via postinstall)
npm install

# 2. start everything — web app + real-time chat service
npm run dev
```

Then open **http://localhost:3000** in your browser.

`npm run dev` starts two processes for you (see `scripts/dev.mjs`):

| Process | Port | What it does |
|---|---|---|
| Next.js app | 3000 | UI + REST API (`/api/**`) |
| Chat service | 3003 (socket.io) + 3011 (loopback control) | real-time group & sidechat chat |

Stop with `Ctrl + C` (both processes stop together).

### Demo accounts (password: `harax2026`)

| Email | Role |
|---|---|
| selam.awoke@gmail.com | Student |
| dr.meron@haramaya.edu.et | Lecturer |
| registrar@haramaya.edu.et | Admin |
| ict.office@haramaya.edu.et | Super Admin |

The sign-in modal also has one-click chips for all four accounts. Google sign-in runs in demo mode unless you configure real OAuth credentials.

The database ships **pre-seeded** with a realistic Haramaya community (22 users, posts, groups, events, channels, sidechat rooms, notifications). Log in and explore.

## Profile photos & banners

Open your own profile and you can personalize it two ways:

- **Profile photo** — tap the small **camera badge** on your avatar (or use *Edit profile → Change photo*).
- **Banner** — tap **“Add banner photo”** on the cover strip (or pick a flat color in *Edit profile → Banner*), and swap in your own photo any time.

Both save instantly, work on mobile and desktop, and accept JPG / PNG / WebP / GIF up to 5 MB (photo) and 8 MB (banner). Uploads are checked server-side by magic bytes (a renamed `.exe` can never pass as an image), stored under `public/uploads/`, and files you replace or remove are cleaned up automatically.

Your own profile header also carries a **Log out** button (top of the banner, next to *Edit profile*) — handy on phones, where the sidebar isn't visible. It ends the session server-side and returns you to the landing page.

## Game Zone — play, score, win the week

**Game Zone** (sidebar / mobile *Games* tab) is a realtime multiplayer arcade for the campus:

- **Three games, full rules, live opponents** — *X & O* (tic-tac-toe), *Checkers* (forced captures, chain jumps, kings) and *Chess* (castling, en passant, promotions, checkmate/stalemate/50-move). Hit **Find opponent** to open a table anyone can join, or **Bot** to practice against the house bot (no weekly points).
- **Every rule is enforced server-side** — the browser only renders state and ships your taps; illegal or out-of-turn moves are rejected by the game engines in the chat service.
- **Points per game** — X&O: win **+6** / draw +2 · Checkers: win **+12** / draw +4 · Chess: win **+15** / draw +5 (losses pay +1 in checkers & chess). Points stack on the weekly ladder all week.
- **Weekly seasons reset every Monday 00:00 (East Africa time)** — when a week expires the top 3 are recorded in the hall of fame with their prizes (**gold trophy + 500 ETB campus voucher**, silver + 300, bronze + 150), get a notification, and the ladder starts fresh.
- **Fair-play timers** — 1:30 per move in X&O, 2:00 in checkers, 3:00 in chess. Clock out and you lose; leave the board and you have 2 minutes to come back before forfeiting.
- **Rematch, draw offers, resign and table talk** — all realtime, plus auto-resume: come back to Game Zone and your live match opens right where you left it.

The game engines live in `mini-services/chat-service/game-engines/` (plain Node, no build step) and the session manager (matchmaking, timers, points, seasons) in `mini-services/chat-service/games.js`. Leaderboard data comes from `GET /api/games/leaderboard`. The included database ships with a demo ladder + last week's podium so everything is explorable immediately.

## All scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start web + chat in dev mode (hot reload) |
| `npm run build` | Production build (`next build`) |
| `npm start` | Run the production build (web + chat) |
| `npm run chat` | Run only the chat service |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:push` | Push `prisma/schema.prisma` to the database |

## Configuration

Everything works out of the box with the included `.env`:

```ini
DATABASE_URL=file:../db/custom.db      # SQLite file (relative to prisma/schema.prisma)
CHAT_INTERNAL_TOKEN=harax-internal-2026 # shared secret between the app and chat service
```

Optional environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CHAT_URL` | auto | Force the browser socket URL (e.g. `https://chat.example.com`) if you host the chat service on another origin |
| `CHAT_INTERNAL_URL` | `http://127.0.0.1:3011` | Where REST routes reach the chat service |
| `PORT`-less | 3000 | The web app always binds 3000; the chat service binds 3003 + 3011 |

## Project structure

```
├── src/
│   ├── app/                  # Next.js App Router — the SPA at `/` + all REST API routes
│   │   └── api/               # auth, posts, comments, reactions, events, groups,
│   │                         # channels, sidechat, notifications, search, admin, upload…
│   ├── components/            # feed, groups, sidechat, events, channels, games, shell, auth, admin…
│   ├── hooks/                 # use-chat, use-game-socket (REST + socket.io + fallbacks)
│   └── lib/                   # auth (sessions, bcrypt), rate limiting, validation, db, art, games-meta
├── prisma/                    # schema.prisma + seed.ts
├── db/custom.db               # SQLite database (pre-seeded, incl. Game Zone demo ladder)
├── mini-services/chat-service # socket.io real-time service (chat + Game Zone, plain Node, no build step)
│   └── game-engines/          # tic-tac-toe, checkers, chess rules (pure functions)
├── scripts/                   # dev.mjs / start.mjs orchestrators
└── public/                    # logo, PWA icons, uploads
```

## How chat works (reliability by design)

- **Sending is always over REST** (`POST /api/groups/:id/messages` or `POST /api/sidechat/:id/messages`) — validated, rate-limited and persisted, so a message can never be silently lost.
- The chat service **broadcasts** new messages to everyone in the room over socket.io (typing indicators and presence too).
- If the socket can't connect (strict networks, service down), the client **polls every 3 seconds** — chat keeps working, just without live typing indicators.
- Messages are stored in SQLite and survive restarts.

## Troubleshooting

**Port 3000 / 3003 already in use**
Something else is running there. Stop it, or edit the port in `scripts/dev.mjs` (web) and `mini-services/chat-service/index.js` (`PORT` const).

**`PrismaClientInitializationError` / "did not initialize yet"**
Run `npm run db:generate`, then `npm run dev` again.

**Want a fresh database**
Delete `db/custom.db`, then `npm run db:push` to recreate the tables from the schema (the app will start empty — you can register the first account; the first user to register becomes a student, and you can seed demo roles from the code in `prisma/seed.ts`).

**WebSocket doesn't connect (rare)**
The app automatically falls back to REST + polling — chat still works. If you host behind a proxy, make sure it supports WebSocket upgrades and set `NEXT_PUBLIC_CHAT_URL`.

**Windows note**
Everything runs on Windows; `npm run dev` uses `node` only (no bash/unix tools required).

## Production

```bash
npm run build
npm start
```

Serves on `http://localhost:3000` with the chat service alongside. Put a reverse proxy (nginx/Caddy) in front for TLS, and set a real `SESSION_SECRET`-grade value for `CHAT_INTERNAL_TOKEN` in `.env`.
