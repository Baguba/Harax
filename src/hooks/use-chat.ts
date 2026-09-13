"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ChatMessageDTO } from "@/lib/types";
import { useAppStore } from "@/store/app-store";
import { api } from "@/lib/client-api";

/**
 * Harax real-time chat hook.
 *
 * Reads:  socket.io when available, REST polling (3s) when the socket is down.
 * Writes: always over REST — validated, rate-limited, persisted — then the
 *         chat mini-service broadcasts the message to socket-connected peers,
 *         so everyone else still gets it instantly.
 *
 * This means sending can never silently fail: if the socket is unreachable
 * the message still lands (sender gets it in the REST response; peers catch
 * up via polling).
 *
 * Socket URL strategy:
 *  - Hosted (behind the gateway): same-origin `/?XTransformPort=3003`; the
 *    gateway forwards to the chat mini-service and the session cookie rides
 *    along (same-origin).
 *  - Local (`npm run dev`): direct `<protocol>//<host>:3003`. Browsers share
 *    cookies across ports on the same host, so with `withCredentials` the
 *    http-only session cookie still authenticates the socket.
 *  - Override with NEXT_PUBLIC_CHAT_URL if you host differently.
 */
function socketUrl(): string {
  const override = process.env.NEXT_PUBLIC_CHAT_URL;
  if (override) return override;
  if (typeof window === "undefined") return "/?XTransformPort=3003";
  const host = window.location.hostname;
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.startsWith("192.168.") ||
    host.startsWith("10.");
  return isLocal ? `${window.location.protocol}//${host}:3003` : "/?XTransformPort=3003";
}

/** dedup-by-id + chronological sort — used for every incoming batch */
function mergeMessages(prev: ChatMessageDTO[], incoming: ChatMessageDTO[]): ChatMessageDTO[] {
  if (incoming.length === 0) return prev;
  const map = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) if (!map.has(m.id)) map.set(m.id, m);
  return [...map.values()].sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
}

const restPath = (roomType: "GROUP" | "SIDECHAT", roomId: string) =>
  `/api/${roomType === "GROUP" ? "groups" : "sidechat"}/${roomId}/messages`;

const POLL_MS = 3000;

export function useChat(roomType: "GROUP" | "SIDECHAT", roomId: string | null) {
  const user = useAppStore((s) => s.user);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [online, setOnline] = useState(0);
  const [connected, setConnected] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [typing, setTyping] = useState<{ who: string; typing: boolean } | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = useCallback(async () => {
    if (!roomId || !user) return;
    const res = await api<{ messages: ChatMessageDTO[] }>(restPath(roomType, roomId));
    if (res.ok) setMessages((prev) => mergeMessages(prev, res.data.messages));
  }, [roomType, roomId, user]);

  // ── room lifecycle: REST history + socket ───────────────────
  useEffect(() => {
    if (!roomId || !user) return;
    let alive = true;

    // 1) history over REST right away — never wait on the socket
    api<{ messages: ChatMessageDTO[] }>(restPath(roomType, roomId)).then((res) => {
      if (alive && res.ok) setMessages((prev) => mergeMessages(prev, res.data.messages));
    });

    // 2) socket for real-time updates
    const socket = io(socketUrl() as `${string}`, {
      path: "/",
      transports: ["websocket", "polling"],
      withCredentials: true,
      forceNew: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1200,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setAuthError(null);
      socket.emit("room:join", { roomType, roomId });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));
    socket.on("auth:error", (p: { message?: string }) => {
      setAuthError(p?.message ?? "Authentication failed");
      setConnected(false);
    });
    socket.on("auth:ok", () => setAuthError(null));
    socket.on("room:error", (p: { message?: string }) => setAuthError(p?.message ?? null));
    socket.on("rate:error", (p: { message?: string }) => setAuthError(p?.message ?? null));

    socket.on("history", (p: { messages: ChatMessageDTO[] }) => {
      if (p?.messages) setMessages((prev) => mergeMessages(prev, p.messages));
    });

    socket.on("message:new", (m: ChatMessageDTO) => {
      if (m?.id) setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : mergeMessages(prev, [m])));
    });

    socket.on("presence", (p: { online: number }) => setOnline(p.online));

    socket.on("peer:typing", (p: { who: string; typing: boolean }) => {
      setTyping(p);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (p.typing) {
        typingTimer.current = setTimeout(() => setTyping(null), 3500);
      }
    });

    return () => {
      alive = false;
      socket.emit("room:leave", { roomId });
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setMessages([]);
      setOnline(0);
      setConnected(false);
    };
  }, [roomType, roomId, user]);

  // ── polling fallback while the socket is down ───────────────
  useEffect(() => {
    if (!roomId || !user || connected) return;
    const first = setTimeout(poll, 400); // quick catch-up once the socket is known to be down
    const t = setInterval(poll, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [connected, roomId, user, poll]);

  // ── writes: REST, always ────────────────────────────────────
  const send = useCallback(
    async (
      content: string,
      media?: { mediaUrl: string; mediaType: string }
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!roomId || !user) return { ok: false, error: "Sign in to send messages." };
      const res = await api<{ message: ChatMessageDTO }>(restPath(roomType, roomId), {
        body: { content, mediaUrl: media?.mediaUrl, mediaType: media?.mediaType },
      });
      if (!res.ok) return { ok: false, error: res.error };
      setMessages((prev) => mergeMessages(prev, [res.data.message]));
      return { ok: true };
    },
    [roomType, roomId, user]
  );

  const setTypingState = useCallback(
    (isTyping: boolean) => {
      const socket = socketRef.current;
      if (!socket || !roomId || !socket.connected) return;
      socket.emit("typing", { roomId, typing: isTyping });
    },
    [roomId]
  );

  return { messages, send, online, connected, authError, typing, setTypingState };
}
