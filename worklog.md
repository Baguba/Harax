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

---
Task ID: 5
Agent: main-agent (Super Z)
Task: Rework the landing photo treatment — user found the faint-blur background "very common AI slop"; wanted the photos much more visible with a different, designer-y style.

Work Log:
- Replaced the blur-melt treatment with a screen-print poster style in globals.css:
  - `.atmo-img` now fully opaque and crisp (no blur; saturate .92 / contrast 1.03; dark: brightness .94 saturate .8) — the photo reads as an actual photo.
  - Blending is done by a flat wash of the page background color laid over the photo (`.atmo::after`, 36% light / 52% dark; `.atmo-strong` 48%/62% for the hero where the headline sits directly on the photo) — like a print layer, harmonizes the photo with the flat white/lemon palette.
  - Masks reduced to edge-only fades: `.atmo-mask-horizon` fades just the top under the fixed nav + slight bottom edge; `.atmo-mask-soft` fades only extreme corners — the photos are essentially full-bleed.
- landing.tsx: hero atmo layer gets `atmo-strong`; CTA keeps standard wash; comments updated.
- Restarted the dev orchestrator (CSS watcher stale again) and confirmed the served CSS chunk contains the new rules.
- VLM-verified 5 screenshots: light hero + CTA ("clearly visible", "deliberate designer poster treatment, not generic AI background", text fully readable), dark hero + CTA (moody poster, readable), mobile 390x844 hero. 0 console errors.
- Repacked download/harax.zip with the updated globals.css + landing.tsx.

Stage Summary:
- Landing photos are now crisp and clearly visible behind a flat color wash (screen-print poster look) instead of the faint blurred wash — light, dark and mobile verified.
- Deliverable refreshed: /home/z/my-project/download/harax.zip.

---
Task ID: 6
Agent: main-agent (Super Z)
Task: Add a log out option on top of the profile page (user request: "add log out option on top of my profile").

Work Log:
- Audit: logout existed only as a tiny icon button in the desktop Sidebar (Topbar received onLogout but never rendered it); on mobile there was NO logout anywhere — the sidebar is lg-only and MobileNav has no logout.
- `src/components/profile/profile-view.tsx`: own-profile header now shows a **Log out** pill next to *Edit profile* (absolute top-right of the banner, both in a flex gap group): glass style like its neighbor, red text (red-600 / dark red-300), LogOut icon, spinner while busy; gated behind `profile.isMe`.
- Handler reuses `logoutFlow()` from app-chrome (POST /api/auth/logout + "Signed out" toast) then `setUser(null)` + `qc.clear()` — same flow as the sidebar, wrapped in try/finally.
- Browser-verified end-to-end (agent-browser): button present on own profile, absent on other users' profiles (Dr. Meron — no Log out/Edit/Add banner); clicking it shows the toast, returns to the landing page, and `/api/auth/me` returns `user: null` (server session truly ended); desktop 1280×800 light + dark, mobile 390×844 (95px + 117px pills, fit cleanly); VLM verified the design in all three (red Log out + dark Edit profile, no overlap, readable on dark glass); 0 console errors; tsc + eslint clean for the file.
- Debugged a headless-screenshot trap worth remembering: after framer-motion view transitions the captured frame can freeze (content stuck at opacity 0 mid-animation). Fixes that worked: real viewport resize (`agent-browser set viewport <w> <h>`), page reload, or injecting `main *{opacity:1!important;transform:none!important}` before the shot; DOM rect checks stay reliable throughout.
- New reusable packaging script `scripts/package-zip.sh` (rsync stage → prune scripts → restore ONLY DB-referenced uploads via Python sqlite3 (sqlite3 CLI is NOT installed in this sandbox — a bash sqlite3 call silently kept zero uploads; caught and fixed) → zip → `unzip -t`).
- README: documented the profile Log out button; repacked `download/harax.zip` (234 files, 1.1M) with the new profile-view, README, and all 3 DB-referenced uploads (seeded post image + ict.office avatar/banner).

Stage Summary:
- Every user can now log out from the top of their own profile on any screen size; session ends server-side.
- Deliverable refreshed: /home/z/my-project/download/harax.zip.

---
Task ID: 7
Agent: main-agent (Super Z)
Task: Total visual overhaul inspired by a user-supplied Supercell-style game-UI screenshot — "change the writing, graphics, style, font and other things… apply to the entire project".

