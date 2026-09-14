// Harax Game Zone · realtime game session manager
// Plugs into the chat service (index.js): matchmaking queues, match rooms,
// engine-validated moves, a beatable house bot, turn timers, weekly seasons
// with points + top-3 prizes, in-match chat, rematches.
//
// All game rules live in ./game-engines/* — this module only orchestrates.

const { engineFor, ENGINES } = require("./game-engines");

/* ── config ───────────────────────────────────────────────── */

const POINTS = {
  TICTACTOE: { win: 6, draw: 2, loss: 0 },
  CHECKERS: { win: 12, draw: 4, loss: 1 },
  CHESS: { win: 15, draw: 5, loss: 1 },
};

const PRIZES = {
  1: "Gold champion trophy + 500 ETB campus voucher",
  2: "Silver trophy + 300 ETB campus voucher",
  3: "Bronze trophy + 150 ETB campus voucher",
};

const TURN_LIMIT_OVERRIDE = {}; // game -> seconds (default: engine.turnLimitSec)
const ABANDON_AFTER_MS = 120_000; // player offline this long in an ACTIVE match => loss
const STALE_TABLE_MS = 30 * 60_000; // WAITING table untouched this long => aborted
const DRAW_OFFER_TTL = 40_000;
const SWEEP_MS = 20_000;
const BOT_THINK_MS = [500, 1100];
const WEEK_MS = 7 * 24 * 3600_000;
const EAT_OFFSET_MS = 3 * 3600_000; // East Africa Time = UTC+3
const SEASON_ANCHOR = Date.UTC(2026, 8, 14) - EAT_OFFSET_MS; // Mon Sep 14 2026 00:00 EAT = Season 1

const LOBBY_ROOM = "game:lobby";

/* ── module state ─────────────────────────────────────────── */

let io = null;
let db = null;
let sweepTimer = null;

const queues = new Map(); // game -> [{ userId, socketId, matchId, pairing }]
const matchPresence = new Map(); // matchId -> Map<userId, socketCount>
const abandonedAt = new Map(); // `${matchId}:${userId}` -> ts
const drawOffers = new Map(); // matchId -> { by, at }
const rematchRequests = new Map(); // matchId -> Set<userId>
const rateWindows = new Map(); // `${kind}:${userId}` -> ts[]

/* ── small helpers ────────────────────────────────────────── */

const nowMs = () => Date.now();

function rateAllow(kind, userId, max, windowMs) {
  const key = `${kind}:${userId}`;
  const arr = (rateWindows.get(key) ?? []).filter((t) => t > nowMs() - windowMs);
  if (arr.length >= max) {
    rateWindows.set(key, arr);
    return false;
  }
  arr.push(nowMs());
  rateWindows.set(key, arr);
  return true;
}

function userDTO(u) {
  return u ? { id: u.id, name: u.name, avatarUrl: u.avatarUrl, role: u.role } : null;
}

function turnLimitSec(game) {
  return TURN_LIMIT_OVERRIDE[game] ?? ENGINES[game].turnLimitSec;
}

function colorOf(match, userId) {
  if (match.playerXId === userId) return match.hostColor;
  if (match.playerOId === userId) return otherColor(match.hostColor);
  return null;
}

function otherColor(c) {
  const e = { X: "O", O: "X", r: "k", k: "r", w: "b", b: "w" };
  return e[c] ?? c;
}

function userIdForColor(match, color) {
  if (match.hostColor === color) return match.playerXId;
  if (otherColor(match.hostColor) === color) return match.playerOId;
  return null;
}

/** Monday 00:00 EAT (as UTC Date) of the week containing `date`. */
function weekStart(date = new Date()) {
  const eat = new Date(date.getTime() + EAT_OFFSET_MS);
  const daysSinceMonday = (eat.getUTCDay() + 6) % 7;
  const mondayEat = Date.UTC(eat.getUTCFullYear(), eat.getUTCMonth(), eat.getUTCDate() - daysSinceMonday);
  return new Date(mondayEat - EAT_OFFSET_MS);
}

function seasonIndexFor(start) {
  return Math.floor((start.getTime() - SEASON_ANCHOR) / WEEK_MS) + 1;
}

