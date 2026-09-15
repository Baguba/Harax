#!/usr/bin/env node
/**
 * Harax Railway entrypoint — one process tree, one public port.
 *
 * Railway exposes exactly ONE public port per service ($PORT). Harax is two
 * services: the Next.js web app and the Socket.IO chat/games mini-service.
 * This script runs both behind a tiny reverse proxy on $PORT so the single
 * Railway domain serves everything:
 *
 *   - Requests whose query carries `XTransformPort=3003` (the app's hosted
 *     socket URL strategy, see src/hooks/use-chat.ts / use-game-socket.ts)
 *     → chat mini-service. Same for any path starting with /socket.io.
 *   - Everything else → Next.js (`next start`).
 *   - WebSocket upgrades are proxied the same way, so socket.io's websocket
 *     transport works end to end.
 *
 * Env:
 *   PORT                public port (Railway sets it; default 3000)
 *   DATABASE_URL        passed through to both children (volume-backed)
 *
 * If either child dies, this process exits non-zero so Railway's restart
 * policy can replace the whole tree.
 */
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const PUBLIC_PORT = Number(process.env.PORT || 3000);
const CHAT_PORT = PUBLIC_PORT === 3003 ? 3013 : 3003; // clients speak "3003" via XTransformPort; we translate
const WEB_PORT = PUBLIC_PORT === 3000 ? 3100 : 3000;

const children = [];
let shuttingDown = false;

const withTag = (tag) => (chunk) => {
  for (const line of String(chunk).split("\n")) {
    if (line.trim()) process.stdout.write(`[${tag}] ${line}\n`);
  }
};

function spawnChild(tag, args, env) {
  const child = spawn(process.execPath, args, { cwd: root, env: { ...process.env, ...env } });
  child.stdout.on("data", withTag(tag));
  child.stderr.on("data", withTag(tag));
  child.once("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`[${tag}] exited unexpectedly (code ${code}, signal ${signal}) — shutting down so the platform can restart us`);
    shutdown("child-exit", 1);
  });
  children.push(child);
  return child;
}

// 1) chat mini-service (Socket.IO + game engines, loopback control :3011)
spawnChild("chat", ["mini-services/chat-service/index.js"], {
  DATABASE_URL: process.env.DATABASE_URL || "file:../db/custom.db",
});

// 2) Next.js web app
const nextBin = require.resolve("next/dist/bin/next");
spawnChild("web", [nextBin, "start", "-p", String(WEB_PORT)], {});

function targetPortFor(reqUrl) {
  try {
    const u = new URL(reqUrl, "http://internal");
    const xt = u.searchParams.get("XTransformPort");
    if (xt === "3003") return CHAT_PORT;
    if (xt && /^\d+$/.test(xt)) return Number(xt); // Caddy-compatible passthrough
    if (u.pathname.startsWith("/socket.io")) return CHAT_PORT;
  } catch {
    /* fall through */
  }
  return null;
}

function proxyRequest(req, res) {
  const target = targetPortFor(req.url) ?? WEB_PORT;
  const upstream = http.request(
    { host: "127.0.0.1", port: target, path: req.url, method: req.method, headers: { ...req.headers, host: req.headers.host } },
    (up) => {
      res.writeHead(up.statusCode, up.headers);
      up.pipe(res);
    },
  );
  upstream.on("error", (err) => {
    if (!res.headersSent) res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: `upstream :${target} unavailable: ${err.code || err.message}` }));
  });
  req.pipe(upstream);
}

function proxyUpgrade(req, socket, head) {
  const target = targetPortFor(req.url) ?? WEB_PORT;
  const upstream = net.connect(target, "127.0.0.1", () => {
    const lines = [`${req.method} ${req.url} HTTP/1.1`];
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      lines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
    }
    upstream.write(lines.join("\r\n") + "\r\n\r\n");
    if (head && head.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
}

const server = http.createServer((req, res) => proxyRequest(req, res));
server.on("upgrade", proxyUpgrade);
server.listen(PUBLIC_PORT, () => {
  console.log(`harax railway: proxy on :${PUBLIC_PORT} → web :${WEB_PORT} · chat :${CHAT_PORT} (+ control :3011 loopback)`);
});

function shutdown(signal, code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[start-railway] ${signal} received — stopping`);
  for (const c of children) c.kill("SIGTERM");
  server.close();
  setTimeout(() => process.exit(code), 400);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
