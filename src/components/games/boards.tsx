"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHESS_GLYPH, type LegalMove } from "@/lib/games-meta";

/* ════════════════════════════════════════════════════════════
   Shared helpers
   ════════════════════════════════════════════════════════════ */

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const sqName = (i: number) => `${FILES[i % 8]}${8 - Math.floor(i / 8)}`;

/** 8x8 board frame with theme-aware edge */
function BoardFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative w-full select-none overflow-hidden rounded-xl border-[3px] border-edge shadow-[0_6px_0_0_var(--edge-soft)]",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Tic-Tac-Toe
   ════════════════════════════════════════════════════════════ */

function XMark() {
  return (
    <svg viewBox="0 0 44 44" className="h-[72%] w-[72%]" aria-hidden="true">
      <path d="M10 12 L34 33" stroke="#d92b3a" strokeWidth="7.5" strokeLinecap="round" />
      <path d="M34 10 L11 33" stroke="#d92b3a" strokeWidth="7.5" strokeLinecap="round" />
    </svg>
  );
}
function OMark() {
  return (
    <svg viewBox="0 0 44 44" className="h-[72%] w-[72%]" aria-hidden="true">
      <path d="M22 8 A14 14.6 0 1 0 22.4 8" fill="none" stroke="#5d8f0a" strokeWidth="7.5" strokeLinecap="round" />
    </svg>
  );
}

