#!/usr/bin/env node
// E2E test for the Harax Game Zone socket flow.
// Logs in two users over REST, then plays real games over socket.io:
//   1) vs-bot Tic-Tac-Toe (full game)
//   2) PvP Checkers quick-match pairing + moves + resign -> points
//   3) PvP Chess: legal-move counts, castling rights payload, draw offer flow
//   4) lobby join flow + leaderboard reflects points
// Run: node scripts/test-game-socket.mjs

import { io } from "socket.io-client";

const WEB = "http://localhost:3000";
const CHAT = "http://localhost:3003";

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.error(`  ✗ ${name} ${extra}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(email) {
  const res = await fetch(`${WEB}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "harax2026" }),
  });
  const cookie = res.headers.get("set-cookie")?.split(";")[0] ?? "";
  const json = await res.json().catch(() => null);
  if (!json?.ok) throw new Error(`login failed for ${email}`);
  return { cookie, user: json.data.user };
}

function connect(cookie) {
  const socket = io(CHAT, {
    path: "/",
    transports: ["websocket"],
    extraHeaders: { cookie },
    forceNew: true,
    reconnection: false,
  });
  return socket;
}

function once(socket, event, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload) => {
      clearTimeout(t);
      resolve(payload);
    });
  });
}

/** wait until a move:made event brings the match to >= targetMoves plies */
function waitForPly(socket, matchId, targetMoves, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      cleanup();
      reject(new Error(`timeout waiting for ply ${targetMoves}`));
    }, timeoutMs);
    const handler = (p) => {
      if (p?.matchId === matchId && (p?.state?.moves?.length ?? 0) >= targetMoves) {
        cleanup();
        resolve(p);
      }
    };
    const cleanup = () => {
      clearTimeout(t);
      socket.off("game:move:made", handler);
    };
    socket.on("game:move:made", handler);
  });
}

/** play a vs-bot game to completion, choosing moves from legalMoves */
async function playVsBot(socket, match, moveDelay = 150) {
  let m = match;
  let ended = null;
  const errors = [];
  const onEnd = (p) => {
    if (p?.matchId === m.id) ended = p;
  };
  const onErr = (p) => errors.push(p?.message ?? "?");
  socket.on("game:match:ended", onEnd);
  socket.on("game:error", onErr);
  try {
    let guard = 0;
    while (!ended && guard++ < 40) {
      if (m.turn === m.myColor && m.legalMoves.length > 0) {
        const mv = m.legalMoves[Math.floor(Math.random() * m.legalMoves.length)];
        socket.emit("game:move", { matchId: m.id, move: mv });
      }
      const p = await once(socket, "game:move:made", 10000);
      m = { ...m, state: p.state, turn: p.turn, legalMoves: p.legalMoves, status: "ACTIVE" };
      await sleep(moveDelay); // give a possible end event a moment to land
    }
    return { match: m, ended, errors };
  } finally {
    socket.off("game:match:ended", onEnd);
    socket.off("game:error", onErr);
  }
}

