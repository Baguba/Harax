// Harax real-time chat service — socket.io on :3003
// Runs under Bun (dev sandbox) or plain Node (npm) — no build step, no TypeScript.
//
// Rooms: GROUP:<id> (membership-checked) and SIDECHAT:<id> (open, anonymous aliases)
//
// Ports:
//   3003 (all interfaces)  — socket.io engine (path "/") + auth via session cookie
//   3011 (loopback only)   — control endpoint: /health + /internal/broadcast
//                           (used by Next REST routes so messages sent over REST
//                            still reach socket-connected peers in real time)
//
// Env:
//   DATABASE_URL       (default: file:../db/custom.db — resolved relative to prisma/schema.prisma)
//   CHAT_INTERNAL_TOKEN (default: harax-internal-2026 — must match the Next app)

const { createServer } = require("http");
const { createHash, timingSafeEqual } = require("crypto");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

const PORT = 3003;
const INTERNAL_PORT = 3011;
const INTERNAL_TOKEN = process.env.CHAT_INTERNAL_TOKEN || "harax-internal-2026";

process.env.DATABASE_URL = process.env.DATABASE_URL || "file:../db/custom.db";

const db = new PrismaClient();
const httpServer = createServer();
const io = new Server(httpServer, {
  path: "/",
  cors: { origin: true, credentials: true }, // reflect origin — allows local cross-port cookie auth
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB
});

// ─── helpers ────────────────────────────────────────────────
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

// NOTE: keep in sync with src/app/api/sidechat/[id]/messages/route.ts (anonNameFor)
const ANON_PREFIX = [
  "NightOwl", "LekuLurker", "LibraryGhost", "MemeLord", "FirfirFan",
  "CouchPotato", "ShutterBug", "Guest", "DormOwl", "TeaSpiller",
  "CampusFox", "AcaciaShade", "SunsetChaser", "BunaBuddy", "QuietStorm",
];

function anonNameFor(userId, roomId) {
  const h = createHash("md5").update(`${userId}:${roomId}`).digest();
  const prefix = ANON_PREFIX[h[0] % ANON_PREFIX.length];
  return `${prefix} ${(h[1] % 89) + 10}`;
}

function messageDTO(m, roomType) {
  return {
    id: m.id,
    roomId: m.roomId,
    content: m.content,
    mediaUrl: m.mediaUrl,
    mediaType: m.mediaType,
    createdAt: m.createdAt.toISOString(),
    anonName: m.anonName,
    sender:
      roomType === "SIDECHAT" || !m.sender
        ? null
        : { id: m.sender.id, name: m.sender.name, avatarUrl: m.sender.avatarUrl, role: m.sender.role },
  };
}

const messageInclude = { sender: { select: { id: true, name: true, avatarUrl: true, role: true } } };

