"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { socketUrl } from "@/hooks/use-chat";
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
    const socket = io(socketUrl() as `${string}`, {
      path: "/",
      transports: ["websocket", "polling"],
      withCredentials: true,
      forceNew: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1200,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setError(null);
      socket.emit("game:subscribe");
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));
    socket.on("game:error", (p: { message?: string }) => {
      setError(p?.message ?? "Something went wrong");
      setBusy(false);
    });

    socket.on("game:lobby", (p: { matches: LobbyRow[] }) => setLobby(p?.matches ?? []));
    socket.on("game:waiting", (p: { match: MatchDTO }) => {
      setBusy(false);
      setMatchFull(p.match);
    });
    socket.on("game:matched", (p: { match: MatchDTO }) => {
      setBusy(false);
      setMatchFull(p.match);
    });
    socket.on("game:resume", (p: { match: MatchDTO }) => {
      setMatchFull(p.match);
    });
    socket.on("game:state", (p: { match: MatchDTO }) => {
      setMatchFull(p.match);
    });
    socket.on("game:cancelled", () => {
      setMatchFull(null);
      toast("Table closed.");
    });

    socket.on("game:move:made", (p: MovePayload) => {
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

    socket.on("game:match:ended", (p: EndedPayload) => {
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

    socket.on("game:draw:offered", (p: { matchId: string; by: string }) => {
      if (p?.matchId !== matchIdRef.current) return;
      setDrawOfferBy(p.by);
    });
    socket.on("game:draw:declined", () => {
      setDrawOfferBy(null);
      toast("Draw declined — play on.");
    });

    socket.on("game:rematch:asked", (p: { matchId: string; by: string }) => {
      if (p?.matchId !== matchIdRef.current) return;
      setRematchAskedBy(p.by);
    });
    socket.on("game:rematch:moved", () => {
      // both already received game:matched for the fresh match
    });

    socket.on("game:opponent:offline", (p: { matchId: string }) => {
      if (p?.matchId !== matchIdRef.current) return;
      setOpponentOffline(true);
    });

    socket.on("game:chat:new", (p: { matchId: string; message: GameChatMsg }) => {
      if (p?.matchId !== matchIdRef.current) return;
      setChat((prev) => [...prev.slice(-60), p.message]);
    });

    socket.on("game:prize", (p: { seasonIndex: number; rank: number; prize: string }) => {
      toast(`🏆 Game Zone prize — #${p.rank} this week! ${p.prize}`, { duration: 8000 });
      qc.invalidateQueries({ queryKey: ["games-leaderboard"] });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
      setLobby([]);
      setMatch(null);
      setChat([]);
      setEnded(null);
      matchIdRef.current = null;
    };
  }, [user, qc, setMatchFull]);

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

  return {
    connected, lobby, match, chat, error, ended, busy,
    drawOfferBy, rematchAskedBy, opponentOffline,
    quickMatch, playBot, joinTable, move, resign,
    offerDraw, acceptDraw, declineDraw, sendChat,
    rematch, leaveMatch, cancelTable, claimTimeout,
    clearError,
  };
}
