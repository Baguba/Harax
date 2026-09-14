"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import type { GameKey, LegalMove, LobbyRow, MatchDTO, MatchResult } from "@/lib/games-meta";

export interface GameChatMsg {
  id: string;
  userId: string;
  name: string;
  text: string;
  at: string;
}

export interface EndedInfo {
  matchId: string;
  result: MatchResult;
  myDelta: number;
  movePoints: { win: number; draw: number; loss: number } | null;
}

interface MovePayload {
  matchId: string;
  state: MatchDTO["state"];
  turn: string;
  moverColor: string;
  legalMoves: LegalMove[];
  check: boolean;
  lastMoveAt: string;
  moveDeadline: string | null;
}

interface EndedPayload {
  matchId: string;
  result: MatchResult;
  pointsDelta: Record<string, number>;
  movePoints: { win: number; draw: number; loss: number } | null;
  endedAt: string;
}

/**
 * Where can the real-time service live? We try candidates in order and
 * rotate to the next one if one keeps failing:
 *  - override   NEXT_PUBLIC_CHAT_URL (self-hosters)
 *  - direct     <protocol>//<host>:3003  — local dev & any host that exposes 3003
 *  - gateway    same-origin /?XTransformPort=3003 — behind the hosting edge
 */
function socketCandidates(): string[] {
  const override = process.env.NEXT_PUBLIC_CHAT_URL;
  if (override) return [override];
  if (typeof window === "undefined") return ["/?XTransformPort=3003"];
  const host = window.location.hostname;
  const direct = `${window.location.protocol}//${host}:3003`;
  const gateway = "/?XTransformPort=3003";
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.startsWith("192.168.") ||
    host.startsWith("10.");
  return isLocal ? [direct, gateway] : [gateway, direct];
}

/**
 * Game Zone realtime hook — one socket connection per mounted Game Zone.
 * The server owns every rule; this just renders state and ships intents.
 */
