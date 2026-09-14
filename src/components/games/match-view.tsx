"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Flag, Handshake, LogOut, RefreshCw, Send, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { UserAvatar } from "@/components/common/user-avatar";
import { Button } from "@/components/ui/button";
import { ConfettiBurst } from "@/components/common/confetti";
import { CheckersBoard, ChessBoard, TicTacToeBoard } from "@/components/games/boards";
import type { useGameSocket, GameChatMsg } from "@/hooks/use-game-socket";
import {
  GAMES, otherColor, resultCopy, squareName,
  type GameUserDTO, type MatchDTO,
} from "@/lib/games-meta";

type Game = ReturnType<typeof useGameSocket>;

/* ── countdown ─────────────────────────────────────────────── */

function useCountdown(deadline: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  if (!deadline) return null;
  return Math.max(0, Math.round((new Date(deadline).getTime() - now) / 1000));
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/* ── player bar ────────────────────────────────────────────── */

function PlayerBar({
  user, label, isTurn, isMe, seconds, offline,
}: {
  user: GameUserDTO | null; label: string; isTurn: boolean; isMe: boolean;
  seconds: number | null; offline: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-2xl border-2 px-3 py-2 transition-all",
        isTurn
          ? "border-ink bg-lemon-soft/70 shadow-[0_3px_0_0_var(--bevel-lemon)]"
          : "border-edge bg-card"
      )}
    >
      {user?.id === "bot" ? (
        <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-lemon">
          <Bot className="h-5 w-5" />
        </span>
      ) : (
        <UserAvatar user={user ?? { name: "…", avatarUrl: null }} size="sm" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold leading-tight">
          {user?.name ?? "Waiting…"} {isMe && <span className="text-[10px] font-bold text-muted-foreground">(you)</span>}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-tight">
          {offline ? "left the board" : label}
        </p>
      </div>
      {isTurn && seconds !== null && (
        <span
          className={cn(
            "game-chip px-2.5 py-1 font-display text-sm font-bold tabular-nums",
            seconds <= 15 ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" : "bg-card text-foreground"
          )}
        >
          {mmss(seconds)}
        </span>
      )}
      {isTurn && seconds === null && (
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-ink" />
      )}
    </div>
  );
}

/* ── in-match chat ─────────────────────────────────────────── */

function MatchChat({
  chat, myId, onSend,
}: {
  chat: GameChatMsg[]; myId: string; onSend: (t: string) => void;
}) {
  const [text, setText] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length]);

  return (
    <div className="game-card flex h-full min-h-0 flex-col rounded-2xl p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Table talk</p>
      <div ref={scroller} className="nice-scrollbar min-h-[80px] flex-1 space-y-1.5 overflow-y-auto pr-1">
        {chat.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">Talk your talk — it stays at this table.</p>
        )}
        {chat.map((m) => (
          <div key={m.id} className={cn("flex flex-col", m.userId === myId ? "items-end" : "items-start")}>
            <span className={cn(
              "max-w-[85%] rounded-xl border-2 px-2.5 py-1 text-xs font-semibold",
              m.userId === myId ? "chat-me" : "chat-them"
            )}>
              {m.text}
            </span>
          </div>
        ))}
      </div>
      <form
        className="mt-2 flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onSend(text);
          setText("");
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          placeholder="Say something…"
          className="h-9 min-w-0 flex-1 rounded-xl border-2 border-input bg-card px-3 text-xs font-semibold shadow-[0_2px_0_0_var(--edge-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Table talk message"
        />
        <Button type="submit" size="icon" className="h-9 w-9 shrink-0 rounded-xl" aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

/* ── move list ─────────────────────────────────────────────── */