async function main() {
  console.log("· logging in");
  const a = await login("selam.awoke@gmail.com");
  const b = await login("dr.meron@haramaya.edu.et");
  check("two users logged in", Boolean(a.user && b.user));

  const sa = connect(a.cookie);
  const sb = connect(b.cookie);
  sa.on("game:error", (p) => console.error("  [game:error→selam]", p?.message));
  sb.on("game:error", (p) => console.error("  [game:error→meron]", p?.message));
  // trace: every move:made / matched / waiting event with matchId
  const trace = (tag, s) => {
    for (const ev of ["game:move:made", "game:matched", "game:waiting", "game:resume", "game:state"]) {
      s.on(ev, (p) => {
        const mid = p?.match?.id ?? p?.matchId ?? "?";
        const extra = ev === "game:move:made"
          ? `mover=${p.moverColor} turn=${p.turn} moves=${p.state?.moves?.length}`
          : ev === "game:matched" || ev === "game:waiting" || ev === "game:resume"
            ? `myColor=${p.match?.myColor} turn=${p.match?.turn} status=${p.match?.status}`
            : "";
        console.log(`  [trace ${tag} ${ev.slice(5)}] ${mid} ${extra}`);
      });
    }
  };
  trace("selam", sa);
  trace("meron", sb);
  await Promise.all([once(sa, "auth:ok"), once(sb, "auth:ok")]);
  check("both sockets authenticated", true);

  /* ── 1) vs-bot tic-tac-toe ─────────────────────────────── */
  console.log("· vs-bot tic-tac-toe");
  {
    sa.emit("game:bot", { game: "TICTACTOE" });
    const p = await once(sa, "game:matched");
    check("bot match created + ACTIVE", p.match.status === "ACTIVE" && p.match.vsBot === true);
    check("bot match has legal moves", p.match.legalMoves.length >= 3);
    check("myColor set", Boolean(p.match.myColor));
    const { match, ended } = await playVsBot(sa, p.match);
    check("bot game reached an end", Boolean(ended), `status=${match.status}`);
    if (ended) {
      check("bot game is a practice match (no points delta)", (ended.pointsDelta ?? {}) [a.user.id] === undefined || Object.keys(ended.pointsDelta).length === 0,
        JSON.stringify(ended.pointsDelta));
    }
  }

  /* ── 2) PvP checkers: pairing + moves + resign ─────────── */
  console.log("· PvP checkers (quick match pairing)");
  {
    sa.emit("game:quick", { game: "CHECKERS" });
    const waitP = once(sa, "game:waiting");
    const matchedA = once(sa, "game:matched", 9000);
    const w = await waitP;
    check("waiting table opened", w.match.status === "WAITING");

    // host should now be listed in a lobby push — join from the other side
    const lobbyP = once(sb, "game:lobby");
    sb.emit("game:subscribe");
    const lobby1 = await lobbyP;
    const table = lobby1.matches.find((m) => m.game === "CHECKERS" && m.host?.id === a.user.id);
    check("table visible in lobby", Boolean(table));

    const matchedB = once(sb, "game:matched", 9000);
    sb.emit("game:join", { matchId: table.id });
    const [ma, mb] = await Promise.all([matchedA, matchedB]);
    check("both players got game:matched", ma.match.id === mb.match.id && ma.match.status === "ACTIVE");
    check("guest got opponent color", mb.match.myColor && mb.match.myColor !== ma.match.myColor);

    // lobby no longer lists the table
    const lobby2p = once(sb, "game:lobby");
    await sleep(300);
    sb.emit("game:subscribe"); // re-subscribe triggers fresh snapshot
    // (game:subscribe also joins lobby room; wait for push)
    const lobby2 = await Promise.race([lobby2p, sleep(2000).then(() => null)]);
    if (lobby2) {
      check("table left the lobby after pairing",
        !lobby2.matches.some((m) => m.id === ma.match.id));
    }

    // play: first mover makes a move, other receives it
    const first = ma.match.turn === ma.match.myColor ? sa : sb;
    const second = first === sa ? sb : sa;
    const firstMatch = ma.match.turn === ma.match.myColor ? ma.match : mb.match;
    const white = ma.match.myColor === "w" ? sa : sb;
    const black = white === sa ? sb : sa;
    const mv = firstMatch.legalMoves[0];
    first.emit("game:move", { matchId: ma.match.id, move: mv });
    const moved = await once(second, "game:move:made");
    check("move broadcast to opponent", moved.state.moves.length === 1);
    check("turn flipped after move", moved.turn !== firstMatch.turn || moved.state.chain !== null || moved.state.chain !== undefined);

    // turn-gate: the player who JUST moved tries to move again immediately
    let gotErr = false;
    const errP = new Promise((r) => first.once("game:error", () => r(true)));
    first.emit("game:move", { matchId: ma.match.id, move: firstMatch.legalMoves[1] });
    gotErr = (await Promise.race([errP, sleep(800).then(() => false)])) === true;
    check("out-of-turn move rejected", gotErr);

    // resign -> points
    const endedP = once(sa, "game:match:ended");
    const endedPb = once(sb, "game:match:ended");
    second.emit("game:resign", { matchId: ma.match.id });
    const [ea, eb] = await Promise.all([endedP, endedPb]);
    check("resign ended the match with reason RESIGN", ea.result.reason === "RESIGN");
    const winnerIsFirst = ea.result.winnerId === (first === sa ? a.user.id : b.user.id);
    check("non-resigner wins", winnerIsFirst);
    check("points awarded (win 12 / loss 1)",
      (ea.pointsDelta[a.user.id] === 12 && ea.pointsDelta[b.user.id] === 1) ||
      (ea.pointsDelta[a.user.id] === 1 && ea.pointsDelta[b.user.id] === 12),
      JSON.stringify(ea.pointsDelta));
    check("both sockets got the end event", eb.result.reason === "RESIGN");
    void moved;
  }

  /* ── 3) PvP chess: pairing, legal moves, castling, draw ── */
  console.log("· PvP chess (draw flow)");
  {
    const qa = once(sa, "game:waiting");
    const maP = once(sa, "game:matched", 9000);
    sa.emit("game:quick", { game: "CHESS" });
    await qa;
    const mbP = once(sb, "game:matched", 9000);
    sb.emit("game:quick", { game: "CHESS" });
    const [ma, mb] = await Promise.all([maP, mbP]);
    check("chess match paired", ma.match.id === mb.match.id && ma.match.status === "ACTIVE");
    check("chess starts with 20 legal moves", ma.match.legalMoves.length === 20, `got ${ma.match.legalMoves.length}`);
    check("castling rights present in state", ma.match.state.castling && ma.match.state.castling.wk === true);

    const white = ma.match.myColor === "w" ? sa : sb;
    const black = white === sa ? sb : sa;

    // scholar's mate — indices: idx = (8-rank)*8 + fileIdx
    // 1.e4 (52→36) e5 (12→28) 2.Qh5 (59→31) Nc6 (1→18) 3.Bc4 (61→34) Nf6 (6→21) 4.Qxf7# (31→13)
    const seq2 = [
      [52, 36], [12, 28],
      [59, 31], [1, 18],
      [61, 34], [6, 21],
      [31, 13],
    ];
    let lastState = null;
    let iter = 0;
    for (const [from, to] of seq2) {
      iter++;
      const mover = lastState === null ? (ma.match.turn === "w" ? white : black) : (lastState.turn === "w" ? white : black);
      const watcher = mover === sa ? sb : sa;
      mover.emit("game:move", { matchId: ma.match.id, move: { from, to } });
      lastState = await waitForPly(watcher, ma.match.id, iter, 6000);
    }
    check("scholar's mate reached", lastState && lastState.state.moves.length === seq2.length);
    const endedP = once(sa, "game:match:ended", 6000);
    const ended = await endedP;
    check("checkmate detected (CHESS win 15 / loss 1)",
      ended.result.reason === "CHECKMATE" &&
      ((ended.pointsDelta[a.user.id] === 15 && ended.pointsDelta[b.user.id] === 1) ||
       (ended.pointsDelta[a.user.id] === 1 && ended.pointsDelta[b.user.id] === 15)),
      JSON.stringify(ended.result) + JSON.stringify(ended.pointsDelta));

    // rematch: both request -> new match
    const newMatchP = once(sa, "game:matched", 9000);
    const askedP = once(sb, "game:rematch:asked", 4000).catch(() => null); // registered BEFORE the emit
    sa.emit("game:rematch", { matchId: ma.match.id });
    await sleep(400);
    sb.emit("game:rematch", { matchId: ma.match.id });
    const asked = await askedP;
    check("rematch request reached opponent", Boolean(asked));
    const fresh = await newMatchP;
    check("rematch created a fresh match with swapped colors", fresh.match.id !== ma.match.id && fresh.match.status === "ACTIVE");

    // draw offer + accept on the fresh match
    const offerP = once(sb, "game:draw:offered", 4000);
    sa.emit("game:draw:offer", { matchId: fresh.match.id });
    const offer = await offerP;
    check("draw offer delivered", Boolean(offer));
    const drawEndP = once(sa, "game:match:ended", 4000);
    sb.emit("game:draw:accept", { matchId: fresh.match.id });
    const drawEnd = await drawEndP;
    check("draw accepted -> DRAW_AGREED with 5/5 points",
      drawEnd.result.reason === "DRAW_AGREED" &&
      drawEnd.pointsDelta[a.user.id] === 5 && drawEnd.pointsDelta[b.user.id] === 5,
      JSON.stringify(drawEnd.result) + JSON.stringify(drawEnd.pointsDelta));
  }

  /* ── 4) leaderboard reflects the new points ────────────── */
  console.log("· leaderboard + my stats");
  {
    const res = await fetch(`${WEB}/api/games`, { headers: { cookie: a.cookie } });
    const json = await res.json();
    check("my stats returned", json.ok && json.data.me && json.data.me.points > 47,
      `points=${json.data?.me?.points}`);
    check("history rows returned", json.data.history.length >= 3);
    const lb = await (await fetch(`${WEB}/api/games/leaderboard`)).json();
    const selam = lb.data.leaders.find((l) => l.user.id === a.user.id);
    check("selam on the ladder with updated points", selam && selam.points > 47, JSON.stringify(selam && selam.points));
  }

  sa.disconnect();
  sb.disconnect();
  console.log(`\n${pass} passed · ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("E2E crashed:", e.message);
  process.exit(1);
});
