"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ChatMessageDTO } from "@/lib/types";
import { useAppStore } from "@/store/app-store";

/**
 * Harax real-time chat hook.
 * Connects to the chat mini-service through the gateway:
 *   io("/?XTransformPort=3003")
 * Auth rides on the session cookie (same-origin) — no tokens in JS.
 */
export function useChat(roomType: "GROUP" | "SIDECHAT", roomId: string | null) {
  const user = useAppStore((s) => s.user);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [online, setOnline] = useState(0);
  const [connected, setConnected] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [typing, setTyping] = useState<{ who: string; typing: boolean } | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!roomId || !user) return;
    const socket = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnectionAttempts: 6,
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
      setMessages(p.messages);
    });

    socket.on("message:new", (m: ChatMessageDTO) => {
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
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
      socket.emit("room:leave", { roomId });
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setMessages([]);
      setOnline(0);
      setConnected(false);
    };
  }, [roomType, roomId, user]);

  const send = useCallback(
    (content: string, media?: { mediaUrl: string; mediaType: string }) => {
      const socket = socketRef.current;
      if (!socket || !roomId) return false;
      socket.emit("message:send", { roomId, content, mediaUrl: media?.mediaUrl, mediaType: media?.mediaType });
      return true;
    },
    [roomId]
  );

  const setTypingState = useCallback(
    (isTyping: boolean) => {
      const socket = socketRef.current;
      if (!socket || !roomId) return;
      socket.emit("typing", { roomId, typing: isTyping });
    },
    [roomId]
  );

  return { messages, send, online, connected, authError, typing, setTypingState };
}
