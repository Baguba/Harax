# Deploying Harax on Railway — the 10-minute guide

Harax now deploys to Railway **out of the box**. The repo ships a `railway.json`, so when you connect your GitHub repo Railway does the rest automatically:

> Push to GitHub → Railway builds with `npm ci && npm run build` → on boot it starts a single-port reverse proxy that serves the Next.js site **and** the Socket.IO chat/game service together, runs `prisma db push` against the volume, and points `public/uploads` at `/data/uploads` so uploaded images survive redeploys. If the app crashes on boot, Railway restarts it automatically (up to 10 times).

That means you only click through Railway's UI, add one volume, and set one environment variable. This page is the click-by-click version of **Stage 2** in [DEPLOYMENT.md](./DEPLOYMENT.md).

## 1. Deploy in 10 minutes

1. Go to [railway.app](https://railway.app) and sign up / log in. Railway needs an **internationally-enabled card** — you start on trial credit, then it's the ~$5/month Hobby plan.
2. Click **New Project → Deploy from GitHub repo**.
3. Pick your repo: `Baguba/Harax`.
4. Railway reads `railway.json` automatically and configures itself: builder **Nixpacks**, build command `npm ci && npm run build`, and the start command that boots web + chat behind one port. **Do not add a Dockerfile** and **leave the builder as Nixpacks** — the defaults are correct.
5. The first build starts right away. While it runs, do the next two steps (volume + variables) so the very first boot already has storage.

## 2. Add the volume

The container's disk is wiped on every redeploy. A volume is what keeps the SQLite database and the uploaded images between deploys.

1. Open your Harax service → **Settings** (or the **Volumes** section in the service view) → **New Volume**.
2. Mount path: `/data`.

That's all. The database file (`/data/custom.db`) and every uploaded image (`/data/uploads`) live on that volume, so redeploys no longer erase the community.

## 3. Set environment variables

Open your service → **Variables** and add:

| Variable | Value | Required? |
|---|---|---|
| `DATABASE_URL` | `file:/data/custom.db` | **Required** — puts the database on the volume |
| `CHAT_INTERNAL_TOKEN` | leave unset — the defaults already match | Optional |
| `NEXT_PUBLIC_CHAT_URL` | leave unset — the built-in proxy handles sockets on the same domain | Optional |
| Anything else, e.g. Google OAuth client id/secret (only if you enable Google sign-in) | per that feature's setup | Optional |

After you add or change a variable, Railway redeploys the service automatically — that's normal, just wait for it to come back green.

## 4. Get your URL

1. Service → **Settings → Networking → Generate Domain**.
2. Accept the default port — Railway targets the service's exposed port automatically.
3. You now have a public HTTPS URL, e.g. `https://harax-production.up.railway.app`.

Railway health-checks `/api/games/health` automatically (it's in `railway.json`), so a green deploy means the website **and** the chat service are both alive.

## 5. First run: your account + optional super-admin

1. Open your URL and **register a normal account** through the app's sign-up form.
2. Optional — promote yourself to super-admin. Open your service's **Terminal** (service view → **Terminal** tab — it's a shell *inside* the running container) and run exactly this, replacing `you@example.com` with the e-mail you registered with:

   ```bash
   node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.update({where:{email:'you@example.com'},data:{role:'SUPERADMIN',verified:true}}).then(u=>{console.log(u.email,u.role);process.exit(0)}).catch(e=>{console.error(e.message);process.exit(1)})"
   ```

   It prints your e-mail and `SUPERADMIN` when it succeeded.

   > Why not Prisma Studio? Commands like `railway run npx prisma studio` run on **your laptop** and cannot reach the database sitting on Railway's private volume. The Terminal command above runs inside the container, right next to the data — that's the reliable way.

3. Optional — demo data (22 users, posts, events…) so the community isn't empty on day one. In the same Terminal run `npx prisma db seed`; if that errors (this repo has no `prisma.seed` entry in `package.json`), try `npx tsx prisma/seed.ts`. It also needs the dev dependencies to be present in the image, so treat seeding as a nice-to-have, not a required step.

## 6. Verify it's alive

- [ ] The landing page loads over HTTPS.
- [ ] Register and login work.
- [ ] You can create a post.
- [ ] Game Zone → start a X&O (tictactoe) match — this proves Socket.IO works through the single-port proxy.
- [ ] Upload an avatar or a post image — this proves `/data/uploads` on the volume.
- [ ] **Deploy → Redeploy**, wait for green, reload: your posts and images are still there — this proves the volume survives deploys.

## 7. Updating the app

Just `git push` to `main`. Railway redeploys automatically, `prisma db push` runs on every boot (a harmless no-op when the schema hasn't changed), and there is nothing else to do.

## 8. Backups — what's built in vs. what's manual

- **Built-in and reliable:** turn on **volume backups / snapshots** in your Railway volume settings. This is the path to trust.
- **Manual extra (optional):** the whole community is a single file, `/data/custom.db`. From the service Terminal you can try:

  ```bash
  sqlite3 /data/custom.db ".backup /data/backup-$(date +%F).db"
  ```

  Be aware: `sqlite3` may not be installed in the image — if the command isn't found, skip it and rely on the volume snapshots above.

## 9. Troubleshooting

| Symptom | Check |
|---|---|
| Build fails at `npm ci` | `package-lock.json` must be committed (it is in this repo — if you ever regenerate dependencies, make sure it's still tracked and pushed) |
| Deploy fails with a healthcheck timeout | Open **Deploy Logs** and look for errors tagged `[chat]` (chat service) or `[web]` (Next.js) |
| Site is fine but chat/games are dead | The proxy routes `/socket.io` and `?XTransformPort=3003` requests to the chat service — check the `[chat]` lines in Deploy Logs |
| Data resets after every deploy | The volume isn't mounted at `/data`, or `DATABASE_URL` isn't `file:/data/custom.db` |
| Uploads 404 after a redeploy | Same volume check as above — the symlink is recreated automatically on every boot |

Changed the proxy plumbing yourself? `node scripts/test-railway-proxy.mjs` boots the whole stack locally and runs 5 checks (web page, health endpoint, polling handshake, polling→websocket upgrade, websocket-only connect) — all 5 should pass.

## 10. What it costs

One service plus one volume comes to roughly **$5–8/month** on Railway's Hobby plan (usage-based). Current numbers live at [railway.com/pricing](https://railway.com/pricing).