/* ── seasons ──────────────────────────────────────────────── */

async function ensureSeason() {
  const now = new Date();
  let season = await db.gameSeason.findFirst({
    where: { startsAt: { lte: now }, endsAt: { gt: now } },
    orderBy: { index: "desc" },
  });
  if (season) return season;

  // rollover: close every expired open season (oldest first), then open fresh
  const expired = await db.gameSeason.findMany({
    where: { closed: false, endsAt: { lte: now } },
    orderBy: { index: "asc" },
  });
  for (const s of expired) await closeSeason(s);

  const start = weekStart(now);
  const index = seasonIndexFor(start);
  try {
    season = await db.gameSeason.create({
      data: { index, startsAt: start, endsAt: new Date(start.getTime() + WEEK_MS) },
    });
    console.log(`[games] season ${index} opened (${start.toISOString()} → +7d)`);
  } catch (e) {
    if (String(e?.code) === "P2002") {
      season = await db.gameSeason.findUnique({ where: { index } });
    } else {
      throw e;
    }
  }
  return season;
}

async function closeSeason(season) {
  const scores = await db.seasonScore.findMany({
    where: { seasonId: season.id },
    include: { user: true },
    orderBy: [{ points: "desc" }, { wins: "desc" }, { user: { name: "asc" } }],
    take: 3,
  });

  const winners = scores
    .filter((s) => s.points > 0)
    .map((s, i) => ({
      seasonId: season.id, userId: s.userId, rank: i + 1,
      points: s.points, prize: PRIZES[i + 1] ?? "Shoutout on the Harax feed",
    }));

  await db.$transaction([
    ...winners.length > 0
      ? [db.gameWinner.createMany({ data: winners })]
      : [],
    ...winners.length > 0
      ? [db.notification.createMany({
          data: winners.map((w) => ({
            userId: w.userId,
            type: "GAME_PRIZE",
            title: `Game Zone prize — you finished #${w.rank} this week!`,
            body: w.prize,
            link: "games",
          })),
        })]
      : [],
    db.gameMatch.updateMany({
      where: { seasonId: season.id, status: { in: ["WAITING", "ACTIVE"] } },
      data: { status: "FINISHED", reason: "ABORTED", winnerId: null, endedAt: new Date() },
    }),
    db.gameSeason.update({ where: { id: season.id }, data: { closed: true } }),
  ]).catch(async (e) => {
    console.error("[games] closeSeason failed:", e.message);
  });

  for (const w of winners) {
    // find live sockets of the winner and push them into the new season view
    broadcastToUser(w.userId, "game:prize", {
      seasonIndex: season.index, rank: w.rank, prize: w.prize, points: w.points,
    });
  }
}

/* ── DTOs ─────────────────────────────────────────────────── */

async function matchDTO(match, viewerId, { withUsers = true } = {}) {
  let host = null, guest = null;
  if (withUsers) {
    const ids = [match.playerXId, match.playerOId].filter(Boolean);
    const users = ids.length ? await db.user.findMany({ where: { id: { in: ids } } }) : [];
    host = users.find((u) => u.id === match.playerXId) ?? null;
    guest = users.find((u) => u.id === match.playerOId) ?? null;
  }
  const state = JSON.parse(match.state);
  const engine = engineFor(match.game);
  const active = match.status === "ACTIVE";
  const legalMoves = active ? engine.getLegalMoves(state) : [];
  const check = match.game === "CHESS" && active ? engine.inCheck(state.board, state.turn) : false;

  const myColor = viewerId ? colorOf(match, viewerId) : null;
  return {
    id: match.id,
    game: match.game,
    status: match.status,
    vsBot: match.vsBot,
    hostColor: match.hostColor,
    host: userDTO(host),
    guest: match.vsBot ? { id: "bot", name: "Harax Bot", avatarUrl: null, role: "BOT" } : userDTO(guest),
    turn: match.turn,
    lastMoveAt: match.lastMoveAt.toISOString(),
    moveDeadline: active
      ? new Date(match.lastMoveAt.getTime() + turnLimitSec(match.game) * 1000).toISOString()
      : null,
    state,
    legalMoves,
    check,
    result: match.status === "FINISHED"
      ? {
          winnerId: match.winnerId,
          reason: match.reason,
          isDraw: !match.winnerId && match.reason !== "ABORTED" && match.reason !== "TIMEOUT",
        }
      : null,
    myColor,
    createdAt: match.createdAt.toISOString(),
  };
}

