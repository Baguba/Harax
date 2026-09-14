# Harax — Deployment & Google Play Store Guide

This guide takes Harax from the zip on your machine to a live website and finally to an installable Android app on the Play Store. Follow the stages in order — each one depends on the one before it.

**The big picture:** Google Play only accepts Android app packages (`.aab`), not websites. The standard path for a web app is a **TWA (Trusted Web Activity)**: PWABuilder wraps your *live website* in a native Android shell, so the Play Store app is really your site running full-screen with its own icon and no browser bar. Nothing needs to be rewritten — but the site must be **online 24/7 with HTTPS first**.

> **Do not use Vercel or Netlify.** Harax needs a real Node server for its Socket.IO chat/game service, its SQLite database and local file uploads. Use Railway, Render or Fly.io instead (all ~$5/month, all support Node + persistent disks).

---

## Stage 0 — What you need before starting

| Item | Cost | Notes |
|---|---|---|
| GitHub account | free | github.com — you already have `Baguba/Harax` |
| Railway account (or Render / Fly.io) | ~$5/mo | needs an internationally-enabled card (see below) |
| A domain (optional but recommended) | ~$10/yr | e.g. `harax.app` on Namecheap / Porkbun |
| Google Play developer account | $25 once | play.google.com/console |
| App-side assets | free | already done — icons, privacy policy, screenshots live in `download/play-store/` |

**Payment note for Ethiopia:** Railway/Render/Fly and Google Play all need a card that works internationally. Options that students commonly use: a **CBE birr card with USD enabled**, **Dashen Bank USD card**, or virtual card providers (e.g. Kacha, Ehundul). Start this early — it is usually the slowest step.

---

## Stage 1 — Push the code to GitHub

```bash
cd harax
git init                      # skip if the folder already has .git
git add .
git commit -m "Harax — campus community platform"
git remote add origin https://github.com/Baguba/Harax.git
git branch -M main
git push -u origin main
```

If you cloned from GitHub instead, just `git push`. The `.gitignore` already keeps secrets (`.env`), the database (`db/custom.db`) and user uploads out of the repo — never force-add them.

---

## Stage 2 — Put Harax online with Railway

These steps are for **Railway** (the friendliest for Next.js + Node sidecars). Render and Fly.io work the same way with their equivalents.

### 2.1 Create the project

1. Go to **railway.app → New Project → Deploy from GitHub repo** → pick `Baguba/Harax`.
2. Railway detects Next.js automatically. Override the settings so the chat service starts too:
   - **Build command:** `npm ci && npm run build`
   - **Start command:** `npm start`   *(runs `scripts/start.mjs` = web on 3000 + chat service on 3003/3011)*
3. **Networking tab → Generate Domain** — you get a `*.up.railway.app` HTTPS URL immediately. Test it: sign in, post, open Game Zone. If the games connect, the chat service is alive.

### 2.2 Add a persistent volume (critical)

By default Railway's filesystem is **ephemeral** — every redeploy wipes the database and uploads. Fix:

1. **Settings → Volumes → New Volume**, mount it at `/data`.
2. Set the environment variable so the database lives on the volume:
   ```ini
   DATABASE_URL=file:/data/custom.db
   ```
3. The chat service reads `DATABASE_URL` from the environment too, so one variable covers both processes.
4. Move uploads to the volume as well — add to the **Start command**:
   ```bash
   mkdir -p /data/uploads && rm -rf public/uploads && ln -s /data/uploads public/uploads && npm start
   ```

### 2.3 First-run database setup

