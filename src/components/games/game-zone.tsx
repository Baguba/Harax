"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gamepad2, Medal, Swords, TriangleAlert, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiQ } from "@/lib/client-api";
import { useGameSocket } from "@/hooks/use-game-socket";
import { PlayPanel } from "@/components/games/play-panel";
import { MatchView } from "@/components/games/match-view";
import { LeaderboardPanel } from "@/components/games/leaderboard-panel";
import { MyMatchesPanel } from "@/components/games/my-matches-panel";
import type { MyGameStats, SeasonInfo } from "@/lib/games-meta";

interface GamesHomeData {
  season: SeasonInfo;
  me: MyGameStats | null;
  history: unknown[];
}

type Tab = "play" | "ladder" | "mine";

function useCountdownChip(endsAt: string | null): string {
  const [text, setText] = useState("");
  useEffect(() => {
    if (!endsAt) return;
    const end = new Date(endsAt).getTime();
    const tick = () => {
      const s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      setText(d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    tick();
    const iv = setInterval(tick, 30_000);
    return () => clearInterval(iv);
  }, [endsAt]);
  return text;
}

export function GameZone() {
  const g = useGameSocket();
  const [tab, setTab] = useState<Tab>("play");

  const { data } = useQuery<GamesHomeData>({
    queryKey: ["games"],
    queryFn: () => apiQ<GamesHomeData>("/api/games"),
    refetchInterval: 45_000,
  });

  const season = data?.season ?? null;
  const stats = data?.me ?? null;
  const countdown = useCountdownChip(season?.endsAt ?? null);

  const inMatch = Boolean(g.match);
  const TABS: Array<{ key: Tab; label: string; icon: React.ElementType }> = [
    { key: "play", label: "Play", icon: Gamepad2 },
    { key: "ladder", label: "Leaderboard", icon: Trophy },
    { key: "mine", label: "My matches", icon: Medal },
  ];

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="sticker font-display text-4xl sm:text-5xl">GAME ZONE</h1>
          <p className="mt-1.5 text-xs font-bold text-muted-foreground">
            Play the campus. Climb the week. Take the prizes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {stats && stats.points > 0 && (
            <span className="game-chip bg-lemon px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider">
              {stats.points} pts{stats.rank ? ` · #${stats.rank}` : ""}
            </span>
          )}
          {season && (
            <span className="game-chip flex items-center gap-1.5 bg-card px-3 py-1.5 text-[11px] font-bold">
              <Swords className="h-3.5 w-3.5" /> Week {season.index} · resets in {countdown}
            </span>
          )}
        </div>
      </div>

      {/* connection / error banners */}
      <AnimatePresence>
        {g.error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="game-card flex items-center justify-between gap-2 rounded-2xl border-red-400 bg-red-50 p-3 dark:bg-red-500/10"
          >
            <p className="flex items-center gap-2 text-xs font-bold text-red-700 dark:text-red-300">
              <TriangleAlert className="h-4 w-4 shrink-0" /> {g.error}
            </p>
            <button onClick={g.clearError} className="text-[10px] font-bold uppercase tracking-wider text-red-700 underline dark:text-red-300">
              dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* tabs (hidden mid-match) */}
      {!inMatch && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-2xl border-2 px-4 py-2 text-sm font-bold transition-all",
                tab === t.key
                  ? "border-ink bg-lemon text-ink shadow-[0_3px_0_0_var(--bevel-lemon)]"
                  : "border-edge bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              aria-pressed={tab === t.key}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
      )}

      {/* body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={inMatch ? `match:${g.match?.id}` : tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {inMatch ? (
            <MatchView g={g} />
          ) : tab === "play" ? (
            <PlayPanel g={g} season={season} stats={stats} />
          ) : tab === "ladder" ? (
            <LeaderboardPanel seasonIndex={season?.index ?? 1} />
          ) : (
            <MyMatchesPanel />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