async function lobbyDTO() {
  const tables = await db.gameMatch.findMany({
    where: { status: "WAITING", vsBot: false },
    orderBy: { createdAt: "desc" },
    take: 24,
  });
  const hosts = await db.user.findMany({
    where: { id: { in: tables.map((t) => t.playerXId) } },
  });
  return tables.map((t) => {
    const host = hosts.find((u) => u.id === t.playerXId);
    return {
      id: t.id, game: t.game, hostColor: t.hostColor,
      host: userDTO(host), createdAt: t.createdAt.toISOString(),
    };
  });
}

async function pushLobby() {
  io.to(LOBBY_ROOM).emit("game:lobby", { matches: await lobbyDTO() });
}

function broadcastToUser(userId, event, payload) {
  for (const [sid, s] of io.of("/").sockets) {
    if (s.data?.user?.id === userId) s.emit(event, payload);
  }
}

/** join every live socket of the given users into a match room (rematch flow). */
function joinUsersToMatch(matchId, userIds) {
  const wanted = new Set(userIds);
  for (const [sid, s] of io.of("/").sockets) {
    const uid = s.data?.user?.id;
    if (!wanted.has(uid)) continue;
    s.join(matchId);
    joinPresence(matchId, uid);
    s.data.gameRooms?.add(matchId);
  }
}

/* ── presence & abandonment ───────────────────────────────── */

function joinPresence(matchId, userId) {
  let m = matchPresence.get(matchId);
  if (!m) { m = new Map(); matchPresence.set(matchId, m); }
  m.set(userId, (m.get(userId) ?? 0) + 1);
  abandonedAt.delete(`${matchId}:${userId}`);
}

function leavePresence(matchId, userId, socket) {
  const m = matchPresence.get(matchId);
  if (!m) return;
  const n = (m.get(userId) ?? 1) - 1;
  if (n <= 0) {
    m.delete(userId);
    if (m.size === 0) matchPresence.delete(matchId);
    socket.to(matchId).emit("game:opponent:offline", { matchId });
    abandonedAt.set(`${matchId}:${userId}`, nowMs());
  } else {
    m.set(userId, n);
  }
}

function isOnline(matchId, userId) {
  const m = matchPresence.get(matchId);
  return Boolean(m && m.get(userId));
}

/* ── match lifecycle ──────────────────────────────────────── */

async function createMatch({ game, hostId, vsBot, hostColor }) {
  const season = await ensureSeason();
  const engine = engineFor(game);
  const color = hostColor ?? engine.sides[Math.floor(Math.random() * 2)];
  const state = engine.createInitialState();
  const match = await db.gameMatch.create({
    data: {
      seasonId: season.id,
      game,
      status: vsBot ? "ACTIVE" : "WAITING",
      vsBot,
      hostColor: color,
      playerXId: hostId,
      state: JSON.stringify(state),
      turn: state.turn,
    },
  });
  return match;
}

async function startMatch(match, guestId) {
  const updated = await db.gameMatch.update({
    where: { id: match.id, status: "WAITING" },
    data: { playerOId: guestId, status: "ACTIVE", lastMoveAt: new Date() },
  }).catch(() => null);
  if (!updated) return null;

  dequeueUser(match.playerXId, match.id);
  drawOffers.delete(match.id);
  for (const uid of [updated.playerXId, updated.playerOId]) {
    broadcastToUser(uid, "game:matched", { match: await matchDTO(updated, uid) });
  }
  pushLobby();
  return updated;
}

function dequeueUser(userId, matchId) {
  for (const [game, q] of queues) {
    const keep = q.filter((e) => !(e.userId === userId && (matchId ? e.matchId === matchId : true)));
    if (keep.length === 0) queues.delete(game);
    else queues.set(game, keep);
  }
}

