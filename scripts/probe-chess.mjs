#!/usr/bin/env node
// Focused probe: PvP chess quick-match, first white move e2-e4.
import { io } from "socket.io-client";

const WEB = "http://localhost:3000";
const CHAT = "http://localhost:3003";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(email) {
  const res = await fetch(`${WEB}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "harax2026" }),
  });
  const json = await res.json().catch(() => null);
  if (!json?.ok) throw new Error(`login failed: ${JSON.stringify(json)}`);
  return res.headers.get("set-cookie").split(";")[0];
}

const ca = await login("selam.awoke@gmail.com");
const cb = await login("dr.meron@haramaya.edu.et");
const sa = io(CHAT, { path: "/", transports: ["websocket"], extraHeaders: { cookie: ca }, forceNew: true, reconnection: false });
const sb = io(CHAT, { path: "/", transports: ["websocket"], extraHeaders: { cookie: cb }, forceNew: true, reconnection: false });

const log = (...a) => console.log("…", ...a);
for (const [tag, s] of [["selam", sa], ["meron", sb]]) {
  for (const ev of ["game:error", "game:matched", "game:waiting", "game:move:made", "game:match:ended", "game:resume", "game:state"]) {
    s.on(ev, (p) => log(`[${tag} ${ev}]`, JSON.stringify(p)?.slice(0, 220)));
  }
}

await Promise.all([
  new Promise((r) => sa.once("connect", r)),
  new Promise((r) => sb.once("connect", r)),
]);
log("connected");

sa.emit("game:quick", { game: "CHESS" });
await new Promise((r) => sa.once("game:waiting", r));
log("selam waiting");
sb.emit("game:quick", { game: "CHESS" });

// figure out who is white from the matched payloads
const payloadA = await new Promise((r) => sa.once("game:matched", r));
await sleep(500);
const m = payloadA.match;
log(`match ${m.id} — selam myColor=${m.myColor} turn=${m.turn} legal=${m.legalMoves.length}`);

const white = m.myColor === "w" ? sa : sb;
white.emit("game:move", { matchId: m.id, move: { from: 52, to: 36 } });
log("white emitted e2e4");

await sleep(3000);
log("done");
sa.disconnect();
sb.disconnect();
process.exit(0);