function MoveStrip({ match }: { match: MatchDTO }) {
  const moves = match.state.moves ?? [];
  const recent = moves.slice(-6);
  return (
    <div className="game-inset flex flex-wrap items-center gap-1.5 p-2.5">
      <span className="mr-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Moves</span>
      {recent.length === 0 && <span className="text-xs text-muted-foreground">nothing yet</span>}
      {recent.map((m, i) => (
        <span
          key={i}
          className={cn(
            "rounded-lg border-2 px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
            i === recent.length - 1 ? "border-ink bg-lemon text-ink" : "border-edge bg-card text-muted-foreground"
          )}
        >
          {match.game === "CHESS"
            ? m.castle === "k" ? "0-0" : m.castle === "q" ? "0-0-0" : `${squareName(m.from)}${m.capture ? "×" : "–"}${squareName(m.to)}${m.promo ? `=${m.promo.toUpperCase()}` : ""}`
            : `${squareName(m.from)}${m.jump != null ? "×" : "–"}${squareName(m.to)}`}
        </span>
      ))}
      {moves.length > 6 && <span className="text-[10px] font-bold text-muted-foreground">+{moves.length - 6}</span>}
    </div>
  );
}

/* ── result overlay ────────────────────────────────────────── */

function ResultOverlay({
  match, myId, ended, onRematch, onExit, busy,
}: {
  match: MatchDTO; myId: string | null;
  ended: { result: { winnerId: string | null; reason: string | null; isDraw: boolean }; myDelta: number } | null;
  onRematch: () => void; onExit: () => void; busy: boolean;
}) {
  const iWon = ended ? ended.result.winnerId === myId : match.result?.winnerId === myId;
  const isDraw = ended ? ended.result.isDraw : match.result?.isDraw;
  const reason = ended?.result.reason ?? match.result?.reason;
  const delta = ended?.myDelta ?? 0;
  // fire the confetti once per finished match — derived, no effect needed
  const confetti = iWon ? 1 + (match.state.moves?.length ?? 0) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-ink/70 p-4 backdrop-blur-sm"
    >
      <ConfettiBurst trigger={confetti} />
      <motion.div
        initial={{ scale: 0.7, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 21 }}
        className="game-card relative w-full max-w-xs rounded-3xl p-6 text-center"
      >
        <span className={cn(
          "mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-ink",
          iWon ? "bg-lemon" : isDraw ? "bg-lemon-soft" : "bg-red-100 dark:bg-red-500/20"
        )}>
          <Trophy className={cn("h-7 w-7", iWon ? "text-ink" : isDraw ? "text-ink" : "text-red-600 dark:text-red-300")} />
        </span>
        <h3 className="sticker-ink font-display text-3xl">
          {iWon ? "YOU WIN!" : isDraw ? "DRAW" : "YOU LOST"}
        </h3>
        <p className="mt-2 text-xs font-bold text-muted-foreground">
          {resultCopy(reason) || "match finished"}
        </p>
        {match.vsBot ? (
          <p className="mt-2 text-[11px] font-bold text-muted-foreground">Practice match — no weekly points</p>
        ) : (
          <p className={cn(
            "game-chip mx-auto mt-3 w-fit px-3 py-1.5 font-display text-sm font-bold",
            delta > 0 ? "bg-lemon text-ink" : delta === 0 ? "bg-card" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
          )}>
            {delta > 0 ? `+${delta}` : delta} pts this week
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2">
          <Button onClick={onRematch} disabled={busy} className="text-game-caps">
            <RefreshCw className="h-4 w-4" /> {match.vsBot ? "Play again" : "Rematch"}
          </Button>
          <Button onClick={onExit} variant="ink" className="text-game-caps">
            <LogOut className="h-4 w-4" /> Back to Game Zone
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── the match view ────────────────────────────────────────── */

export function MatchView({ g }: { g: Game }) {
  const me = useAppStore((s) => s.user);
  const { match, chat, ended, drawOfferBy, rematchAskedBy, opponentOffline } = g;
  const [confirmLeave, setConfirmLeave] = useState(false);
  const seconds = useCountdown(match?.moveDeadline ?? null);

  const myTurn = useMemo(
    () => Boolean(match && match.myColor && match.turn === match.myColor && match.status === "ACTIVE"),
    [match]
  );
  const isSpectator = !match?.myColor;
  const opponentUser = useMemo(() => {
    if (!match) return null;
    if (match.vsBot) return { id: "bot", name: "Harax Bot", avatarUrl: null, role: "BOT" };
    const iAmHost = me && match.host?.id === me.id;
    return iAmHost ? match.guest : match.host;
  }, [match, me]);

  // opponent ran out of time? ask the server to seal it (server double-checks)
  useEffect(() => {
    if (!match || match.status !== "ACTIVE" || seconds === null) return;
    if (seconds === 0 && match.turn !== match.myColor && match.myColor) {
      g.claimTimeout();
    }
  }, [seconds, match, g]);

  // winner line for tic-tac-toe
  const winLine = useMemo(() => {
    if (!match || match.game !== "TICTACTOE" || match.status !== "FINISHED") return null;
    const b = match.state.board as (string | null)[];
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    return lines.find((l) => b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) ?? null;
  }, [match]);

  if (!match) return null;
  const meta = GAMES[match.game];

  const doResign = async () => {
    const okExit = window.confirm("Resign this match? It counts as a loss.");
    if (!okExit) return;
    g.resign();
  };

  const doLeave = () => {
    if (match.status === "ACTIVE" && match.myColor && !confirmLeave) {
      setConfirmLeave(true);
      setTimeout(() => setConfirmLeave(false), 3500);
      return;
    }
    g.leaveMatch();
  };

  return (
    <div className="relative">
      {/* header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ink" size="sm" onClick={doLeave} className="rounded-xl">
            <LogOut className="h-4 w-4" /> Leave
          </Button>
          <h2 className="sticker font-display text-2xl">{meta.name}</h2>
          {match.vsBot && <span className="game-chip bg-lemon px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">Practice</span>}
          {isSpectator && <span className="game-chip px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">Watching</span>}
        </div>
        <span className="game-chip bg-card px-3 py-1.5 text-[11px] font-bold">
          Win <span className="text-lime-700 dark:text-lime-300">+{meta.winPts}</span> · Draw +{meta.drawPts} · Loss +{meta.lossPts}
        </span>
      </div>

      {confirmLeave && match.status === "ACTIVE" && (
        <div className="game-card mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border-red-400 bg-red-50 p-3 dark:bg-red-500/10">
          <p className="text-xs font-bold text-red-700 dark:text-red-300">
            Leave now? You have 2 minutes to come back before you forfeit.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={() => g.leaveMatch()}>Yes, leave</Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmLeave(false)}>Keep playing</Button>
          </div>
        </div>
      )}

      {drawOfferBy && drawOfferBy !== me?.id && (
        <div className="game-card mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-lemon-soft/70 p-3">
          <p className="text-xs font-bold">Your opponent offers a draw.</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={g.acceptDraw}><Handshake className="h-4 w-4" /> Accept</Button>
            <Button size="sm" variant="outline" onClick={g.declineDraw}>Decline</Button>
          </div>
        </div>
      )}

      {rematchAskedBy && rematchAskedBy !== me?.id && match.status === "FINISHED" && (
        <div className="game-card mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-lemon-soft/70 p-3">
          <p className="text-xs font-bold">They want a rematch!</p>
          <Button size="sm" onClick={g.rematch} disabled={g.busy}><RefreshCw className="h-4 w-4" /> Accept rematch</Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* board column */}
        <div className="mx-auto w-full max-w-[560px] space-y-3">
          <PlayerBar
            user={opponentUser}
            label={`plays ${match.vsBot ? "the bot side" : otherColor(match.myColor ?? match.hostColor)}`}
            isTurn={match.status === "ACTIVE" && match.turn !== match.myColor}
            isMe={false}
            seconds={match.status === "ACTIVE" && match.turn !== match.myColor ? seconds : null}
            offline={opponentOffline && !match.vsBot}
          />

          <div className="relative">
            {match.game === "TICTACTOE" && (
              <TicTacToeBoard
                board={match.state.board as (string | null)[]}
                canMove={myTurn}
                onMove={(to) => g.move({ to })}
                lastMove={(match.state.lastMove as number | null) ?? null}
                winLine={winLine}
              />
            )}
            {match.game === "CHECKERS" && (
              <CheckersBoard
                board={match.state.board as ({ s: string; k: boolean } | null)[]}
                chain={match.state.chain ?? null}
                legalMoves={myTurn ? match.legalMoves : []}
                myColor={match.myColor ?? match.hostColor}
                canMove={myTurn}
                onMove={(m) => g.move(m)}
                lastMove={match.state.lastMove as { from: number; to: number } | null}
              />
            )}
            {match.game === "CHESS" && (
              <ChessBoard
                board={match.state.board as ({ t: string; c: string } | null)[]}
                legalMoves={myTurn ? match.legalMoves : []}
                myColor={match.myColor ?? "w"}
                canMove={myTurn}
                onMove={(m) => g.move(m)}
                lastMove={match.state.lastMove as { from: number; to: number } | null}
                check={match.check}
                turn={match.turn}
              />
            )}

            {match.status === "WAITING" && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-xl bg-ink/60 p-6 backdrop-blur-sm">
                <motion.span
                  className="h-10 w-10 rounded-full border-4 border-lemon border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                />
                <p className="sticker-ink font-display text-2xl">Waiting for a challenger…</p>
                <p className="max-w-[240px] text-center text-xs font-bold text-white/80">
                  Your table is live in the Game Zone lobby — anyone can sit down.
                </p>
                <Button variant="ink" size="sm" onClick={g.cancelTable}>Close the table</Button>
              </div>
            )}

            {match.status === "FINISHED" && me && (
              <ResultOverlay
                match={match}
                myId={me.id}
                ended={ended}
                onRematch={g.rematch}
                onExit={g.leaveMatch}
                busy={g.busy}
              />
            )}
          </div>

          <PlayerBar
            user={me ? { id: me.id, name: me.name, avatarUrl: me.avatarUrl, role: me.role } : null}
            label={`plays ${match.myColor ?? match.hostColor}`}
            isTurn={myTurn}
            isMe
            seconds={myTurn ? seconds : null}
            offline={false}
          />

          {match.game !== "TICTACTOE" && <MoveStrip match={match} />}

          {/* status + actions */}
          <div className="game-inset flex flex-wrap items-center justify-between gap-2 p-3">
            <p className="text-xs font-bold">
              {match.status === "ACTIVE" && (myTurn ? (
                <span className="text-lime-700 dark:text-lime-300">Your move{seconds !== null ? ` — ${mmss(seconds)} left` : ""}</span>
              ) : isSpectator ? (
                <span className="text-muted-foreground">Spectating — moves show up live</span>
              ) : (
                <span className="text-muted-foreground">Waiting for {opponentUser?.name ?? "opponent"}…</span>
              ))}
              {match.status === "ACTIVE" && match.check && <span className="ml-2 text-red-600 dark:text-red-300">CHECK!</span>}
              {match.status === "WAITING" && <span className="text-muted-foreground">Table open in the lobby</span>}
              {match.status === "FINISHED" && <span className="text-muted-foreground">Match over — {resultCopy(match.result?.reason)}</span>}
            </p>
            {match.status === "ACTIVE" && !isSpectator && (
              <div className="flex gap-2">
                {!match.vsBot && !drawOfferBy && (
                  <Button size="sm" variant="outline" onClick={g.offerDraw} className="rounded-xl">
                    <Handshake className="h-4 w-4" /> Draw
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={doResign} className="rounded-xl">
                  <Flag className="h-4 w-4" /> Resign
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* side column: chat */}
        <div className="hidden h-[520px] lg:block">
          <MatchChat chat={chat} myId={me?.id ?? ""} onSend={g.sendChat} />
        </div>
      </div>
    </div>
  );
}