async function finalizeMatch(match, { winnerColor = null, winner = null, reason }, viewer = null) {
  const winColor = winnerColor ?? winner;
  const winnerId = winColor ? userIdForColor(match, winColor) : null;
  const endedAt = new Date();
  const updated = await db.gameMatch.update({
    where: { id: match.id, status: "ACTIVE" },
    data: { status: "FINISHED", winnerId, reason, endedAt },
  }).catch(() => null);
  if (!updated) return null;

  drawOffers.delete(match.id);

  // points (real matches only, both seats filled)
  const pointsDelta = {};
  if (!updated.vsBot && updated.playerOId) {
    const table = POINTS[updated.game] ?? { win: 0, draw: 0, loss: 0 };
    const hostWon = winnerId === updated.playerXId;
    const isDraw = !winnerId;
    pointsDelta[updated.playerXId] = isDraw ? table.draw : hostWon ? table.win : table.loss;
    pointsDelta[updated.playerOId] = isDraw ? table.draw : hostWon ? table.loss : table.win;

    for (const uid of [updated.playerXId, updated.playerOId]) {
      const delta = pointsDelta[uid];
      await db.seasonScore.upsert({
        where: { seasonId_userId: { seasonId: updated.seasonId, userId: uid } },
        create: {
          seasonId: updated.seasonId, userId: uid, points: delta,
          wins: !isDraw && winnerId === uid ? 1 : 0,
          draws: isDraw ? 1 : 0,
          losses: !isDraw && winnerId !== uid ? 1 : 0,
        },
        update: {
          points: { increment: delta },
          wins: { increment: !isDraw && winnerId === uid ? 1 : 0 },
          draws: { increment: isDraw ? 1 : 0 },
          losses: { increment: !isDraw && winnerId !== uid ? 1 : 0 },
        },
      }).catch((e) => console.error("[games] score upsert failed:", e.message));
    }
  }

  const payload = {
    matchId: updated.id,
    result: {
      winnerId,
      reason,
      isDraw: !winnerId && reason !== "ABORTED" && reason !== "TIMEOUT",
    },
    pointsDelta,
    movePoints: POINTS[updated.game] ?? null,
    endedAt: endedAt.toISOString(),
  };
  io.to(updated.id).emit("game:match:ended", payload);
  broadcastToUser(updated.playerXId, "game:match:ended", payload);
  if (updated.playerOId) broadcastToUser(updated.playerOId, "game:match:ended", payload);
  return updated;
}

async function persistMove(match, state, done, result, moverColor) {
  const turn = done ? moverColor : state.turn;
  const updated = await db.gameMatch.update({
    where: { id: match.id },
    data: {
      state: JSON.stringify(state),
      turn,
      lastMoveAt: new Date(),
    },
  });
  return { updated, done, result };
}

function broadcastMove(match, state, moverColor) {
  const engine = engineFor(match.game);
  const payload = {
    matchId: match.id,
    state,
    turn: state.turn,
    moverColor,
    legalMoves: engine.getLegalMoves(state),
    check: match.game === "CHESS" ? engine.inCheck(state.board, state.turn) : false,
    lastMoveAt: match.lastMoveAt.toISOString(),
    moveDeadline: new Date(match.lastMoveAt.getTime() + turnLimitSec(match.game) * 1000).toISOString(),
  };
  io.to(match.id).emit("game:move:made", payload);
}

/* ── bot ──────────────────────────────────────────────────── */

async function botMaybeMove(matchId) {
  const match = await db.gameMatch.findUnique({ where: { id: matchId } });
  if (!match || !match.vsBot || match.status !== "ACTIVE") return;
  const botColor = otherColor(match.hostColor);
  if (match.turn !== botColor) return;

  const engine = engineFor(match.game);
  const state = JSON.parse(match.state);
  const move = engine.botMove(state);
  if (!move) return;

  let r;
  try {
    r = engine.applyMove(state, move);
  } catch {
    return;
  }
  const { updated } = await persistMove(match, r.state, r.done, r.result, botColor);
  broadcastMove(updated, r.state, botColor);
  if (r.done) {
    await finalizeMatch(updated, r.result ?? { winnerColor: null, reason: "ABORTED" });
  }
}

