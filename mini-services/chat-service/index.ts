// Harax real-time chat service — socket.io on :3003
// Rooms: GROUP:<id> (membership-checked) and SIDECHAT:<id> (open, anonymous)
import { createServer } from "http";
import { Server, type Socket } from "socket.io";
import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const httpServer = createServer();
const io = new Server(httpServer, {
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB
});

const PORT = 3003;

// ─── helpers ────────────────────────────────────────────────
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const ANON_PREFIX = [
  "NightOwl", "LekuLurker", "LibraryGhost", "MemeLord", "FirfirFan",
  "CouchPotato", "ShutterBug", "Guest", "DormOwl", "TeaSpiller",
  "CampusFox", "AcaciaShade", "SunsetChaser", "BunaBuddy", "QuietStorm",
];

function anonNameFor(userId: string, roomId: string): string {
  const h = createHash("md5").update(`${userId}:${roomId}`).digest();
  const prefix = ANON_PREFIX[h[0] % ANON_PREFIX.length];
  return `${prefix} ${(h[1] % 89) + 10}`;
}

interface AuthedUser {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
}

async function authSocket(socket: Socket): Promise<AuthedUser | null> {
  try {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.headers.cookie ?? "")
        .split(";")
        .map((c) => c.trim().split("="))
        .find(([k]) => k === "harax_session")?.[1];
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const session = await db.session.findUnique({
      where: { token: sha256(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date() || session.user.banned) return null;
    return { id: session.user.id, name: session.user.name, role: session.user.role, avatarUrl: session.user.avatarUrl };
  } catch {
    return null;
  }
}

// per-socket message rate limiting
const msgTimes = new WeakMap<Socket, number[]>();
function allowMessage(socket: Socket): boolean {
  const now = Date.now();
  const arr = (msgTimes.get(socket) ?? []).filter((t) => t > now - 10_000);
  if (arr.length >= 8) return false;
  arr.push(now);
  msgTimes.set(socket, arr);
  return true;
}

// presence tracking: roomId -> Set<socketId>
const presence = new Map<string, Set<string>>();

function updatePresence(roomId: string) {
  const set = presence.get(roomId);
  const count = set ? set.size : 0;
  io.to(roomId).emit("presence", { roomId, online: count });
}

// ─── connection lifecycle ───────────────────────────────────
io.on("connection", async (socket: Socket) => {
  const user = await authSocket(socket);
  if (!user) {
    socket.emit("auth:error", { message: "Sign in to chat on Harax." });
    socket.disconnect(true);
    return;
  }

  socket.data.user = user;
  socket.emit("auth:ok", { id: user.id, name: user.name });

  // join a room (GROUP or SIDECHAT)
  socket.on("room:join", async (payload: { roomType?: string; roomId?: string }) => {
    const { roomType, roomId } = payload ?? {};
    if (!roomId || !roomType || typeof roomId !== "string" || typeof roomType !== "string") return;
    if (!/^[a-zA-Z0-9-]{5,40}$/.test(roomId)) return; // cuid shape

    if (roomType === "GROUP") {
      const group = await db.group.findUnique({ where: { id: roomId }, include: { members: true } });
      if (!group) return socket.emit("room:error", { message: "Group not found." });
      const isMember = group.members.some((m) => m.userId === user.id) || group.ownerId === user.id;
      if (!group.isPublic && !isMember) {
        return socket.emit("room:error", { message: "This group is private — join it first." });
      }
    } else if (roomType !== "SIDECHAT") {
      return;
    }

    const key = `${roomType}:${roomId}`;
    socket.join(roomId);
    const set = presence.get(roomId) ?? new Set<string>();
    set.add(socket.id);
    presence.set(roomId, set);
    socket.data.roomId = roomId;
    socket.data.roomType = roomType;
    updatePresence(roomId);

    // send recent history on join
    const history = await db.message.findMany({
      where: { roomType, roomId },
      include: { sender: { select: { id: true, name: true, avatarUrl: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    socket.emit("history", {
      roomId,
      messages: history.reverse().map((m) => ({
        id: m.id,
        content: m.content,
        mediaUrl: m.mediaUrl,
        mediaType: m.mediaType,
        createdAt: m.createdAt.toISOString(),
        anonName: m.anonName,
        sender: roomType === "SIDECHAT" ? null : m.sender
          ? { id: m.sender.id, name: m.sender.name, avatarUrl: m.sender.avatarUrl, role: m.sender.role }
          : null,
      })),
    });
  });

  socket.on("room:leave", (payload: { roomId?: string }) => {
    const roomId = payload?.roomId ?? socket.data.roomId;
    if (!roomId) return;
    socket.leave(roomId);
    const set = presence.get(roomId);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) presence.delete(roomId);
      updatePresence(roomId);
    }
  });

  // send a message
  socket.on("message:send", async (payload: { roomId?: string; content?: string; mediaUrl?: string; mediaType?: string }) => {
    const { roomId, content, mediaUrl, mediaType } = payload ?? {};
    if (!roomId || !socket.data.user) return;
    const roomType = socket.data.roomType;
    if (roomId !== socket.data.roomId) return; // must join before sending

    const text = typeof content === "string" ? content.trim().slice(0, 1000) : "";
    if (!text && !mediaUrl) return;
    if (!allowMessage(socket)) {
      socket.emit("rate:error", { message: "Whoa, slow down ⚡ Wait a few seconds." });
      return;
    }

    // verify room access again (paranoid)
    if (roomType === "GROUP") {
      const ok = await db.groupMember.findFirst({ where: { groupId: roomId, userId: user.id } })
        .then(Boolean)
        .catch(() => false);
      const group = await db.group.findUnique({ where: { id: roomId } });
      const isAllowed = ok || group?.ownerId === user.id || (group?.isPublic ?? false);
      if (!isAllowed) return socket.emit("room:error", { message: "Join the group to send messages." });
    }

    const anonName = roomType === "SIDECHAT" ? anonNameFor(user.id, roomId) : null;

    const message = await db.message.create({
      data: {
        roomType,
        roomId,
        senderId: roomType === "SIDECHAT" ? null : user.id,
        content: text,
        mediaUrl: typeof mediaUrl === "string" && mediaUrl.startsWith("/uploads/") ? mediaUrl : null,
        mediaType: mediaType === "image" || mediaType === "video" ? mediaType : null,
        anonName,
      },
    });

    io.to(roomId).emit("message:new", {
      id: message.id,
      roomId,
      content: message.content,
      mediaUrl: message.mediaUrl,
      mediaType: message.mediaType,
      anonName,
      createdAt: message.createdAt.toISOString(),
      sender: roomType === "SIDECHAT"
        ? null
        : { id: user.id, name: user.name, avatarUrl: user.avatarUrl, role: user.role },
    });
  });

  socket.on("typing", (payload: { roomId?: string; typing?: boolean }) => {
    const roomId = payload?.roomId ?? socket.data.roomId;
    if (!roomId || roomId !== socket.data.roomId) return;
    socket.to(roomId).emit("peer:typing", {
      roomId,
      who: socket.data.roomType === "SIDECHAT" ? anonNameFor(user.id, roomId) : user.name,
      typing: Boolean(payload?.typing),
    });
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      const set = presence.get(roomId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) presence.delete(roomId);
        updatePresence(roomId);
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`⚡ Harax chat service live on :${PORT}`);
});

process.on("SIGTERM", () => {
  httpServer.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  httpServer.close(() => process.exit(0));
});
