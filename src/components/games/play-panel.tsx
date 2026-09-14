"use client";

import { motion } from "framer-motion";
import { Bot, CircleDot, Swords, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { UserAvatar } from "@/components/common/user-avatar";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/client-api";
import { GAME_LIST, GAMES, type GameKey, type LobbyRow, type MyGameStats, type SeasonInfo } from "@/lib/games-meta";
import type { useGameSocket } from "@/hooks/use-game-socket";

type Game = ReturnType<typeof useGameSocket>;

/** Small inline board preview for each game card — hand-drawn feel, no images. */
function GameThumb({ game }: { game: GameKey }) {
  if (game === "TICTACTOE") {
    return (
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
        <rect x="26" y="6" width="6" height="52" rx="3" fill="var(--edge)" />
        <rect x="42" y="6" width="6" height="52" rx="3" fill="var(--edge)" opacity="0.5" />
        <rect x="6" y="26" width="52" height="6" rx="3" fill="var(--edge)" />
        <rect x="6" y="42" width="52" height="6" rx="3" fill="var(--edge)" opacity="0.5" />
        <path d="M9 9 L21 21" stroke="#d92b3a" strokeWidth="5" strokeLinecap="round" />
        <path d="M21 9 L9 21" stroke="#d92b3a" strokeWidth="5" strokeLinecap="round" />
        <circle cx="36" cy="36" r="7" fill="none" stroke="#5d8f0a" strokeWidth="5" />
      </svg>
    );
  }
  if (game === "CHECKERS") {
    return (
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => (
            <rect
              key={`${r}-${c}`}
              x={6 + c * 17.3}
              y={6 + r * 17.3}
              width="17.3"
              height="17.3"
              fill={(r + c) % 2 ? "var(--edge)" : "var(--lemon-soft)"}
              opacity={(r + c) % 2 ? 0.85 : 0.7}
            />
          ))
        )}
        <circle cx="32" cy="23.6" r="6" fill="#d92b3a" stroke="var(--ink)" strokeWidth="2" />
        <circle cx="49.4" cy="41" r="6" fill="#23301b" stroke="var(--ink)" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
      {[0, 1, 2, 3].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={6 + c * 13}
            y={6 + r * 13}
            width="13"
            height="13"
            fill={(r + c) % 2 ? "var(--edge)" : "var(--lemon-soft)"}
            opacity={(r + c) % 2 ? 0.85 : 0.7}
          />
        ))
      )}
      <text x="12.5" y="17" fontSize="11" className="chess-piece chess-piece-w">♞</text>
      <text x="38.5" y="30" fontSize="11" className="chess-piece chess-piece-b">♜</text>
      <text x="25.5" y="43" fontSize="11" className="chess-piece chess-piece-w">♟</text>
      <text x="51.5" y="56" fontSize="11" className="chess-piece chess-piece-b">♛</text>
    </svg>
  );
}

export function PlayPanel({
  g, season, stats,
}: {
  g: Game; season: SeasonInfo | null; stats: MyGameStats | null;
}) {
  const me = useAppStore((s) => s.user);

  return (
    <div className="space-y-5">
      {/* game cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {GAME_LIST.map((game, i) => (
          <motion.div
            key={game.key}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="game-card card-lift flex flex-col rounded-3xl p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="h-16 w-16 shrink-0 rounded-2xl border-2 border-edge bg-lemon-soft/60 p-1.5">
                <GameThumb game={game.key} />
              </div>
              <span className="game-chip bg-lemon px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                WIN +{game.winPts} PTS
              </span>
            </div>
            <h3 className="mt-3 font-display text-xl font-bold leading-tight">{game.name}</h3>
            <p className="text-[11px] font-bold uppercase tracking-wider text-lime-700 dark:text-lime-300">{game.tag}</p>
            <p className="mt-1.5 flex-1 text-xs font-semibold leading-relaxed text-muted-foreground">{game.blurb}</p>
            <div className="mt-3 flex gap-2">
              <Button
                onClick={() => g.quickMatch(game.key)}
                disabled={g.busy || !g.connected}
                className="flex-1 text-game-caps"
                title={g.connected ? undefined : "Waits for the real-time game service — see the status banner above"}
              >
                <Swords className="h-4 w-4" /> Find opponent
              </Button>
              <Button
                onClick={() => g.playBot(game.key)}
                disabled={g.busy || !g.connected}
                variant="outline"
                className="text-game-caps"
                title={g.connected ? "Practice vs the house bot — no weekly points" : "Waits for the real-time game service — see the status banner above"}
              >
                <Bot className="h-4 w-4" /> Bot
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* open tables */}
      <section className="game-card rounded-3xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold">
            <Users className="h-5 w-5" /> Open tables
          </h3>
          <span
            className={cn(
              "game-chip flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
              !g.connected && "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
            )}
          >
            <CircleDot className={cn("h-3 w-3", g.connected ? "text-lime-600" : "animate-pulse text-amber-500")} />
            {g.connected ? "live" : "connecting…"}
          </span>
        </div>

        {g.lobby.length === 0 ? (
          <div className="game-inset p-5 text-center">
            <p className="text-sm font-bold">No tables right now.</p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              Hit <span className="text-lime-700 dark:text-lime-300">Find opponent</span> on a game above — your table appears here for everyone to join.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {g.lobby.map((t: LobbyRow) => {
              const mine = me && t.host?.id === me.id;
              return (
                <li key={t.id} className="game-inset flex items-center gap-3 p-2.5">
                  <UserAvatar user={t.host ?? { name: "?", avatarUrl: null }} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold leading-tight">
                      {t.host?.name ?? "Someone"}{mine ? " (you)" : ""}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-tight">
                      {GAMES[t.game]?.name ?? t.game} · opened {timeAgo(t.createdAt)} ago
                    </p>
                  </div>
                  {mine ? (
                    <Button size="sm" variant="outline" onClick={g.cancelTable} className="rounded-xl">Close</Button>
                  ) : (
                    <Button size="sm" onClick={() => g.joinTable(t.id)} disabled={g.busy} className="rounded-xl text-game-caps">
                      Sit down
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* how the week works */}
      <section className="game-card rounded-3xl p-4">
        <h3 className="font-display text-lg font-bold">How the week works</h3>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          {[
            { n: "1", title: "Play & score", body: `Beat real people to climb. Wins pay best — X&O +6, checkers +12, chess +15.` },
            { n: "2", title: "Race to Monday", body: "The ladder resets every Monday 00:00 (EAT). Points evaporate — glory doesn't." },
            { n: "3", title: "Top 3 take prizes", body: "Monday rollover awards trophies + campus vouchers to the week's top 3." },
          ].map((s) => (
            <div key={s.n} className="game-inset p-3">
              <span className="game-chip mb-2 flex h-7 w-7 items-center justify-center bg-lemon font-display text-sm font-bold">{s.n}</span>
              <p className="text-sm font-bold">{s.title}</p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
        {stats && stats.played > 0 && season && (
          <p className="mt-3 text-[11px] font-bold text-muted-foreground">
            You this week: <span className="text-foreground">{stats.points} pts</span> · {stats.wins}W {stats.draws}D {stats.losses}L{stats.rank ? ` · rank #${stats.rank}` : ""}
          </p>
        )}
      </section>
    </div>
  );
}