Work Log:
- Analyzed the inspiration image with VLM (full + quarter crops): Supercell/Brawl-Stars settings screen — chunky rounded typography, sticker text (white fill + fat ink stroke + hard offset shadow), pill buttons with ink borders + 3D bevel edges, thick-outlined cards on a light-gray tray, speech-bubble mascot, playful imperative copy.
- Strategy: keep the Harax lemon/ink brand + flat no-gradient language (user's earlier standing rule), translate the game STYLE into it (lemon + ink is naturally Brawl-Stars-like).
- Fonts (layout.tsx): Inter/Space Grotesk → **Baloo 2** (display, chunky rounded) + **Nunito** (body); body base weight 600. PWA theme colors + manifest background updated to the new tray color.
- globals.css "Harax Arcade" system: new tokens (--edge/--edge-soft card outline+shadow, --bevel-lemon/--bevel-red button bevels, tray bg #edf1e4 light / #0a120a dark, destructive #e63946), .sticker / .sticker-ink / .sticker-lemon headings (paint-order stroke fill), .game-card / .game-inset / .game-chip, .speech-bubble (with tail, dark-mode lemon variant), chunky outlined .chat-me/.chat-them, thicker .glass, bolder .nav-sweep. Atmo photo system untouched.
- UI primitives: button.tsx rewritten (ink borders + bevel shadow, active:translate-y press-in, caps-friendly, new ink variant, icon-sm size), input/textarea/select-trigger (2px ink border, rounded-xl, bevel shadow, semibold), dialog (2px edge border + hard shadow), badge (pill + border + caps), tabs (lemon active pill).
- Systematic sweep script (scripts/game-style-sweep.py): 94 class replacements across 19 files (cards → game-card, hairline dividers → 2px edge, chips → game-chip, small semibold → bold).
- Per-view detailing: landing (sticker hero on the gate photo, caps CTAs, mascot speech bubbles "yo, I'm the Harax leaf 🌿" / "no cap, just campus", game-chip section labels, sticker stats band, outlined feature icons, thicker ticker), hero-mocks, auth modal (game inputs, lemon active tabs, chunky demo chips, caps submits), app shell (solid chunky sidebar with lemon-pill active nav, bordered topbar, pill-highlight mobile tab bar, bevel FAB), feed (game header/tabs, composer "Post it" caps + flex-wrap fix for mobile overflow found in testing, outlined reaction picker), events (game-chip category filters, ink/lemon timeframe toggle, game-inset detail tiles, caps RSVP), groups (lemon tab pills, emoji picker tiles), channels (subscribe states), sidechat (outlined emoji tiles, LIVE badge), notifications (lemon unread cards), profile (game-inset stat tiles, bevel camera badges, ink-bordered cover tiles), admin (ink-bordered forest header, chart tooltip), right-rail (outlined date tiles), role badges (solid fills + ink borders + bevel), user-avatar (ink outline), empty states (dashed game-card).
- Copy sweep: playful game voice ("What's good on campus today?", "Here's what's popping around Haramaya today.", "Post it", caps buttons: CREATE ACCOUNT / TRY THE DEMO / NEW POST / PUBLISH EVENT / SIGN IN TO HARAX).
- Fixed mobile composer overflow (docW 404→390) via flex-wrap + full-width submit on <sm.
- Restarted the dev orchestrator after font/CSS changes (watcher staleness) — Baloo_2/Nunito woff2 confirmed served.
- Verified via agent-browser + VLM: landing light/dark/mobile (sticker headline crisp on photo, chunky CTAs — "strongly mimics Brawl Stars/Supercell"), auth modal, feed light + dark (cards outlined, lemon pill sidebar), mobile feed (FAB + tab pills; pill styles confirmed via computed styles after VLM misread), events/sidechat/profile/group-chat composites, Google sheet, chat bubble borders via DOM. 0 console errors, 0 new tsc errors (same 10 pre-existing), eslint exit 0.
- Fixed a real packaging bug found during repack: /tmp wipe + old rsync nesting created public/img/img/ and dropped public root files (icons/manifest/robots) from the zip — package-zip.sh now rsyncs the whole public/ (minus uploads). Zip verified: img/landing at correct path, icons, manifest, robots, 3 DB-referenced uploads, 220 files.
- README: described the chunky game-UI style + fonts.

Stage Summary:
- Harax is now a full game-UI experience: Baloo 2 sticker typography, fat ink outlines, bevel buttons that press in, speech-bubble mascot, playful campus copy — consistent across landing, auth, shell, feed, events, groups, channels, sidechat, notifications, profile, admin, light/dark/mobile.
- Deliverable refreshed: /home/z/my-project/download/harax.zip (220 files, fonts load via next/font at build time — internet needed on first run, same as npm install).
