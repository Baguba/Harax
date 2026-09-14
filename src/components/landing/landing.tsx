"use client";

import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, MessageCircle, Megaphone, ShieldCheck, Users, Newspaper, Ghost, Gamepad2, Lock, Check } from "lucide-react";
import { HaraxLogo, HaraxMark } from "@/components/common/harax-logo";
import { ScrollReveal, StaggerGroup, StaggerItem } from "@/components/common/scroll-reveal";
import { MockPostCard, MockChatCard, MockEventCard, MockChannelToast } from "@/components/landing/hero-mocks";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";

const TICKER = [
  "Registrar: add/drop closes Friday ⚠️",
  "Freshman Welcome Night — Sat 6PM 🎉",
  "Football final: CS vs Agriculture ⚽",
  "Hack Haramaya: 48h, 15K ETB prize 💻",
  "Culture Day: wear your habesha kemis 🎭",
  "Blood drive near main gate 🩸",
  "Meme Factory is popping tonight 😂",
  "Poetry night under the acacia tree 🎤",
  "Game Zone: weekly top 3 win prizes 🏆",
];

const FEATURES = [
  {
    icon: Newspaper,
    title: "Campus Feed",
    desc: "A living newspaper of Haramaya — posts, photos and short videos from students, lecturers and offices. React, comment, watch the campus come alive in real time.",
  },
  {
    icon: CalendarDays,
    title: "Events Hub",
    desc: "Welcome nights, hackathons, football finals and career fairs. Discover what's popping, RSVP in one tap and see who else is rolling through.",
  },
  {
    icon: Users,
    title: "Telegram-style Groups",
    desc: "Class squads, study circles and clubs with real-time chat. Authenticated members create groups, add students and keep the conversation rolling 24/7.",
  },
  {
    icon: Megaphone,
    title: "Official Channels",
    desc: "One-to-many broadcasts from the registrar, student union and departments. Subscribe, get pinged, never miss a deadline again. Zero excuses.",
  },
  {
    icon: Ghost,
    title: "Sidechat Rooms",
    desc: "The fun zone — anonymous rooms for campus tea, memes and confessions. Zero names, zero pressure, maximum vibes. Enter if you dare.",
  },
  {
    icon: Gamepad2,
    title: "Game Zone",
    desc: "X & O, checkers and chess against anyone on campus — live, in the browser. Stack points all week, climb the leaderboard, and the top 3 every Monday take home trophies + prizes.",
  },
  {
    icon: ShieldCheck,
    title: "Bank-grade Safety",
    desc: "Role-based access, bcrypt-hashed passwords, rate limiting, moderation tools and superadmin controls. Fun on the surface, serious underneath.",
  },
];

const ROLE_CARDS = [
  {
    emoji: "🎓",
    title: "Students",
    points: ["Post, react and comment on campus life", "Join class groups & sidechat rooms", "RSVP events & follow official channels", "Build a profile with your media"],
  },
  {
    emoji: "👩‍🏫",
    title: "Lecturers",
    points: ["Broadcast course announcements", "Create department channels", "Moderate your own groups", "Verified lecturer badge"],
  },
  {
    emoji: "🛡️",
    title: "Admins & Super Admins",
    points: ["Campus-wide broadcast channel", "User & content moderation dashboard", "Role management and verification", "Full activity analytics"],
  },
];

const TESTIMONIALS = [
  { quote: "Finally, one app for everything campus. The sidechat rooms are unhinged (affectionate).", name: "Hanna G.", role: "Medicine · 4th Year" },
  { quote: "I posted one meme in the group chat and now 60 people know my name. Worth it.", name: "Naol G.", role: "Computer Science" },
  { quote: "The registrar channel alone saved me from missing two deadlines. This app pays for itself.", name: "Tigist B.", role: "Business Mgmt" },
  { quote: "My students actually read my announcements now. Sorcery.", name: "Dr. Meron T.", role: "Lecturer, CS" },
];