export function TicTacToeBoard({
  board, canMove, onMove, lastMove, winLine,
}: {
  board: (string | null)[];
  canMove: boolean;
  onMove: (to: number) => void;
  lastMove: number | null;
  winLine: number[] | null;
}) {
  return (
    <BoardFrame className="mx-auto aspect-square max-w-[420px]">
      <div className="grid h-full grid-cols-3 gap-[6px] bg-[var(--edge)] p-[6px]">
        {board.map((cell, i) => {
          const inWin = winLine?.includes(i);
          return (
            <button
              key={i}
              disabled={!canMove || cell !== null}
              onClick={() => onMove(i)}
              aria-label={`Cell ${i + 1}${cell ? `, ${cell}` : ", empty"}`}
              className={cn(
                "relative flex items-center justify-center rounded-lg border-2 border-edge transition-all",
                "bg-[var(--card)]",
                inWin && "bg-lemon",
                lastMove === i && !inWin && "bg-lemon-soft/60",
                canMove && cell === null && "hover:bg-lemon-soft/50 active:scale-[0.97]",
                inWin && "scale-[1.02] shadow-[inset_0_0_0_3px_var(--ink)]"
              )}
            >
              <AnimatePresence mode="popLayout">
                {cell === "X" && (
                  <motion.div key="x" initial={{ scale: 0.4, rotate: -14 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 380, damping: 20 }}>
                    <XMark />
                  </motion.div>
                )}
                {cell === "O" && (
                  <motion.div key="o" initial={{ scale: 0.4, rotate: 14 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 380, damping: 20 }}>
                    <OMark />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>
    </BoardFrame>
  );
}

/* ════════════════════════════════════════════════════════════
   Checkers
   ════════════════════════════════════════════════════════════ */

type CheckerPiece = { s: string; k: boolean } | null;

export function CheckersBoard({
  board, chain, legalMoves, myColor, canMove, onMove, lastMove,
}: {
  board: CheckerPiece[];
  chain: number | null;
  legalMoves: LegalMove[];
  myColor: string;
  canMove: boolean;
  onMove: (m: { from: number; to: number }) => void;
  lastMove: { from: number; to: number } | null;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const flip = myColor === "r"; // red starts at the top — flip so my discs sit at the bottom
  const order = useMemo(
    () => Array.from({ length: 64 }, (_, i) => (flip ? 63 - i : i)),
    [flip]
  );

  const movableFrom = useMemo(() => new Set(legalMoves.map((m) => m.from)), [legalMoves]);
  const targets = useMemo(
    () => (selected === null ? [] : legalMoves.filter((m) => m.from === selected)),
    [selected, legalMoves]
  );

  const click = (i: number) => {
    if (!canMove) return;
    const target = targets.find((m) => m.to === i);
    if (target) {
      onMove({ from: target.from, to: target.to });
      setSelected(null);
      return;
    }
    const piece = board[i];
    if (piece && piece.s === myColor && movableFrom.has(i)) {
      setSelected(selected === i ? null : i);
    } else {
      setSelected(null);
    }
  };

  return (
    <BoardFrame className="mx-auto aspect-square max-w-[460px]">
      <div className="grid h-full grid-cols-8">
        {order.map((i) => {
          const piece = board[i];
          const isDark = (Math.floor(i / 8) + (i % 8)) % 2 === 1;
          const isTarget = targets.some((m) => m.to === i);
          const isJump = targets.some((m) => m.to === i && m.jump != null);
          const isSel = selected === i;
          const isLast = lastMove && (lastMove.from === i || lastMove.to === i);
          const myPiece = piece && piece.s === myColor;
          return (
            <button
              key={i}
              onClick={() => click(i)}
              disabled={!canMove}
              aria-label={`${sqName(i)}${piece ? `, ${piece.k ? "king" : "piece"} ${piece.s === "r" ? "red" : "black"}` : ""}`}
              className={cn(
                "relative flex aspect-square items-center justify-center",
                isDark ? "sq-dark" : "sq-light",
                isLast && "sq-last",
                isSel && "sq-selected",
                canMove && myPiece && movableFrom.has(i) && "cursor-pointer"
              )}
            >
              {isTarget && !isJump && (
                <span className="absolute h-[30%] w-[30%] rounded-full bg-ink/35 dark:bg-white/45" />
              )}
              {isTarget && isJump && (
                <span className="absolute inset-[8%] rounded-lg border-[3px] border-red-600/80 bg-red-500/15 dark:border-red-400/80" />
              )}
              {piece && (
                <motion.span
                  key={`${i}-${piece.s}${piece.k ? "k" : ""}`}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1, y: chain === i ? [0, -3, 0] : 0 }}
                  transition={chain === i ? { repeat: Infinity, duration: 0.9 } : { type: "spring", stiffness: 400, damping: 22 }}
                  className={cn(
                    "checker-disc flex h-[74%] w-[74%] items-center justify-center rounded-full",
                    piece.s === "r" ? "bg-red-600" : "bg-[#20291a] dark:bg-[#141b10]",
                    piece.k && "shadow-[inset_0_0_0_3px_rgba(255,255,255,0.35)]"
                  )}
                >
                  {piece.k && <Crown className="h-[46%] w-[46%] text-white drop-shadow" strokeWidth={2.75} />}
                </motion.span>
              )}
            </button>
          );
        })}
      </div>
    </BoardFrame>
  );
}

/* ════════════════════════════════════════════════════════════
   Chess
   ════════════════════════════════════════════════════════════ */

type ChessPiece = { t: string; c: string } | null;

const PROMO_CHOICES: Array<{ promo: string; glyph: string; label: string }> = [
  { promo: "q", glyph: "♛", label: "Queen" },
  { promo: "r", glyph: "♜", label: "Rook" },
  { promo: "n", glyph: "♞", label: "Knight" },
  { promo: "b", glyph: "♝", label: "Bishop" },
];

export function ChessBoard({
  board, legalMoves, myColor, canMove, onMove, lastMove, check, turn,
}: {
  board: ChessPiece[];
  legalMoves: LegalMove[];
  myColor: string;
  canMove: boolean;
  onMove: (m: { from: number; to: number; promo?: string }) => void;
  lastMove: { from: number; to: number } | null;
  check: boolean;
  turn: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [promoTarget, setPromoTarget] = useState<{ from: number; to: number } | null>(null);
  const flip = myColor === "b"; // black starts at the top — flip so my pieces sit at the bottom
  const order = useMemo(
    () => Array.from({ length: 64 }, (_, i) => (flip ? 63 - i : i)),
    [flip]
  );

  const movableFrom = useMemo(() => new Set(legalMoves.map((m) => m.from)), [legalMoves]);
  const targets = useMemo(
    () => (selected === null ? [] : legalMoves.filter((m) => m.from === selected)),
    [selected, legalMoves]
  );

  const click = (i: number) => {
    if (!canMove) return;
    const options = targets.filter((m) => m.to === i);
    if (options.length > 0) {
      if (options.length > 1) {
        // promotion: ask which piece
        setPromoTarget({ from: options[0].from, to: i });
        return;
      }
      onMove({ from: options[0].from, to: options[0].to, promo: options[0].promo });
      setSelected(null);
      return;
    }
    const piece = board[i];
    if (piece && piece.c === myColor && movableFrom.has(i)) {
      setSelected(selected === i ? null : i);
    } else {
      setSelected(null);
    }
  };

  const kingIdx = check
    ? board.findIndex((p) => p?.t === "k" && p.c === turn)
    : -1;

  return (
    <div className="relative mx-auto w-full max-w-[460px]">
      <BoardFrame className="aspect-square">
        <div className="grid h-full grid-cols-8">
          {order.map((i) => {
            const piece = board[i];
            const dark = (Math.floor(i / 8) + (i % 8)) % 2 === 1;
            const isTarget = targets.some((m) => m.to === i);
            const isCapture = targets.some((m) => m.to === i && (m.capture || m.ep));
            const isSel = selected === i;
            const isLast = lastMove && (lastMove.from === i || lastMove.to === i);
            const myPiece = piece && piece.c === myColor;
            const row = Math.floor(i / 8);
            const col = i % 8;
            return (
              <button
                key={i}
                onClick={() => click(i)}
                disabled={!canMove}
                aria-label={`${sqName(i)}${piece ? `, ${piece.c === "w" ? "white" : "black"} ${piece.t}` : ""}`}
                className={cn(
                  "relative flex aspect-square items-center justify-center",
                  dark ? "sq-dark" : "sq-light",
                  isLast && "sq-last",
                  isSel && "sq-selected",
                  kingIdx === i && "animate-pulse bg-[color-mix(in_srgb,#ef4444_45%,transparent)]",
                  canMove && myPiece && movableFrom.has(i) && "cursor-pointer"
                )}
              >
                {/* coordinates on board edges */}
                {(flip ? col === 7 : col === 0) && (
                  <span className={cn("board-coord absolute left-[3px] top-[2px]", dark ? "text-[#efe9d8]" : "text-[#45502f]")}>
                    {8 - row}
                  </span>
                )}
                {(flip ? row === 0 : row === 7) && (
                  <span className={cn("board-coord absolute bottom-[1px] right-[3px]", dark ? "text-[#efe9d8]" : "text-[#45502f]")}>
                    {FILES[col]}
                  </span>
                )}

                {isTarget && !isCapture && (
                  <span className="absolute h-[28%] w-[28%] rounded-full bg-ink/35 dark:bg-white/50" />
                )}
                {isTarget && isCapture && (
                  <span className="absolute inset-[6%] rounded-md border-[3px] border-red-600/80 bg-red-500/15 dark:border-red-400/80" />
                )}
                {piece && (
                  <motion.span
                    key={`${i}-${piece.c}${piece.t}`}
                    initial={{ scale: 0.6 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 24 }}
                    className={cn(
                      "chess-piece text-[min(8vw,38px)] leading-none",
                      piece.c === "w" ? "chess-piece-w" : "chess-piece-b"
                    )}
                  >
                    {CHESS_GLYPH[piece.t]}
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>
      </BoardFrame>

      {/* promotion picker */}
      <AnimatePresence>
        {promoTarget && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute inset-x-0 bottom-4 z-20 mx-auto w-fit game-card rounded-2xl p-3"
          >
            <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Promote to</p>
            <div className="flex gap-2">
              {PROMO_CHOICES.map((c) => (
                <button
                  key={c.promo}
                  onClick={() => {
                    onMove({ from: promoTarget.from, to: promoTarget.to, promo: c.promo });
                    setPromoTarget(null);
                    setSelected(null);
                  }}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-edge bg-card text-2xl transition-all hover:bg-lemon active:translate-y-[2px]"
                  aria-label={c.label}
                >
                  <span className={cn("chess-piece", myColor === "w" ? "chess-piece-w" : "chess-piece-b")}>{c.glyph}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setPromoTarget(null)}
              className="mt-2 w-full text-center text-[10px] font-bold text-muted-foreground hover:text-foreground"
            >
              cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
