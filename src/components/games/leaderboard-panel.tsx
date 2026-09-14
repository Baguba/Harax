"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiQ } from "@/lib/client-api";
import { UserAvatar } from "@/components/common/user-avatar";
import { EmptyState } from "@/components/common/empty-state";
import type { LeaderRow, PastSeason, SeasonInfo } from "@/lib/games-meta";

interface LeaderboardData {
  season: SeasonInfo;
  leaders: LeaderRow[];
  pastSeasons: PastSeason[];
}

function useCountdownText(endsAt: string): string {
  const [text, setText] = useState("");
  useEffect(() => {
    const end = new Date(endsAt).getTime();
    const tick = () => {
      const s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      setText(d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    tick();
    const iv = setInterval(tick, 30_000);
    return () => clearInterval(iv);
  }, [endsAt]);
  return text;
}

const MEDAL_STYLE: Record<number, { chip: string; ring: string; icon: string; label: string }> = {
  1: { chip: "bg-lemon text-ink", ring: "border-ink shadow-[0_5px_0_0_var(--bevel-lemon)]", icon: "text-ink", label: "CHAMPION" },
  2: { chip: "bg-[#e2e8f0] text-ink", ring: "border-edge", icon: "text-[#5b6b7c]", label: "2ND PLACE" },
  3: { chip: "bg-[#f3d2a4] text-ink", ring: "border-edge", icon: "text-[#8a5a2b]", label: "3RD PLACE" },
};

const WEEKLY_PRIZES = [
  { rank: 1, label: "Gold champion trophy + 500 ETB campus voucher", emoji: "🏆" },
  { rank: 2, label: "Silver trophy + 300 ETB campus voucher", emoji: "🥈" },
  { rank: 3, label: "Bronze trophy + 150 ETB campus voucher", emoji: "🥉" },
];

const dateRange = (a: string, b: string) => {
  const f = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${f(a)} – ${f(b)}`;
};

export function LeaderboardPanel({ seasonIndex }: { seasonIndex: number }) {
  const { data, isLoading } = useQuery<LeaderboardData>({
    queryKey: ["games-leaderboard"],
    queryFn: () => apiQ<LeaderboardData>("/api/games/leaderboard"),
    refetchInterval: 60_000,
  });

  const countdown = useCountdownText(data?.season.endsAt ?? new Date(Date.now() + 6048e5).toISOString());
  const leaders = data?.leaders ?? [];
  const podium = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  return (
    <div className="space-y-5">
      {/* reset banner */}
      <div className="game-card flex flex-wrap items-center justify-between gap-2 rounded-3xl p-4">
        <div>
          <h3 className="font-display text-lg font-bold">Week {data?.season.index ?? seasonIndex} ladder</h3>
          <p className="text-xs font-bold text-muted-foreground">
            {data ? dateRange(data.season.startsAt, data.season.endsAt) : "loading…"}
          </p>
        </div>
        <span className="game-chip bg-lemon px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider">
          Resets in {countdown}
        </span>
      </div>

      {isLoading && (
        <div className="game-card grid animate-pulse gap-3 rounded-3xl p-6 sm:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="game-inset h-36" />)}
        </div>
      )}

      {!isLoading && leaders.length === 0 && (
        <EmptyState
          emoji="🎯"
          title="No points on the board yet"
          description="This week is wide open. Win a match and your name becomes the first on the ladder."
        />
      )}

      {/* podium */}
      {podium.length > 0 && (
        <div className="grid items-end gap-3 sm:grid-cols-3">
          {[podium[1], podium[0], podium[2]].filter(Boolean).map((row, i) => {
            const style = MEDAL_STYLE[row.rank] ?? MEDAL_STYLE[3];
            const prize = WEEKLY_PRIZES.find((p) => p.rank === row.rank);
            const elevated = row.rank === 1;
            return (
              <motion.div
                key={row.user.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={cn(
                  "game-card rounded-3xl p-4 text-center",
                  elevated && "sm:-mt-4 sm:pb-6",
                  row.isMe && "ring-4 ring-lemon/60"
                )}
              >
                <div className={cn("mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border-2", style.chip)}>
                  <Trophy className="h-6 w-6" />
                </div>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{style.label}</p>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <UserAvatar user={row.user} size="sm" />
                  <p className="max-w-[120px] truncate text-sm font-bold leading-tight">{row.user.name}</p>
                </div>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums">{row.points}<span className="ml-1 text-xs">pts</span></p>
                <p className="text-[10px] font-bold text-muted-foreground">{row.wins}W · {row.draws}D · {row.losses}L</p>
                {prize && (
                  <p className="game-inset mt-2.5 p-2 text-[10px] font-bold leading-snug">
                    {prize.emoji} {prize.label}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* full ladder */}
      {rest.length > 0 && (
        <section className="game-card overflow-hidden rounded-3xl">
          <ul className="divide-y-2 divide-edge/60">
            {rest.map((row) => (
              <li key={row.user.id} className={cn("flex items-center gap-3 px-4 py-2.5", row.isMe && "bg-lemon-soft/50")}>
                <span className="w-8 text-center font-display text-base font-bold tabular-nums text-muted-foreground">{row.rank}</span>
                <UserAvatar user={row.user} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold leading-tight">
                    {row.user.name} {row.isMe && <span className="text-[10px] font-bold text-muted-foreground">(you)</span>}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground leading-tight">{row.wins}W · {row.draws}D · {row.losses}L</p>
                </div>
                <span className="font-display text-lg font-bold tabular-nums">{row.points}<span className="ml-1 text-[10px] text-muted-foreground">pts</span></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* past seasons */}
      {data && data.pastSeasons.length > 0 && (
        <section className="game-card rounded-3xl p-4">
          <h3 className="font-display text-lg font-bold">Hall of fame</h3>
          <p className="mb-3 text-xs font-semibold text-muted-foreground">Champions of finished weeks.</p>
          <ul className="space-y-2">
            {data.pastSeasons.map((s) => (
              <li key={s.index} className="game-inset p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Week {s.index} · {dateRange(s.startsAt, s.endsAt)}
                </p>
                <div className="space-y-1.5">
                  {s.winners.length === 0 && <p className="text-xs font-semibold text-muted-foreground">No players scored that week.</p>}
                  {s.winners.map((w) => (
                    <div key={w.user.id} className="flex items-center gap-2.5">
                      <span className="font-display text-sm font-bold tabular-nums text-muted-foreground">#{w.rank}</span>
                      <UserAvatar user={w.user} size="sm" />
                      <p className="min-w-0 flex-1 truncate text-sm font-bold">{w.user.name}</p>
                      <span className="hidden truncate text-[10px] font-bold text-muted-foreground sm:block">{w.prize}</span>
                      <span className="font-display text-sm font-bold tabular-nums">{w.points}pts</span>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
