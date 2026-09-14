#!/usr/bin/env node
// Minimal probe: bot match + one move, with full event logging.
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
  return res.headers.get("set-cookie").split(";")[0];
}

const cookie = await login("selam.awoke@gmail.com");
const s = io(CHAT, { path: "/", transports: ["websocket"], extraHeaders: { cookie }, forceNew: true, reconnection: false });

const log = (...a) => console.log("…", ...a);
for (const ev of ["connect", "disconnect", "auth:ok", "auth:error", "game:error", "game:matched", "game:waiting", "game:state", "game:move:made", "game:match:ended", "connect_error"]) {
  s.on(ev, (p) => log(`[${ev}]`, JSON.stringify(p)?.slice(0, 300)));
}

await new Promise((r) => s.on("connect", r));
log("connected, requesting bot match");
s.emit("game:bot", { game: "TICTACTOE" });

const matched = await new Promise((r) => s.once("game:matched", r));
const m = matched.match;
log(`matched — myColor=${m.myColor} turn=${m.turn} legal=${m.legalMoves.length}`);

if (m.turn === m.myColor) {
  log("my turn — emitting move", JSON.stringify(m.legalMoves[0]));
  s.emit("game:move", { matchId: m.id, move: m.legalMoves[0] });
} else {
  log("bot's turn — waiting for its move");
}

await sleep(3000);
log("done waiting — disconnecting");
s.disconnect();
process.exit(0);