function scheduleBotMove(matchId) {
  const delay = BOT_THINK_MS[0] + Math.random() * (BOT_THINK_MS[1] - BOT_THINK_MS[0]);
  setTimeout(() => { botMaybeMove(matchId).catch((e) => console.error("[games] bot error:", e.message)); }, delay);
}

/* ── stale match sweep (timers + abandonment + dead tables) ─ */

async function sweep() {
  const now = new Date();

  // 1) turn timeouts
  const active = await db.gameMatch.findMany({ where: { status: "ACTIVE" }, take: 200 });
  for (const m of active) {
    const limit = turnLimitSec(m.game) * 1000;
    const overtime = now - m.lastMoveAt;
    if (overtime <= limit) continue;
    const loserColor = m.turn;
    if (m.vsBot) {
      if (loserColor === otherColor(m.hostColor)) {
        // bot "flagged" (shouldn't happen) — abort quietly
        await db.gameMatch.update({
          where: { id: m.id }, data: { status: "FINISHED", reason: "ABORTED", winnerId: null, endedAt: now },
        }).catch(() => {});
      } else {
        await finalizeMatch(m, { winnerColor: otherColor(loserColor), reason: "TIMEOUT" });
      }
      continue;
    }
    await finalizeMatch(m, { winnerColor: otherColor(loserColor), reason: "TIMEOUT" });
  }

  // 2) abandonment (offline players in active matches)
  for (const [key, ts] of abandonedAt) {
    if (nowMs() - ts < ABANDON_AFTER_MS) continue;
    const [matchId, userId] = key.split(":");
    const m = await db.gameMatch.findUnique({ where: { id: matchId } });
    if (!m || m.status !== "ACTIVE" || isOnline(matchId, userId)) { abandonedAt.delete(key); continue; }
    abandonedAt.delete(key);
    if (m.vsBot) {
      await db.gameMatch.update({
        where: { id: matchId }, data: { status: "FINISHED", reason: "ABORTED", winnerId: null, endedAt: now },
      }).catch(() => {});
      io.to(matchId).emit("game:match:ended", {
        matchId, result: { winnerId: null, reason: "ABORTED", isDraw: false },
        pointsDelta: {}, movePoints: null, endedAt: now.toISOString(),
      });
    } else {
      const winnerColor = m.playerXId === userId ? otherColor(m.hostColor) : m.hostColor;
      await finalizeMatch(m, { winnerColor, reason: "ABANDON" });
    }
  }

  // 3) dead lobby tables
  const staleCutoff = new Date(now - STALE_TABLE_MS);
  const dead = await db.gameMatch.findMany({ where: { status: "WAITING", createdAt: { lt: staleCutoff } }, take: 50 });
  for (const t of dead) {
    dequeueUser(t.playerXId, t.id);
    await db.gameMatch.update({
      where: { id: t.id }, data: { status: "FINISHED", reason: "ABORTED", winnerId: null, endedAt: now },
    }).catch(() => {});
  }
  if (dead.length > 0) pushLobby();

  // 4) season rollover check (cheap — one query when nothing expired)
  await ensureSeason().catch((e) => console.error("[games] season check failed:", e.message));
}

/* ── socket handlers ──────────────────────────────────────── */

function err(socket, message) {
  socket.emit("game:error", { message });
}