The repo ships the Prisma schema but **not** the database (it's gitignored). On first deploy, run once from Railway's **Settings → Terminal** (or locally with `DATABASE_URL` pointed at the volume):

```bash
npx prisma db push          # creates all tables
npx prisma db seed          # optional: demo community (22 users, posts, events…)
```

Then register your own super-admin account through the app's sign-up, and (optionally) promote it directly in SQLite:
`UPDATE User SET role='SUPERADMIN', verified=1 WHERE email='you@example.com';`

> **Backups:** Railway volumes can snapshot. Also do a weekly `scp`/download of `/data/custom.db` — one file, that's the whole community.

### 2.3b Render / Fly.io differences

- **Render:** one Web Service (`npm start`), one **Persistent Disk** mounted at `/data`, same env var. Render's free tier sleeps after 15 min idle — the paid tier (~$7) is the realistic choice for a community app.
- **Fly.io:** `fly launch` detects Node; add `[mounts] source="harax_data" destination="/data"` in `fly.toml`. Cheapest at ~$3–5/mo.

### 2.4 Custom domain (recommended)

1. Buy the domain, e.g. `harax.app`.
2. Railway → **Settings → Networking → Custom Domain** → `harax.app`, and add the shown `CNAME` (or `A` records) at your registrar's DNS page.
3. HTTPS is automatic. Wait for DNS to propagate (minutes to a few hours).

**Before you continue, verify:** the site loads over HTTPS, you can sign in, chat connects, Game Zone works, and `https://your-domain/privacy` opens without signing in.

---

## Stage 3 — Build the Android app with PWABuilder

1. Go to **pwabuilder.com** and enter `https://your-domain`.
2. Wait for the audit — Harax should score well: manifest ✅, icons ✅ (512 PNG + maskable are in `public/`), service worker ✅, HTTPS ✅.
3. Click **Package for stores → Android (Play)**.
4. Fill in:
   - **Package ID:** `app.harax.campus` (or `com.baguba.harax` — must be unique forever, you can never change it after publishing)
   - **App name:** `Harax — Haramaya Community`, **short name:** `Harax`
   - Version `1.0.0`, **min SDK 21+**, all display options default (fullscreen/standalone)
5. Download the **`.aab` bundle** (Play Store's required format). PWABuilder also saves a **signing key — back it up somewhere safe (password manager + email to yourself)**. If you lose it you can never update your app again.

### 3.1 Verify the domain link (removes the URL bar)

For the TWA to open without any browser chrome, your site must host a Digital Asset Links file. PWABuilder gives you the exact JSON during packaging:

1. Create `public/.well-known/assetlinks.json` in the repo with the JSON PWABuilder shows (it contains your signing key's SHA-256 fingerprint).
2. Commit + push → Railway redeploys → confirm `https://your-domain/.well-known/assetlinks.json` returns the JSON.

---

## Stage 4 — Publish on Google Play

1. **play.google.com/console → Pay the one-time $25 → Create app.**
   - App name: `Harax — Haramaya Community` · Default language: English · App/App bundle: **App**
2. Complete the left-side menu top to bottom:

| Section | What to enter |
|---|---|
| **App content → Privacy policy** | `https://your-domain/privacy` (the page ships with the app) |
| **App content → Data safety** | Answers below ⬇ |
| **App content → Ads** | No, Harax contains no ads |
| **App content → Content ratings** | Fill the questionnaire (social network, no violence/gambling — Game Zone prizes are campus vouchers, not cash gambling; answer "no contests/sweepstakes" unless you formalize them) |
| **Target audience** | 18+ (university students) — safest choice, avoids child-policy requirements |
| **Store settings** | App category: **Social** or **Education** · contact e-mail (use one you actually check) |
| **Main store listing** | See the table below ⬇ |

**Data safety form answers (matching the shipped privacy policy):**

| Question | Answer |
|---|---|
| Does your app collect or share user data? | **Yes** |
| Data collected | **Personal info** (name, e-mail — account management) · **Photos and videos** (app functionality) · **App interactions** (Game Zone scores) |
| Is data encrypted in transit? | **Yes** (HTTPS) |
| Can users request data deletion? | **Yes** — in-app: Settings → Danger zone → Delete account |

**Store listing assets** (all ready in `download/play-store/`):

| Asset | File |
|---|---|
| App icon 512×512 | `play-store-icon-512.png` |
| Feature graphic 1024×500 | `feature-graphic.png` |
| Phone screenshots (use 4–8) | `01-landing … 08-privacy.png` (1080×1920) |

Short description (80 chars max):
> `Haramaya University's own community — feed, events, groups, sidechat & games.`

Full description (start from this):
> Harax is the community platform built by Haramaya students, for Haramaya students. Post what's happening on campus, find events, join groups and channels, chat in real time, and climb the weekly Game Zone leaderboard in checkers, chess and X&O — the top 3 win prizes every week. Your campus, connected.

3. **Production → Create release → upload the `.aab`** → roll out to 100%.
4. First review takes **up to 7 days** (often 1–3). Watch the console e-mail for questions; answer plainly, link the privacy policy if asked.
5. Approved → Harax is live on the Play Store. 🎉 Share the link with campus.

---

## Stage 5 — After launch (maintenance rhythm)

- **Updating the app:** change code → push to GitHub → Railway redeploys instantly. Play Store app picks up site changes automatically (it's a TWA) — you only need a new `.aab` release when you change the *native* side (icon, name, package config, assetlinks).
- **Weekly:** download a copy of `/data/custom.db` (volume snapshot or via Railway terminal).
- **Game Zone prizes:** winners are recorded in the Hall of Fame each Monday 00:00 EAT — announce and hand out vouchers from the Admin view.
- **Moderation:** check Reports (Admin view) regularly; Google expects reported content to be actioned reasonably fast.
- **Legal pages:** if you change what data you collect, update `/privacy` and the Data safety form to match.

---

## Quick troubleshooting

| Symptom | Fix |
|---|---|
| Games/chat say "Connecting…" on Railway | Start command must be `npm start` (not `next start`) so `scripts/start.mjs` boots the chat service too |
| Data disappears after redeploy | Volume not mounted, or `DATABASE_URL` doesn't point at `/data` |
| Uploads 404 after redeploy | `public/uploads` symlink to the volume missing (Stage 2.2 step 4) |
| Play build fails "no 512 icon" | The PNG icons ship in `public/` — make sure the manifest `icons` array wasn't reverted |
| URL bar shows in the Android app | `/.well-known/assetlinks.json` missing or fingerprint mismatch — re-copy from PWABuilder |
| First review rejected | 95% of the time: privacy policy unreachable, or Data safety inconsistent with the policy. Both ship with the app — double-check the live URLs |
