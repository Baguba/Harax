"use client";

import { motion } from "framer-motion";
import { Heart, MessageCircle, Flame, MapPin, CalendarDays, Megaphone } from "lucide-react";
import { UserAvatar } from "@/components/common/user-avatar";

/** Floating product mock cards used in the hero — pure CSS, no images. */

export function MockPostCard() {
  return (
    <motion.div
      className="glass w-64 rounded-2xl p-4 shadow-xl"
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="flex items-center gap-2.5">
        <UserAvatar user={{ name: "Selam Awoke", avatarUrl: null }} size="md" />
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">Selam Awoke</p>
          <p className="text-[10px] text-muted-foreground">Computer Science · 3rd Year</p>
        </div>
        <span className="ml-auto rounded-full bg-lemon/20 px-2 py-0.5 text-[9px] font-bold text-lime-800 dark:text-lime-300">CAMPUS</span>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-foreground/85">
        Sunset over the experimental farms today hit different 🌅 No filter, straight from the phone.
      </p>
      <div className="mt-3 h-28 rounded-xl bg-accent" />
      <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 font-semibold text-red-500 dark:bg-red-500/10">
          <Heart className="h-3 w-3 fill-red-500" /> 24
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="h-3 w-3" /> 6
        </span>
        <span className="inline-flex items-center gap-1">
          <Flame className="h-3 w-3 text-orange-500" /> 12
        </span>
        <span className="ml-auto">just now</span>
      </div>
    </motion.div>
  );
}

export function MockChatCard() {
  const bubbles = [
    { me: false, who: "NightOwl", text: "someone left a full tray of sambusa in block B…" },
    { me: true, who: null, text: "it disappeared in 4 minutes. legends 💚" },
    { me: false, who: "LekuLurker", text: "the tea today is premium ☕" },
  ];
  return (
    <motion.div
      className="glass w-60 rounded-2xl p-4 shadow-xl"
      animate={{ y: [0, 14, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
    >
      <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
        <span className="text-lg">☕</span>
        <div>
          <p className="text-xs font-semibold">Leku Tea Room</p>
          <p className="text-[9px] text-muted-foreground">Sidechat · anonymous</p>
        </div>
        <span className="ml-auto flex h-2 w-2 rounded-full bg-lemon animate-soft-pulse" />
      </div>
      <div className="mt-3 space-y-2">
        {bubbles.map((b, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 + i * 0.5 }}
            className={b.me ? "chat-me ml-auto max-w-[85%] rounded-2xl px-3 py-2 text-[10px] font-medium" : "chat-them max-w-[85%] rounded-2xl px-3 py-2 text-[10px]"}
          >
            {!b.me && <span className="mb-0.5 block text-[8px] font-bold uppercase tracking-wide text-lime-700 dark:text-lime-400">{b.who}</span>}
            {b.text}
          </motion.div>
        ))}
        <div className="flex items-center gap-1 pl-1 pt-1" aria-label="someone is typing">
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
        </div>
      </div>
    </motion.div>
  );
}

export function MockEventCard() {
  return (
    <motion.div
      className="glass w-56 rounded-2xl p-4 shadow-xl"
      animate={{ y: [0, -10, 0], rotate: [0, 1.2, 0] }}
      transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-secondary p-2 text-center text-foreground">
          <p className="font-display text-base font-bold leading-none text-ink">18</p>
          <p className="text-[8px] font-bold tracking-widest text-ink/80">OCT</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold leading-tight">Freshman Welcome Night</p>
          <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
            <MapPin className="h-3 w-3" /> Amphitheatre · 6 PM
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex -space-x-1.5">
          {["Dawit M", "Hanna G", "Tigist B"].map((n) => (
            <UserAvatar key={n} user={{ name: n, avatarUrl: null }} size="sm" className="ring-2 ring-background" />
          ))}
          <span className="inline-flex h-7 items-center rounded-full bg-muted px-2 text-[9px] font-semibold ring-2 ring-background">+118</span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-lemon px-2.5 py-1 text-[9px] font-bold text-ink">
          <CalendarDays className="h-3 w-3" /> GOING
        </span>
      </div>
    </motion.div>
  );
}

export function MockChannelToast() {
  return (
    <motion.div
      className="glass flex w-72 items-center gap-3 rounded-2xl p-3.5 shadow-xl"
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
        <Megaphone className="h-5 w-5 text-ink" />
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-[11px] font-semibold">
          Registrar Announcements
          <span className="rounded bg-lemon/25 px-1 text-[8px] font-bold text-lime-800 dark:text-lime-300">VERIFIED</span>
        </p>
        <p className="truncate text-[10px] text-muted-foreground">Add/drop deadline closes Friday 4:00 PM ⚠️</p>
      </div>
    </motion.div>
  );
}