export function useGameSocket() {
  const user = useAppStore((s) => s.user);
  const qc = useQueryClient();

  const [connected, setConnected] = useState(false);
  const [lobby, setLobby] = useState<LobbyRow[]>([]);
  const [match, setMatch] = useState<MatchDTO | null>(null);
  const [chat, setChat] = useState<GameChatMsg[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState<EndedInfo | null>(null);
  const [drawOfferBy, setDrawOfferBy] = useState<string | null>(null);
  const [rematchAskedBy, setRematchAskedBy] = useState<string | null>(null);
  const [opponentOffline, setOpponentOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [reconnectNonce, setReconnectNonce] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const matchIdRef = useRef<string | null>(null);
  const claimedRef = useRef<string | null>(null);

  const setMatchFull = useCallback((m: MatchDTO | null) => {
    matchIdRef.current = m?.id ?? null;
    setMatch(m);
    setDrawOfferBy(null);
    setRematchAskedBy(null);
    setOpponentOffline(false);
    setChat([]);
    if (!m || m.status !== "ACTIVE") setEnded(null);
    if (m?.status === "FINISHED") {
      setEnded((prev) => prev && prev.matchId === m.id ? prev : {
        matchId: m.id,
        result: m.result ?? { winnerId: null, reason: null, isDraw: false },
        myDelta: 0,
        movePoints: null,
      });
    }
  }, []);

  /* ── socket lifecycle ─────────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    const candidates = socketCandidates();
    let disposed = false;
    let socket: Socket | null = null;
    let candidateIdx = 0;
    let failsOnCandidate = 0;
    let respawnTimer: ReturnType<typeof setTimeout> | null = null;

    const spawn = () => {
      if (disposed) return;
      // Polling first: it survives proxies/edges that mishandle WebSocket
      // upgrades (socket.io silently upgrades to websocket when possible).
      const s = io(candidates[candidateIdx % candidates.length] as `${string}`, {
        path: "/",
        transports: ["polling", "websocket"],
        withCredentials: true,
        forceNew: true,
        reconnection: true, // never give up — the UI shows the state
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 12000,
      });
      socket = s;
      socketRef.current = s;

      s.on("connect", () => {
        if (disposed) return;
        failsOnCandidate = 0;
        setAttempts(0);
        setConnected(true);
        setError(null);
        s.emit("game:subscribe");
      });
      s.on("disconnect", () => setConnected(false));
      s.on("connect_error", () => {
        if (disposed) return;
        setConnected(false);
        setAttempts((n) => n + 1);
        failsOnCandidate++;
        // this candidate keeps failing — rotate to the next endpoint
        if (failsOnCandidate >= 3 && candidates.length > 1) {
          failsOnCandidate = 0;
          candidateIdx++;
          s.removeAllListeners();
          s.disconnect();
          if (socketRef.current === s) socketRef.current = null;
          respawnTimer = setTimeout(spawn, 400);
        }
      });
      s.on("game:error", (p: { message?: string }) => {
        setError(p?.message ?? "Something went wrong");
        setBusy(false);
      });

      s.on("game:lobby", (p: { matches: LobbyRow[] }) => setLobby(p?.matches ?? []));
      s.on("game:waiting", (p: { match: MatchDTO }) => {
        setBusy(false);
        setMatchFull(p.match);
      });
      s.on("game:matched", (p: { match: MatchDTO }) => {
        setBusy(false);
        setMatchFull(p.match);
      });
      s.on("game:resume", (p: { match: MatchDTO }) => {
        setMatchFull(p.match);
      });
      s.on("game:state", (p: { match: MatchDTO }) => {
        setMatchFull(p.match);
      });
      s.on("game:cancelled", () => {
        setMatchFull(null);
        toast("Table closed.");
      });

      s.on("game:move:made", (p: MovePayload) => {
        if (p?.matchId !== matchIdRef.current) return;
        claimedRef.current = null;
        setMatch((prev) => {
          if (!prev || prev.id !== p.matchId) return prev;
          // ignore stale/regressive events (can happen right after a quick reconnect)
          const prevPlies = prev.state?.moves?.length ?? 0;
          const nextPlies = p.state?.moves?.length ?? 0;
          if (nextPlies < prevPlies) return prev;
          return {
            ...prev,
            state: p.state,
            turn: p.turn,
            legalMoves: p.legalMoves,
            check: p.check,
            lastMoveAt: p.lastMoveAt,
            moveDeadline: p.moveDeadline,
          };
        });
        setDrawOfferBy(null);
      });

      s.on("game:match:ended", (p: EndedPayload) => {
        if (matchIdRef.current === p.matchId) {
          const myDelta = user ? (p.pointsDelta?.[user.id] ?? 0) : 0;
          setEnded({
            matchId: p.matchId,
            result: p.result,
            myDelta,
            movePoints: p.movePoints,
          });
          setMatch((prev) =>
            prev && prev.id === p.matchId
              ? { ...prev, status: "FINISHED", result: p.result, legalMoves: [] }
              : prev
          );
        } else if (user && p.pointsDelta?.[user.id]) {
          // finished in the background — let them know
          const delta = p.pointsDelta[user.id];
          toast(p.result.winnerId === user.id ? `You won a match in the background! +${delta} pts` : `A background match ended · ${delta} pts`);
        }
        setBusy(false);
        qc.invalidateQueries({ queryKey: ["games"] });
        qc.invalidateQueries({ queryKey: ["games-leaderboard"] });
      });

      s.on("game:draw:offered", (p: { matchId: string; by: string }) => {
        if (p?.matchId !== matchIdRef.current) return;
        setDrawOfferBy(p.by);
      });
      s.on("game:draw:declined", () => {
        setDrawOfferBy(null);
        toast("Draw declined — play on.");
      });

      s.on("game:rematch:asked", (p: { matchId: string; by: string }) => {
        if (p?.matchId !== matchIdRef.current) return;
        setRematchAskedBy(p.by);
      });
      s.on("game:rematch:moved", () => {
        // both already received game:matched for the fresh match
      });

      s.on("game:opponent:offline", (p: { matchId: string }) => {
        if (p?.matchId !== matchIdRef.current) return;
        setOpponentOffline(true);
      });

      s.on("game:chat:new", (p: { matchId: string; message: GameChatMsg }) => {
        if (p?.matchId !== matchIdRef.current) return;
        setChat((prev) => [...prev.slice(-60), p.message]);
      });

      s.on("game:prize", (p: { seasonIndex: number; rank: number; prize: string }) => {
        toast(`🏆 Game Zone prize — #${p.rank} this week! ${p.prize}`, { duration: 8000 });
        qc.invalidateQueries({ queryKey: ["games-leaderboard"] });
      });
    };

    spawn();

    return () => {
      disposed = true;
      if (respawnTimer) clearTimeout(respawnTimer);
      socket?.removeAllListeners();
      socket?.disconnect();
      socketRef.current = null;
      setConnected(false);
      setLobby([]);
      setMatch(null);
      setChat([]);
      setEnded(null);
      matchIdRef.current = null;
    };
  }, [user, qc, setMatchFull, reconnectNonce]);

  /* ── actions ──────────────────────────────────────────── */

  const quickMatch = useCallback((game: GameKey) => {
    const socket = socketRef.current;
    if (!socket?.connected) return setError("Connecting to the game service… try again in a second.");
    setBusy(true);
    setError(null);
    socket.emit("game:quick", { game });
  }, []);

  const playBot = useCallback((game: GameKey) => {
    const socket = socketRef.current;
    if (!socket?.connected) return setError("Connecting to the game service… try again in a second.");
    setBusy(true);
    setError(null);
    socket.emit("game:bot", { game });
  }, []);

  const joinTable = useCallback((matchId: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) return setError("Connecting to the game service… try again in a second.");
    setBusy(true);
    setError(null);
    socket.emit("game:join", { matchId });
  }, []);

  const move = useCallback((m: { from?: number; to: number; promo?: string }) => {
    const socket = socketRef.current;
    const matchId = matchIdRef.current;
    if (!socket?.connected || !matchId) return;
    socket.emit("game:move", { matchId, move: m });
  }, []);

  const resign = useCallback(() => {
    const socket = socketRef.current;
    const matchId = matchIdRef.current;
    if (!socket?.connected || !matchId) return;
    socket.emit("game:resign", { matchId });
  }, []);

  const offerDraw = useCallback(() => {
    const socket = socketRef.current;
    const matchId = matchIdRef.current;
    if (!socket?.connected || !matchId) return;
    socket.emit("game:draw:offer", { matchId });
    toast("Draw offered.");
  }, []);

  const acceptDraw = useCallback(() => {
    const socket = socketRef.current;
    const matchId = matchIdRef.current;
    if (!socket?.connected || !matchId) return;
    socket.emit("game:draw:accept", { matchId });
  }, []);

  const declineDraw = useCallback(() => {
    const socket = socketRef.current;
    const matchId = matchIdRef.current;
    if (!socket?.connected || !matchId) return;
    socket.emit("game:draw:decline", { matchId });
    setDrawOfferBy(null);
  }, []);

  const sendChat = useCallback((text: string) => {
    const socket = socketRef.current;
    const matchId = matchIdRef.current;
    if (!socket?.connected || !matchId || !text.trim()) return;
    socket.emit("game:chat", { matchId, text: text.trim().slice(0, 300) });
  }, []);

  const rematch = useCallback(() => {
    const socket = socketRef.current;
    const matchId = matchIdRef.current;
    if (!socket?.connected || !matchId) return;
    setBusy(true);
    socket.emit("game:rematch", { matchId });
  }, []);

  const leaveMatch = useCallback(() => {
    const socket = socketRef.current;
    const matchId = matchIdRef.current;
    if (socket?.connected && matchId) socket.emit("game:leave", { matchId });
    setMatchFull(null);
  }, [setMatchFull]);

  const cancelTable = useCallback(() => {
    const socket = socketRef.current;
    const matchId = matchIdRef.current;
    if (!socket?.connected || !matchId) return;
    socket.emit("game:cancel", { matchId });
  }, []);

  const claimTimeout = useCallback(() => {
    const socket = socketRef.current;
    const matchId = matchIdRef.current;
    if (!socket?.connected || !matchId) return;
    if (claimedRef.current === matchId) return;
    claimedRef.current = matchId;
    socket.emit("game:claim:timeout", { matchId });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  /** Force a fresh connection attempt right now (banner button). */
  const reconnectNow = useCallback(() => {
    setBusy(false);
    setReconnectNonce((n) => n + 1);
  }, []);

  return {
    connected, lobby, match, chat, error, ended, busy,
    attempts, reconnectNow,
    drawOfferBy, rematchAskedBy, opponentOffline,
    quickMatch, playBot, joinTable, move, resign,
    offerDraw, acceptDraw, declineDraw, sendChat,
    rematch, leaveMatch, cancelTable, claimTimeout,
    clearError,
  };
}
