# Harax Project Worklog

---
Task ID: 1
Agent: main-agent (Super Z)
Task: Build "Harax" — a full community platform for Haramaya University (Ethiopia): Facebook-style feed, events, Telegram-style groups, admin broadcast channels, anonymous sidechat rooms, role-based auth with Google sign-in, admin/superadmin tooling, cinematic lemon-green design, production-grade security. Web + Android + iOS via responsive PWA.

Work Log:
- Initialized fullstack environment (Next.js 16 + TS + Tailwind 4 + shadcn/ui + Prisma/SQLite).
- Designed full Prisma schema (User/Session/Post/Comment/Like/Event/Rsvp/Group/GroupMember/Channel/ChannelSubscriber/SideRoom/Message/Notification/Report) and pushed to SQLite.
- Built security core: bcrypt(12) password hashing, HTTP-only cookie sessions with sha256-hashed tokens, timing-safe compares, in-memory sliding-window rate limiter, Zod validation on every endpoint, role-based access control (STUDENT/LECTURER/ADMIN/SUPERADMIN).
- Created 16 REST API route groups: auth (register/login/logout/me/google demo), posts (feed/trending/CRUD), reactions, comments, events + RSVP, groups + members + add-by-email, channels + subscribe, sidechat rooms, notifications, users/profile, search, upload (image/video with type+size limits), admin stats/users/reports, reports.
- Built real-time chat mini-service (socket.io :3003) with session-cookie auth, room membership checks, per-socket rate limits, presence, typing indicators, anonymous alias generation for sidechat rooms. Connects through Caddy gateway via `io("/?XTransformPort=3003")`.
- Seeded rich Haramaya data: 22 users (Ethiopian names, 4 roles), 5 channels, 6 groups, 5 sidechat rooms, 8 events, 29 posts, comments/likes/messages/notifications/moderation reports.
- Designed "Harax" brand system: white + lemon green (#a3e635) + deep forest-ink palette, Space Grotesk + Inter typography, custom SVG logo/PWA icons, deterministic SVG avatar + OG cover art generators (zero external image deps).
- Cinematic frontend: canvas aurora particle field (DPR-aware, reduced-motion support), film grain, marquee ticker, glassmorphism, framer-motion page transitions, confetti on RSVP.
- Built SPA at `/` (single user-visible route): landing page, auth modal (login/register/Google account sheet/1-click demo role logins), app shell (desktop sidebar + right rail + mobile bottom nav/FAB), feed (composer with photo/video upload + emoji bar, 5-reaction posts, threaded comments), events (filters, detail dialog, RSVP), groups (Telegram-style chat + posts + members + add by email), channels (subscribe, broadcast composer for owners/admins), sidechat (anonymous rooms), notifications, profiles (edit dialog), admin dashboard (14-day activity chart, user role/verify/ban management, moderation queue).
- PWA: manifest + maskable icons + theme colors; responsive mobile-first layouts; dark mode via next-themes.
- Fixed during verification: queryFn envelope unwrapping (added apiQ helper), socket client path option, JSX parse errors, setState-in-effect lint rules, a11y DialogTitle warnings.
- Browser-verified end-to-end via agent-browser (through the gateway at :81): landing, login (demo chip), registration, Google sign-in, posting, reactions, comments, events + RSVP + confetti, group chat real-time round-trip, sidechat anonymous rooms, channels, notifications, profile, admin users + moderation, search, dark mode, mobile viewport, image upload API.
- Cleaned test artifacts from DB; restarted dev server after a hang; final state: 0 console errors, lint clean.

Stage Summary:
- Deliverable: fully functional Harax platform at `/` (preview panel), chat service on :3003, SQLite seeded with realistic Haramaya community data.
- Demo logins (password `harax2026`): selam.awoke@gmail.com (Student) · dr.meron@haramaya.edu.et (Lecturer) · registrar@haramaya.edu.et (Admin) · ict.office@haramaya.edu.et (Super Admin) — also 1-click chips in the sign-in modal.
- Google sign-in runs in demo mode (sandbox has no OAuth callback); server-side flow is OAuth-ready.
- Key files: prisma/schema.prisma, prisma/seed.ts, src/lib/{auth,rate-limit,validation,art,posts}.ts, src/app/api/**, mini-services/chat-service/index.ts, src/components/{landing,auth,shell,feed,events,groups,channels,sidechat,notifications,profile,admin,canvas,common}/**.

---
Task ID: 2
Agent: main-agent (Super Z)
Task: Fix "signed in but can't send message" reliability bug, remove all gradients & decorative icons (Zap/Sparkles/lightning emoji), design a new casual hand-made logo, and package the project as a zip with npm instructions.

Work Log:
- **Messaging reliability fix (root cause of "can't send")**: sending previously rode ONLY on the socket.io connection (gateway path `/?XTransformPort=3003`); any socket failure silently swallowed the composer text. Rewrote the stack:
  - Chat mini-service converted to plain Node JS (`mini-services/chat-service/index.js`, no build step, runs under bun AND node) with CORS `origin:true, credentials:true` for local cross-port cookie auth.
  - New loopback-only control endpoint on 127.0.0.1:3011 (`/health` + token-gated `/internal/broadcast`) so REST-created messages broadcast to socket peers in real time.
  - New REST write paths: `POST /api/groups/[id]/messages`, `GET/POST /api/sidechat/[id]/messages` (zod-validated, rate-limited 8/10s, anon aliases computed server-side — algorithm kept in sync with the service).
  - `use-chat.ts` rewritten: REST history on room open, sends ALWAYS over REST, socket for live updates/typing/presence, 3s polling fallback while socket is down, merge-by-id message state, smart socket URL (gateway path hosted / direct `host:3003` + withCredentials on localhost / NEXT_PUBLIC_CHAT_URL override).
  - ChatRoom composer: async send with sending-state spinner, error toast + input preserved on failure, new "Join <group> to chat" CTA for public groups instead of a dead disabled composer.
  - `scripts/dev.mjs` + `scripts/start.mjs` orchestrators: one command runs web (:3000) + chat (:3003/:3011), health-probes and reuses an already-running chat service, graceful EADDRINUSE handling. package.json: `dev`/`start` via orchestrators, `build` = plain `next build`, `postinstall` = prisma generate. next.config: dropped `output: standalone`.
  - `.env` switched to portable relative `DATABASE_URL=file:../db/custom.db` (verified working in sandbox).
- **De-gradient sweep**: removed `.text-lemon-gradient`, `.glow-lemon`, `.grain`, conic story-ring, gradient chat bubble, shimmer sweep, pulse-glow from globals.css; replaced ~30 gradient class usages across 18 components with flat solids (bg-card / bg-forest / bg-secondary / bg-accent / bg-primary); deleted the AuroraField canvas component and all imports; flat deterministic avatar fallback palette (user-avatar) + flat solid profile covers; art.ts avatar/OG generators rewritten flat (no linearGradient/radialGradient, no grain filter, mini bubble mark in OG).
- **Icon cleanup**: removed every Zap (old logo mark, verified badges→BadgeCheck, admin stats→Activity/Flame), Sparkles (chips, "Enter"→ChevronRight, headings→Newspaper/Info/Users), all ⚡ emoji from UI copy, toasts, API messages, seed data + live DB.
- **New logo**: hand-drawn wobbly speech bubble with lowercase "h" pen-stroke and a sprouting leaf (Haramaya agriculture nod), tilted -4°, ink outline + lemon fill — as inline SVG component (`harax-logo.tsx`, lowercase "harax" wordmark) and public/icon.svg, icon-maskable.svg (safe-zone squircle), logo.svg. Verified visually via VLM screenshots.
- **Packaging**: `download/harax.zip` (301KB, 215 files) — full source + pre-seeded SQLite db + README with npm instructions (Node 20+, npm install, npm run dev, demo accounts, scripts table, chat architecture explanation, troubleshooting). **Verified by extracting and running the zip with real npm**: install (583 pkgs incl. prisma generate postinstall), npm run dev, login, feed, REST message send all working on a clean copy.
- Restarted services with new dev script; browser-verified via agent-browser: login, group join CTA, group message send, anonymous sidechat send (TeaSpiller 77), socket presence ("1 ghosts online"), dark mode, mobile 390x844, landing page. lint clean, dev.log error-free.

Stage Summary:
- Messaging is now failure-proof: REST writes + socket real-time + polling fallback; works in sandbox (gateway) and locally (npm).
- Design is flat white + lemon green, zero gradients, no lightning/sparkle clutter, new casual doodle logo everywhere (UI + PWA icons + OG art).
- Deliverable: `/home/z/my-project/download/harax.zip` + run instructions in `download/README.md` and inside the zip.
- Dev script now: `bun run dev` (sandbox) / `npm run dev` (zip) → orchestrator (web :3000 + chat :3003, control :3011). Demo logins unchanged (password `harax2026`).

---
Task ID: 3
Agent: main-agent (Super Z)
Task: Add profile photo upload + banner photo upload to the profile page.

Work Log:
- Audit: backend already fully supported avatar/cover uploads (`POST /api/upload` purposes avatar/cover with magic-byte sniffing + size caps; `profileSchema` accepts avatarUrl/coverUrl; Prisma User has both fields) — only the frontend upload UI and image-rendering of banners were missing.
- Rewrote `src/components/profile/profile-view.tsx`:
  - Camera badge button overlaid on the avatar (own profile only) → instant upload + PATCH + query invalidation + app-store `setUser` (avatar updates everywhere in the shell instantly, survives reload via `/api/auth/me`).
  - "Add banner photo" / "Change banner" pill on the cover strip → instant upload + save.
  - Banner now renders uploaded images (`object-cover` <img>) vs flat colors (style background) via `isImageRef()`.
  - Edit dialog: avatar "Change photo"/"Remove photo" row with live preview; Banner section = 5 flat color tiles + dashed upload tile + image preview with X-remove; uploads in dialog save on "Save changes".
  - Housekeeping: replaced/removed uploaded files are deleted via `DELETE /api/upload` (header flow forgets the previous file; dialog tracks `fresh` session uploads and deletes them on cancel, and deletes abandoned originals on save).
- Browser-verified end-to-end as Selam (student): header avatar upload ("Looking sharp" toast, DB updated, shell avatar live), header banner upload ("Banner updated" toast, button flips to "Change banner"), dialog remove-photo→save (avatarUrl null), dialog cancel after upload (orphan file deleted from public/uploads), dialog remove-banner→save (banner file deleted, coverUrl falls back to #a3e635). VLM screenshot verification of rendered photos. 0 console/page errors. tsc + eslint clean for the file.
- Restored demo DB state (Selam's original generated avatar, no cover) and removed test upload files; `public/uploads` now only holds the file referenced by a seeded post.
- README.md (root + inside zip): added "Profile photos & banners" section documenting both flows, formats/limits and cleanup behavior.
- Repackaged `download/harax.zip` (223 files): full source incl. new profile-view, pristine pre-seeded db/custom.db, empty public/uploads/, updated README; excluded test screenshots (shot-*.png / final-*.png) that had leaked into scripts/. Zip integrity + DB state verified by extraction.

Stage Summary:
- Users can now upload a profile photo (camera badge on avatar) and a banner photo ("Add banner photo" / Edit profile dialog) — instant save, flat-color fallback, automatic orphan cleanup.
- Deliverable refreshed: `/home/z/my-project/download/harax.zip` (+ `download/README.md` pointer updated).

---
Task ID: 4
Agent: main-agent (Super Z)
Task: Blend the user's two campus photos into the landing page atmospherically — the Haramaya main-gate photo at the top (hero) and the aerial campus photo around the last CTA section.

Work Log:
- Analyzed both uploads with VLM: "ChatGPT Image Sep 13" = Haramaya University main entrance gate (1448x1086) → hero; "2hara.png" = aerial view of campus housing (1676x938) → bottom CTA.
- Optimized via scripts/make-atmo-images.py (PIL): gentle desaturation + brightness lift, downscaled, WebP q~55-58 → gate.webp 140KB (1100w), campus-aerial.webp 170KB (1280w) in public/img/landing/.
- globals.css: new "atmospheric photo backdrops" layer — `.atmo` (absolute, pointer-events-none), `.atmo-img` (object-cover, blur 2px, opacity .26 light / .34 + darker filter in dark mode), `.atmo-mask-soft` (radial alpha mask, photo breathes in the middle and melts at edges), `.atmo-mask-horizon` (linear alpha mask, strongest low, dissolves upward AND at the bottom edge — no hard cuts against the ticker). Masks are alpha-only; flat-color design language intact.
- landing.tsx: gate photo as hero backdrop (objectPosition 50% 62%, horizon mask) behind the z-10 content; aerial photo as backdrop of the final CTA section (soft mask, lazy) with the lemon card floating at z-10; added pt-10 to the CTA section so the photo has breathing room around the card.
- Debugged a stale dev-server CSS watcher (served old opacity values after edits — touch didn't help) → restarted the orchestrator (scripts/dev.mjs) and confirmed fresh CSS served.
- Verified with VLM across 6 screenshots: hero light/dark, CTA light/dark, mobile 390x844 hero+CTA — photo visible and blending smoothly, text readable, no layout issues, 0 console/page errors. Dark mode required boosting (.34 opacity / brightness .88) after first attempt was invisible.
- Preserved the user's own uploaded profile photo + banner (ict.office account) and the post-referenced upload in the zip — checked all /uploads references in DB before packaging.
- Repacked download/harax.zip (230 files): new landing + globals.css + both WebP images + all DB-referenced uploads; README updated ("atmospheric photos of the Haramaya campus").

Stage Summary:
- Landing hero now carries the Haramaya gate photo and the final CTA section the aerial campus view, both dissolved into the background (blurred, masked, low opacity, dark-mode aware).
- Deliverable refreshed: /home/z/my-project/download/harax.zip.
