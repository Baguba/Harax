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
