"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiQ, timeAgo } from "@/lib/client-api";
import type { SideRoomDTO } from "@/lib/types";
import { useAppStore } from "@/store/app-store";
import { useChat } from "@/hooks/use-chat";
import { ChatRoom } from "@/components/groups/group-detail";
import { EmptyState } from "@/components/common/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Ghost, MessageCircle, Flame, ChevronLeft, ChevronRight, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function SideChatView() {
  const user = useAppStore((s) => s.user);
  const goBack = useAppStore((s) => s.goBack);
  const [activeRoom, setActiveRoom] = useState<SideRoomDTO | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["sidechat"],
    queryFn: () => apiQ<{ rooms: SideRoomDTO[]; me: { id: string; name: string } | null }>("/api/sidechat"),
  });
  const rooms = data?.rooms ?? [];

  const chat = useChat("SIDECHAT", activeRoom?.id ?? null);

  // ── room view ────────────────────────────────────────────
  if (activeRoom) {
    return (
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-forest p-5 text-lemon-soft">
          <button onClick={() => setActiveRoom(null)} className="absolute left-3 top-3 rounded-xl p-2 text-lemon-soft/70 transition hover:bg-white/10 hover:text-white" aria-label="All rooms">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="relative flex items-center gap-3.5">
            <span className="text-5xl">{activeRoom.emoji}</span>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold text-white">{activeRoom.name}</h1>
              <p className="text-xs text-lemon-soft/70">
                {activeRoom.messageCount} messages
                {chat.online > 0 && <span className="text-lime-300"> · {chat.online} ghosts online</span>}
              </p>
            </div>
            <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-lemon/30 bg-lemon/10 px-3 py-1.5 text-[10px] font-bold text-lime-300 sm:flex">
              <Ghost className="h-3.5 w-3.5" /> You appear as an alias
            </span>
          </div>
        </div>

        {!user && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            Sign in to join the conversation — your identity stays hidden behind your room alias either way.
          </div>
        )}

        <ChatRoom
          chat={chat}
          canChat={Boolean(user)}
          title={activeRoom.name}
          anonymous
        />
      </div>
    );
  }

  // ── rooms grid ───────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-forest p-6 text-lemon-soft">
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-lemon/30 bg-lemon/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-lime-300">
            <Ghost className="h-3 w-3" /> Anonymous · No names · Just vibes
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold text-white">
            Sidechat — the fun zone 😈
          </h1>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-lemon-soft/70">
            Campus tea, memes, confessions and crush radar. You get a random alias per room —
            gossip responsibly and keep it kind. Harax house rules still apply.
          </p>
        </div>
      </div>

      {/* rooms */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}</div>
      ) : rooms.length === 0 ? (
        <EmptyState emoji="👻" title="No sidechat rooms yet" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <AnimatePresence>
            {rooms.map((r, i) => (
              <motion.button
                key={r.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => setActiveRoom(r)}
                className="card-lift group relative overflow-hidden rounded-3xl border bg-card p-5 text-left"
              >
                {r.lastHourActive && (
                  <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-lemon/20 px-2 py-0.5 text-[9px] font-bold text-lime-800 dark:text-lime-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lemon" /> LIVE
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-forest text-3xl transition-transform group-hover:scale-110 group-hover:rotate-6">
                    {r.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-base font-bold">{r.name}</h3>
                    <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{r.description}</p>
                  </div>
                </div>
                {r.lastMessage && (
                  <div className="mt-3.5 flex items-center gap-2 rounded-2xl bg-muted/50 px-3 py-2">
                    <MessageCircle className="h-3.5 w-3.5 shrink-0 text-lime-600" />
                    <p className="truncate text-[11px] text-muted-foreground">
                      <span className="font-semibold text-lime-700 dark:text-lime-400">{r.lastMessage.anonName ?? "anon"}:</span>{" "}
                      {r.lastMessage.content}
                    </p>
                    <span className="ml-auto shrink-0 text-[9px]">{timeAgo(r.lastMessage.createdAt)}</span>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-3 text-[10px] font-semibold text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {r.messageCount} messages</span>
                  {r.lastHourActive && <span className="inline-flex items-center gap-1 text-lime-700 dark:text-lime-400"><Flame className="h-3 w-3" /> popping now</span>}
                  <span className="ml-auto inline-flex items-center gap-1 font-bold text-lime-700 transition-transform group-hover:translate-x-0.5 dark:text-lime-400">
                    <ChevronRight className="h-3 w-3" /> Enter
                  </span>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      <p className="rounded-2xl border border-dashed border-border/70 p-3.5 text-center text-[10px] leading-relaxed text-muted-foreground">
        Sidechat is anonymous but not lawless — harassment and hate speech are reported
        straight to the moderation queue. Keep the tea light 💚
      </p>
    </div>
  );
}