async function attach(socket, user) {
  socket.data.gameRooms = new Set();

  socket.on("game:subscribe", async () => {
    socket.join(LOBBY_ROOM);
    socket.emit("game:lobby", { matches: await lobbyDTO() });

    // auto-resume: if I'm in a live match, pull me straight back in
    const live = await db.gameMatch.findFirst({
      where: {
        status: "ACTIVE",
        OR: [{ playerXId: user.id }, { playerOId: user.id }],
      },
      orderBy: { lastMoveAt: "desc" },
    });
    if (live) {
      socket.join(live.id);
      joinPresence(live.id, user.id);
      socket.data.gameRooms.add(live.id);
      socket.emit("game:resume", { match: await matchDTO(live, user.id) });
    }
  });

  socket.on("game:unsubscribe", () => {
    socket.leave(LOBBY_ROOM);
  });

  socket.on("game:quick", async (payload) => {
    const game = payload?.game;
    if (!engineFor(game)) return err(socket, "Unknown game.");
    if (!rateAllow("quick", user.id, 6, 60_000)) return err(socket, "Easy — too many match requests. Wait a minute.");

    dequeueUser(user.id); // drop any of my older queue entries/tables
    const mine = await db.gameMatch.findFirst({
      where: { playerXId: user.id, status: "WAITING" },
      orderBy: { createdAt: "desc" },
    });
    if (mine) {
      await db.gameMatch.update({
        where: { id: mine.id }, data: { status: "FINISHED", reason: "ABORTED", winnerId: null, endedAt: new Date() },
      }).catch(() => {});
    }

    const q = queues.get(game) ?? [];
    const opponent = q.find((e) => e.userId !== user.id && !e.pairing);
    if (opponent) {
      opponent.pairing = true;
      const match = await db.gameMatch.findUnique({ where: { id: opponent.matchId } });
      const started = match && match.status === "WAITING"
        ? await startMatch(match, user.id)
        : null;
      if (started) {
        socket.join(started.id);
        joinPresence(started.id, user.id);
        socket.data.gameRooms.add(started.id);
        // startMatch already emitted game:matched to both players directly
        pushLobby();
        return;
      }
      // table died — remove and fall through to creating a new one
      queues.set(game, (queues.get(game) ?? []).filter((e) => e !== opponent));
    }

    const match = await createMatch({ game, hostId: user.id, vsBot: false });
    queues.set(game, [...(queues.get(game) ?? []), { userId: user.id, socketId: socket.id, matchId: match.id }]);
    socket.join(match.id);
    joinPresence(match.id, user.id);
    socket.data.gameRooms.add(match.id);
    socket.emit("game:waiting", { match: await matchDTO(match, user.id) });
    pushLobby();
  });

  socket.on("game:bot", async (payload) => {
    const game = payload?.game;
    if (!engineFor(game)) return err(socket, "Unknown game.");
    if (!rateAllow("bot", user.id, 8, 60_000)) return err(socket, "Easy — too many bot games. Wait a minute.");

    const match = await createMatch({ game, hostId: user.id, vsBot: true });
    socket.join(match.id);
    joinPresence(match.id, user.id);
    socket.data.gameRooms.add(match.id);
    socket.emit("game:matched", { match: await matchDTO(match, user.id) });
    if (match.turn !== match.hostColor) scheduleBotMove(match.id);
  });

  socket.on("game:join", async (payload) => {
    const matchId = payload?.matchId;
    if (typeof matchId !== "string" || !/^[a-zA-Z0-9-]{5,40}$/.test(matchId)) return err(socket, "Bad match id.");
    const match = await db.gameMatch.findUnique({ where: { id: matchId } });
    if (!match) return err(socket, "Match not found.");

    // join as the guest of a waiting table
    if (match.status === "WAITING" && match.playerXId !== user.id) {
      if (!rateAllow("join", user.id, 12, 60_000)) return err(socket, "Too many joins — wait a moment.");
      const started = await startMatch(match, user.id);
      if (!started) return err(socket, "Someone beat you to that table.");
      socket.join(started.id);
      joinPresence(started.id, user.id);
      socket.data.gameRooms.add(started.id);
      // startMatch already emitted game:matched to both players directly
      return;
    }

    // reconnect / spectate / finished view
    socket.join(match.id);
    joinPresence(match.id, user.id);
    socket.data.gameRooms.add(match.id);
    socket.emit("game:state", { match: await matchDTO(match, user.id) });
    if (match.status === "ACTIVE" && match.vsBot && match.turn !== match.hostColor) {
      scheduleBotMove(match.id); // bot resumes if it was "thinking"
    }
  });

  socket.on("game:move", async (payload) => {
    const matchId = payload?.matchId;
    const move = payload?.move;
    if (typeof matchId !== "string" || !move || typeof move !== "object") return err(socket, "Bad move.");
    const match = await db.gameMatch.findUnique({ where: { id: matchId } });
    if (!match) return err(socket, "Match not found.");
    if (match.status !== "ACTIVE") return err(socket, "This match is over.");

    const myColor = colorOf(match, user.id);
    if (!myColor) return err(socket, "You're only watching this one.");
    if (match.turn !== myColor) return err(socket, "Not your turn yet.");

    const engine = engineFor(match.game);
    const state = JSON.parse(match.state);
    let r;
    try {
      r = engine.applyMove(state, move);
    } catch (e) {
      console.error(`[games] illegal move rejected: match=${matchId} user=${user.id} turn=${match.turn} myColor=${myColor} move=${JSON.stringify(move)} state.moves=${state.moves?.length} err=${e.message}`);
      return err(socket, "That move isn't legal.");
    }

    drawOffers.delete(match.id);
    const { updated } = await persistMove(match, r.state, r.done, r.result, myColor);
    broadcastMove(updated, r.state, myColor);

    if (r.done) {
      await finalizeMatch(updated, r.result ?? { winnerColor: null, reason: "ABORTED" });
    } else if (updated.vsBot && updated.turn !== updated.hostColor) {
      scheduleBotMove(updated.id);
    }
  });

  socket.on("game:resign", async (payload) => {
    const matchId = payload?.matchId;
    const match = await db.gameMatch.findUnique({ where: { id: matchId } });
    if (!match || match.status !== "ACTIVE") return err(socket, "Nothing to resign from.");
    const myColor = colorOf(match, user.id);
    if (!myColor) return err(socket, "You're only watching this one.");
    await finalizeMatch(match, { winnerColor: otherColor(myColor), reason: "RESIGN" });
  });

  socket.on("game:draw:offer", async (payload) => {
    const matchId = payload?.matchId;
    const match = await db.gameMatch.findUnique({ where: { id: matchId } });
    if (!match || match.status !== "ACTIVE" || match.vsBot) return;
    if (!colorOf(match, user.id)) return;
    drawOffers.set(matchId, { by: user.id, at: nowMs() });
    socket.to(matchId).emit("game:draw:offered", { matchId, by: user.id });
  });

  socket.on("game:draw:accept", async (payload) => {
    const matchId = payload?.matchId;
    const offer = drawOffers.get(matchId);
    const match = await db.gameMatch.findUnique({ where: { id: matchId } });
    if (!match || match.status !== "ACTIVE") return;
    if (!offer || offer.by === user.id) return err(socket, "No draw on the table.");
    if (nowMs() - offer.at > DRAW_OFFER_TTL) { drawOffers.delete(matchId); return; }
    await finalizeMatch(match, { winnerColor: null, reason: "DRAW_AGREED" });
  });

  socket.on("game:draw:decline", (payload) => {
    const matchId = payload?.matchId;
    const offer = drawOffers.get(matchId);
    if (offer && offer.by !== user.id) {
      drawOffers.delete(matchId);
      socket.to(matchId).emit("game:draw:declined", { matchId });
    }
  });

  socket.on("game:chat", async (payload) => {
    const matchId = payload?.matchId;
    const text = typeof payload?.text === "string" ? payload.text.trim().slice(0, 300) : "";
    if (!matchId || !text) return;
    if (!rateAllow("gchat", user.id, 8, 10_000)) return err(socket, "Easy — chat timeout a few seconds.");
    const match = await db.gameMatch.findUnique({ where: { id: matchId } });
    if (!match) return;
    if (!colorOf(match, user.id)) return; // players only
    io.to(matchId).emit("game:chat:new", {
      matchId,
      message: { id: `${nowMs()}-${Math.random().toString(36).slice(2, 8)}`, userId: user.id, name: user.name, text, at: new Date().toISOString() },
    });
  });

  socket.on("game:rematch", async (payload) => {
    const matchId = payload?.matchId;
    const match = await db.gameMatch.findUnique({ where: { id: matchId } });
    if (!match || match.status !== "FINISHED") return err(socket, "Finish this one first.");
    if (!colorOf(match, user.id)) return err(socket, "Players only.");

    if (match.vsBot) {
      const fresh = await createMatch({
        game: match.game, hostId: user.id, vsBot: true,
        hostColor: otherColor(match.hostColor), // swap colors
      });
      socket.join(fresh.id);
      joinPresence(fresh.id, user.id);
      socket.data.gameRooms.add(fresh.id);
      socket.emit("game:matched", { match: await matchDTO(fresh, user.id) });
      if (fresh.turn !== fresh.hostColor) scheduleBotMove(fresh.id);
      return;
    }
    if (!match.playerOId) return;

    const set = rematchRequests.get(matchId) ?? new Set();
    set.add(user.id);
    rematchRequests.set(matchId, set);
    if (set.size < 2) {
      socket.to(matchId).emit("game:rematch:asked", { matchId, by: user.id });
      return;
    }
    rematchRequests.delete(matchId);
    const fresh = await createMatch({
      game: match.game,
      hostId: match.playerOId, // guest hosts the rematch
      vsBot: false,
      hostColor: otherColor(match.hostColor),
    });
    const started = await startMatch(fresh, match.playerXId);
    if (!started) return;
    // pull both players' live sockets into the fresh room so moves/chat/draws flow
    joinUsersToMatch(started.id, [started.playerXId, started.playerOId]);
    for (const uid of [started.playerXId, started.playerOId]) {
      broadcastToUser(uid, "game:matched", { match: await matchDTO(started, uid) });
    }
    io.to(matchId).emit("game:rematch:moved", { matchId, newMatchId: started.id });
  });

  socket.on("game:cancel", async (payload) => {
    const matchId = payload?.matchId;
    const match = await db.gameMatch.findUnique({ where: { id: matchId } });
    if (!match || match.status !== "WAITING") return;
    if (match.playerXId !== user.id) return err(socket, "Only the host can cancel.");
    dequeueUser(user.id, matchId);
    await db.gameMatch.update({
      where: { id: matchId }, data: { status: "FINISHED", reason: "ABORTED", winnerId: null, endedAt: new Date() },
    }).catch(() => {});
    socket.leave(matchId);
    socket.emit("game:cancelled", { matchId });
    pushLobby();
  });

  socket.on("game:leave", (payload) => {
    const matchId = payload?.matchId;
    if (typeof matchId !== "string") return;
    socket.leave(matchId);
    socket.data.gameRooms?.delete(matchId);
    leavePresence(matchId, user.id, socket);
  });

  socket.on("game:claim:timeout", async (payload) => {
    const matchId = payload?.matchId;
    const match = await db.gameMatch.findUnique({ where: { id: matchId } });
    if (!match || match.status !== "ACTIVE") return;
    if (!colorOf(match, user.id)) return;
    const limit = turnLimitSec(match.game) * 1000;
    if (Date.now() - match.lastMoveAt.getTime() < limit) return; // too eager
    const loserColor = match.turn;
    await finalizeMatch(match, { winnerColor: otherColor(loserColor), reason: "TIMEOUT" });
  });
}

function onDisconnect(socket) {
  const user = socket.data?.user;
  const rooms = socket.data?.gameRooms;
  if (!user || !rooms) return;
  for (const matchId of rooms) {
    leavePresence(matchId, user.id, socket);
  }
  if (user) {
    for (const [game, q] of queues) {
      const mine = q.find((e) => e.userId === user.id && e.socketId === socket.id);
      if (mine) {
        // host socket gone — the table stays listed for others until swept
        queues.set(game, q.filter((e) => e !== mine));
      }
    }
  }
}

/* ── init ─────────────────────────────────────────────────── */

function init({ io: ioRef, db: dbRef }) {
  io = ioRef;
  db = dbRef;
  sweepTimer = setInterval(() => {
    sweep().catch((e) => console.error("[games] sweep failed:", e.message));
  }, SWEEP_MS);
  sweepTimer.unref?.();
  console.log("[games] game zone ready — engines:", Object.keys(ENGINES).join(", "));
}

module.exports = { init, attach, onDisconnect, ensureSeason, POINTS, PRIZES };