function tokenValid(req) {
  const got = String(req.headers["x-internal-token"] ?? "");
  if (!got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(INTERNAL_TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function authSocket(socket) {
  try {
    const token =
      (socket.handshake.auth?.token) ||
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
    return {
      id: session.user.id,
      name: session.user.name,
      role: session.user.role,
      avatarUrl: session.user.avatarUrl,
    };
  } catch {
    return null;
  }
}

// per-socket message rate limiting (8 messages / 10s)
const msgTimes = new WeakMap();
function allowMessage(socket) {
  const now = Date.now();
  const arr = (msgTimes.get(socket) ?? []).filter((t) => t > now - 10_000);
  if (arr.length >= 8) return false;
  arr.push(now);
  msgTimes.set(socket, arr);
  return true;
}

// presence tracking: roomId -> Set<socketId>
const presence = new Map();
function updatePresence(roomId) {
  const set = presence.get(roomId);
  const count = set ? set.size : 0;
  io.to(roomId).emit("presence", { roomId, online: count });
}

// ─── connection lifecycle ───────────────────────────────────
io.on("connection", async (socket) => {
  const user = await authSocket(socket);
  if (!user) {
    socket.emit("auth:error", { message: "Sign in to chat on Harax." });
    socket.disconnect(true);
    return;
  }

  socket.data.user = user;
  socket.emit("auth:ok", { id: user.id, name: user.name });

  // join a room (GROUP or SIDECHAT)
  socket.on("room:join", async (payload) => {
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

    socket.join(roomId);
    const set = presence.get(roomId) ?? new Set();
    set.add(socket.id);
    presence.set(roomId, set);
    socket.data.roomId = roomId;
    socket.data.roomType = roomType;
    updatePresence(roomId);

    // send recent history on join
    const history = await db.message.findMany({
      where: { roomType, roomId },
      include: messageInclude,
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    socket.emit("history", { roomId, messages: history.reverse().map((m) => messageDTO(m, roomType)) });
  });

  socket.on("room:leave", (payload) => {
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

  // send a message (socket path — the web client normally sends over REST,
  // this stays available for direct API use)
  socket.on("message:send", async (payload) => {
    const { roomId, content, mediaUrl, mediaType } = payload ?? {};
    if (!roomId || !socket.data.user) return;
    const roomType = socket.data.roomType;
    if (roomId !== socket.data.roomId) return; // must join before sending

    const text = typeof content === "string" ? content.trim().slice(0, 1000) : "";
    if (!text && !mediaUrl) return;
    if (!allowMessage(socket)) {
      socket.emit("rate:error", { message: "Easy there — wait a few seconds before sending again." });
      return;
    }

    // verify room access again (paranoid)
    if (roomType === "GROUP") {
      const ok = await db.groupMember
        .findFirst({ where: { groupId: roomId, userId: user.id } })
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

    const dto = messageDTO({ ...message, sender: roomType === "SIDECHAT" ? null : { ...user } }, roomType);
    io.to(roomId).emit("message:new", dto);
    socket.emit("send:ack", { id: message.id, roomId });
  });

  socket.on("typing", (payload) => {
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

// ─── loopback control endpoint (Next REST routes call this) ─
const internal = createServer((req, res) => {
  const json = (code, body) => {
    res.writeHead(code, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };

  if (req.method === "GET" && (req.url === "/health" || req.url === "/health/")) {
    return json(200, { ok: true, pid: process.pid, uptime: process.uptime(), rooms: presence.size, sockets: io.engine ? io.engine.clientsCount : -1 });
  }

  if (req.method === "POST" && (req.url === "/internal/broadcast" || req.url === "/internal/broadcast/")) {
    if (!tokenValid(req)) return json(403, { ok: false, error: "bad token" });
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 4096) req.destroy();
    });
    req.on("end", async () => {
      try {
        const { roomType, roomId, messageId } = JSON.parse(body || "{}");
        if (!roomType || !roomId || !messageId) return json(400, { ok: false, error: "roomType, roomId, messageId required" });
        if (roomType !== "GROUP" && roomType !== "SIDECHAT") return json(400, { ok: false, error: "bad roomType" });
        if (!/^[a-zA-Z0-9-]{5,40}$/.test(roomId) || !/^[a-zA-Z0-9-]{5,40}$/.test(messageId)) {
          return json(400, { ok: false, error: "bad id shape" });
        }
        const message = await db.message.findUnique({ where: { id: messageId }, include: messageInclude });
        if (!message || message.roomId !== roomId) return json(404, { ok: false, error: "message not found" });
        io.to(roomId).emit("message:new", messageDTO(message, roomType));
        const online = presence.get(roomId)?.size ?? 0;
        return json(200, { ok: true, online });
      } catch {
        return json(400, { ok: false, error: "invalid json" });
      }
    });
    return;
  }

  return json(404, { ok: false, error: "not found" });
});
internal.listen(INTERNAL_PORT, "127.0.0.1", () => {
  console.log(`harax chat control endpoint on 127.0.0.1:${INTERNAL_PORT}`);
});

httpServer.listen(PORT, () => {
  console.log(`harax chat service live on :${PORT}`);
});

const shutdown = () => {
  io.close();
  httpServer.close(() => process.exit(0));
  internal.close(() => {});
  setTimeout(() => process.exit(0), 1500).unref();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
