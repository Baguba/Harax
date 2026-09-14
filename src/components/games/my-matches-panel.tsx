"use client";

import { Bot, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiQ, timeAgo } from "@/lib/client-api";
import { useAppStore } from "@/store/app-store";
import { UserAvatar } from "@/components/common/user-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { GAMES, resultCopy, type HistoryRow, type MyGameStats, type SeasonInfo } from "@/lib/games-meta";

interface GamesHomeData {
  season: SeasonInfo;
  me: MyGameStats | null;
  history: HistoryRow[];
}

function OutcomeChip({ row, myId }: { row: HistoryRow; myId: string | null }) {
  if (row.status !== "FINISHED") {
    return (
      <span className="rounded-lg border-2 border-edge bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {row.status === "ACTIVE" ? "live" : "open"}
      </span>
    );
  }
  if (row.reason === "ABORTED") {
    return (
      <span className="rounded-lg border-2 border-edge bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        void
      </span>
    );
  }
  const won = row.winnerId === myId;
  const draw = !row.winnerId && row.reason !== "TIMEOUT";
  return (
    <span
      className={cn(
        "rounded-lg border-2 border-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        won ? "bg-lemon text-ink" : draw ? "bg-lemon-soft text-ink" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
      )}
    >
      {won ? "win" : draw ? "draw" : "loss"}
    </span>
  );
}

export function MyMatchesPanel() {
  const me = useAppStore((s) => s.user);
  const { data, isLoading } = useQuery<GamesHomeData>({
    queryKey: ["games"],
    queryFn: () => apiQ<GamesHomeData>("/api/games"),
    refetchInterval: 45_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="game-card h-24 animate-pulse rounded-3xl" />
        <div className="game-card h-64 animate-pulse rounded-3xl" />
      </div>
    );
  }

  const stats = data?.me;
  const history = data?.history ?? [];

  return (
    <div className="space-y-5">
      {/* my week */}
      <section className="game-card rounded-3xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-bold">My week {data ? data.season.index : ""}</h3>
          {stats?.rank && (
            <span className="game-chip bg-lemon px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider">Rank #{stats.rank}</span>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { label: "Points", value: stats?.points ?? 0, lemon: true },
            { label: "Wins", value: stats?.wins ?? 0 },
            { label: "Draws", value: stats?.draws ?? 0 },
            { label: "Losses", value: stats?.losses ?? 0 },
          ].map((s) => (
            <div key={s.label} className="game-inset p-3 text-center">
              <p className={cn("font-display text-2xl font-bold tabular-nums", s.lemon && "text-lime-700 dark:text-lime-300")}>{s.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* history */}
      <section className="game-card overflow-hidden rounded-3xl">
        <div className="flex items-center gap-2 px-4 pt-4">
          <Swords className="h-5 w-5" />
          <h3 className="font-display text-lg font-bold">Match history</h3>
        </div>
        {history.length === 0 ? (
          <div className="p-4">
            <EmptyState
              emoji="🎮"
              title="No matches yet"
              description="Your games show up here with the tea — who you played, who won, why."
            />
          </div>
        ) : (
          <ul className="mt-3 divide-y-2 divide-edge/60">
            {history.map((row) => (
              <li key={row.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-[74px] shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {GAMES[row.game as keyof typeof GAMES]?.name ?? row.game}
                </span>
                {row.vsBot ? (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-lemon">
                    <Bot className="h-4 w-4" />
                  </span>
                ) : (
                  <UserAvatar user={row.opponent ?? { name: "?", avatarUrl: null }} size="sm" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold leading-tight">
                    {row.vsBot ? "Harax Bot" : row.opponent?.name ?? "Waiting for player…"}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground leading-tight">
                    {row.status === "FINISHED"
                      ? resultCopy(row.reason) || "finished"
                      : row.status === "ACTIVE" ? "still going" : "open table"}
                    {" · "}
                    {timeAgo(row.endedAt ?? row.createdAt)} ago
                  </p>
                </div>
                {row.vsBot && (
                  <span className="hidden shrink-0 rounded-lg border-2 border-edge bg-card px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:inline">
                    practice
                  </span>
                )}
                <OutcomeChip row={row} myId={me?.id ?? null} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