export function Landing() {
  const openAuth = useAppStore((s) => s.openAuth);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-background">
      {/* ── NAV ─────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-40 border-b-2 border-edge bg-card/95 backdrop-blur-sm">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <HaraxLogo size={36} />
          <div className="hidden items-center gap-7 text-sm font-bold text-muted-foreground md:flex">
            <a href="#features" className="nav-sweep transition-colors hover:text-foreground">Features</a>
            <a href="#roles" className="nav-sweep transition-colors hover:text-foreground">For everyone</a>
            <a href="#safety" className="nav-sweep transition-colors hover:text-foreground">Safety</a>
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="outline" onClick={() => openAuth("login")} className="text-game-caps">
              Sign in
            </Button>
            <Button
              onClick={() => openAuth("register")}
              className="text-game-caps"
            >
              Join Harax
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      </header>

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="relative flex min-h-[105svh] flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-16 text-center">
        {/* Haramaya main gate — screen-print poster backdrop, crisp and present */}
        <div className="atmo atmo-strong" aria-hidden="true">
          <img
            src="/img/landing/gate.webp"
            alt=""
            className="atmo-img atmo-mask-horizon"
            style={{ objectPosition: "50% 62%" }}
          />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mx-auto max-w-4xl"
        >
          <div className="game-chip mx-auto mb-6 inline-flex items-center gap-2 bg-card px-4 py-1.5 text-xs font-bold text-lime-800 dark:text-lime-300">
            🌱 Built for Haramaya University · Ethiopia
          </div>
          <h1 className="font-display text-[clamp(2.8rem,8vw,5.6rem)] font-extrabold leading-[1.04]">
            <span className="sticker">Your campus,</span>
            <br />
            <span className="sticker-lemon">connected.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-xl rounded-2xl bg-card/85 px-5 py-3 text-balance text-base font-bold leading-relaxed text-foreground/85 backdrop-blur-sm sm:text-lg">
            Harax is the community platform of Haramaya University — posts, events, groups,
            official channels and the legendary sidechat rooms. One home for 30,000+ students,
            lecturers and administrators.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              onClick={() => openAuth("register")}
              className="h-13 px-9 text-base text-game-caps"
            >
              Create account
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => openAuth("login")}
              className="h-13 bg-card px-9 text-base text-game-caps"
            >
              Try the demo
            </Button>
          </div>
          <p className="mt-5 text-xs font-bold text-ink/60 dark:text-foreground/60">
            Free for the Haramaya community · Web · Android · iOS (PWA)
          </p>

          {/* mascot speech bubble — the doodle leaf says hi */}
          <div className="speech-bubble mx-auto mt-9 hidden max-w-sm px-5 py-3 text-sm font-bold sm:block">
            yo, I&apos;m the Harax leaf 🌿 press that button and let&apos;s gooo
          </div>
        </motion.div>

        {/* floating mock cards */}
        <div className="pointer-events-none absolute inset-0 z-[5] hidden lg:block" aria-hidden="true">
          <div className="absolute left-[4%] top-[18%] rotate-[-6deg]"><MockPostCard /></div>
          <div className="absolute right-[4%] top-[16%] rotate-[5deg]"><MockChatCard /></div>
          <div className="absolute left-[7%] bottom-[14%] rotate-[3deg]"><MockEventCard /></div>
          <div className="absolute right-[8%] bottom-[20%] rotate-[-3deg]"><MockChannelToast /></div>
        </div>
      </section>

      {/* ── TICKER ──────────────────────────────────────── */}
      <section className="relative border-y-2 border-ink bg-ink py-3.5 text-lemon-soft dark:border-edge dark:bg-forest/40" aria-label="Campus updates ticker">
        <div className="flex overflow-hidden">
          <div className="animate-marquee flex shrink-0 items-center gap-10 pr-10 font-display text-sm font-bold uppercase tracking-wide">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="flex items-center gap-3 whitespace-nowrap">
                <span className="h-2 w-2 rounded-full bg-lemon" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────── */}
      <section id="features" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <p className="game-chip inline-block bg-ink px-4 py-1.5 font-display text-xs font-bold uppercase tracking-[0.2em] text-lemon dark:bg-lemon dark:text-ink">Everything campus</p>
          <h2 className="sticker-ink mt-5 font-display text-4xl font-extrabold sm:text-5xl">
            One platform. Every corner of Haramaya.
          </h2>
          <p className="mt-4 font-semibold text-muted-foreground">
            Facebook-style feed, Telegram-style groups, official channels and anonymous sidechat —
            designed with students, for students.
          </p>
        </ScrollReveal>

        <StaggerGroup className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <StaggerItem key={f.title}>
              <div className="card-lift game-card group relative h-full rounded-3xl p-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-ink bg-lemon shadow-[0_4px_0_0_var(--bevel-lemon)] transition-transform group-hover:-rotate-6 group-hover:scale-110">
                  <f.icon className="h-7 w-7 text-ink" />
                </div>
                <h3 className="mt-5 font-display text-xl font-extrabold">{f.title}</h3>
                <p className="mt-2.5 text-sm font-bold leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      {/* ── STATS BAND ──────────────────────────────────── */}
      <section className="relative overflow-hidden border-y-2 border-ink bg-ink py-20 dark:border-edge" aria-label="Harax in numbers">
        <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-2 gap-10 px-4 text-center sm:grid-cols-4 sm:px-6">
          {[
            { n: "30K+", l: "Community members" },
            { n: "500+", l: "Groups & clubs" },
            { n: "120+", l: "Yearly events" },
            { n: "24/7", l: "Sidechat energy" },
          ].map((s, i) => (
            <ScrollReveal key={s.l} delay={i * 0.08}>
              <p className="sticker-lemon font-display text-5xl font-extrabold sm:text-6xl">{s.n}</p>
              <p className="mt-3 text-sm font-bold text-lemon-soft/80">{s.l}</p>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── ROLES ───────────────────────────────────────── */}
      <section id="roles" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <p className="game-chip inline-block bg-ink px-4 py-1.5 font-display text-xs font-bold uppercase tracking-[0.2em] text-lemon dark:bg-lemon dark:text-ink">For everyone</p>
          <h2 className="sticker-ink mt-5 font-display text-4xl font-extrabold sm:text-5xl">Built for the whole campus family</h2>
        </ScrollReveal>
        <StaggerGroup className="mt-14 grid gap-6 md:grid-cols-3">
          {ROLE_CARDS.map((r) => (
            <StaggerItem key={r.title}>
              <div className="card-lift game-card h-full rounded-3xl p-7">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-edge bg-secondary text-3xl">{r.emoji}</span>
                <h3 className="mt-4 font-display text-2xl font-extrabold">{r.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {r.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm font-bold text-muted-foreground">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-lemon">
                        <Check className="h-3 w-3 text-ink" strokeWidth={3.5} />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <p className="game-chip inline-block bg-ink px-4 py-1.5 font-display text-xs font-bold uppercase tracking-[0.2em] text-lemon dark:bg-lemon dark:text-ink">Campus voices</p>
          <h2 className="sticker-ink mt-5 font-display text-4xl font-extrabold sm:text-5xl">Already feeling like home</h2>
        </ScrollReveal>
        <StaggerGroup className="mt-14 grid gap-6 sm:grid-cols-2">
          {TESTIMONIALS.map((t) => (
            <StaggerItem key={t.name}>
              <figure className="card-lift game-card h-full rounded-3xl p-7">
                <div className="flex gap-1 text-lg text-lemon drop-shadow-[0_2px_0_rgba(12,17,11,0.35)]" aria-label="5 star rating">
                  {"★★★★★".split("").map((s, i) => <span key={i}>{s}</span>)}
                </div>
                <blockquote className="mt-4 font-display text-lg font-bold leading-snug">“{t.quote}”</blockquote>
                <figcaption className="mt-4 text-sm font-bold text-muted-foreground">
                  {t.name} · <span className="font-semibold">{t.role}</span>
                </figcaption>
              </figure>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      {/* ── SAFETY ──────────────────────────────────────── */}
      <section id="safety" className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="game-card relative overflow-hidden rounded-[2.5rem] bg-forest p-8 text-foreground-invert sm:p-14">
          <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="game-chip inline-flex items-center gap-2 bg-lemon px-4 py-1.5 text-xs font-bold text-ink">
                <Lock className="h-3.5 w-3.5" /> Serious security
              </div>
              <h2 className="mt-5 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
                <span className="sticker">Fun on the surface.</span>
                <br />
                <span className="sticker-lemon">Fortified underneath.</span>
              </h2>
              <p className="mt-5 max-w-lg rounded-2xl bg-ink/45 p-4 font-semibold leading-relaxed text-lemon-soft/85">
                Harax is engineered like production infrastructure, not a weekend project. Every
                account, post and message passes through layered defenses.
              </p>
            </div>
            <ul className="space-y-3">
              {[
                "Bcrypt password hashing (12 rounds)",
                "HTTP-only session cookies + server-side sessions",
                "Rate limiting on every sensitive endpoint",
                "Role-based access control on the server, always",
                "Report & moderation queue with admin tooling",
                "Zod-validated inputs — no raw data touches the DB",
              ].map((s) => (
                <li key={s} className="flex items-center gap-3 rounded-2xl border-2 border-lemon/25 bg-ink/55 px-4 py-3 text-sm font-bold text-lemon-soft/95">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-lemon">
                    <ShieldCheck className="h-4 w-4 text-ink" strokeWidth={2.5} />
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6">
        {/* Haramaya from above — atmospheric backdrop around the final card */}
        <div className="atmo" aria-hidden="true">
          <img
            src="/img/landing/campus-aerial.webp"
            alt=""
            className="atmo-img atmo-mask-soft"
            loading="lazy"
          />
        </div>
        <ScrollReveal>
          <div className="relative z-10 overflow-hidden rounded-[2.5rem] border-2 border-ink bg-primary p-10 text-center text-primary-foreground shadow-[0_8px_0_0_var(--bevel-lemon)] sm:p-16">
            <MessageCircle className="absolute left-10 top-10 h-10 w-10 opacity-25" aria-hidden="true" />
            <CalendarDays className="absolute bottom-10 right-12 h-12 w-12 opacity-25" aria-hidden="true" />
            <h2 className="relative font-display text-4xl font-extrabold leading-tight text-ink sm:text-5xl">
              The campus is already here.
              <br />
              Are you?
            </h2>
            <p className="relative mx-auto mt-5 max-w-lg rounded-2xl bg-card/70 p-4 font-bold text-ink/75">
              Join with Google or email in under a minute. Your first post, group and sidechat
              confession await.
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                variant="ink"
                onClick={() => openAuth("register")}
                className="h-13 px-10 text-base text-game-caps"
              >
                Start on Harax
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
            <div className="speech-bubble relative mx-auto mt-10 hidden max-w-xs px-5 py-3 text-sm font-bold sm:block">
                no cap, just campus 🌿 see you inside
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className="mt-auto border-t-2 border-edge bg-card">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-10 sm:flex-row sm:px-6">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <HaraxLogo size={30} />
            <p className="text-xs font-bold text-muted-foreground">
              Haramaya University · Ethiopia · Community platform
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm font-bold text-muted-foreground">
            <a href="#features" className="nav-sweep hover:text-foreground">Features</a>
            <a href="#safety" className="nav-sweep hover:text-foreground">Safety</a>
            <span className="flex items-center gap-1.5">
              <HaraxMark size={18} /> © 2026
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
