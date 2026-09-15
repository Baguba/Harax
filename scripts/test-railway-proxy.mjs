#!/usr/bin/env node
/**
 * Verifies the Railway single-port proxy end to end, using the SAME URL
 * strategy production browsers use (same-origin /?XTransformPort=3003).
 *
 * Usage: node scripts/test-railway-proxy.mjs [publicPort]   (default 8123)
 * Requires `node scripts/start-railway.mjs` to be running with that PORT,
 * after `npm run build`.
 *
 * Checks:
 *  1. GET /                → 200 and HTML contains "Harax"        (web proxy)
 *  2. GET /api/games/health → 200 {"ok":true,...}                 (web → chat control)
 *  3. GET /socket.io/?EIO=4&transport=polling&XTransformPort=3003 → 200 + sid (polling through proxy)
 *  4. socket.io-client connect via "http://host:port/?XTransformPort=3003" (default transports, upgrades to websocket through the proxy)
 *  5. socket.io-client connect with transports:["websocket"] only          (raw WS upgrade through proxy)
 * Exits 0 only if every check passes.
 */
import http from "node:http";
import { io } from "socket.io-client";

const port = Number(process.argv[2] || process.env.PORT || 8123);
const base = `http://127.0.0.1:${port}`;

function get(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.setTimeout(15000, () => req.destroy(new Error("timeout")));
  });
}

function socketConnect(url, opts, label) {
  return new Promise((resolve) => {
    const started = Date.now();
    const s = io(url, { ...opts, reconnection: false, timeout: 12000 });
    const done = (ok, extra = "") => {
      s.close();
      console.log(`${ok ? "PASS" : "FAIL"} ${label} (${Date.now() - started}ms) ${extra}`);
      resolve(ok);
    };
    s.on("connect", () => done(true, `id=${s.id.slice(0, 8)} transport=${s.io.engine.transport.name}`));
    s.on("connect_error", (err) => done(false, String(err && err.message)));
  });
}

const results = [];

const home = await get(`${base}/`);
results.push(["web / 200 + Harax HTML", home.status === 200 && home.body.includes("Harax"), `status=${home.status}`]);

const health = await get(`${base}/api/games/health`);
results.push(["web /api/games/health 200 ok:true", health.status === 200 && health.body.includes('"ok":true'), `status=${health.status} body=${health.body.slice(0, 80)}`]);

const hs = await get(`${base}/socket.io/?EIO=4&transport=polling&XTransformPort=3003`);
const hsOk = hs.status === 200 && hs.body.includes('"sid"');
results.push(["polling handshake via XTransformPort", hsOk, `status=${hs.status} body=${hs.body.slice(0, 60)}`]);

results.push(["socket.io connect (polling→ws upgrade) via /?XTransformPort=3003", await socketConnect(`${base}/?XTransformPort=3003`, {}, "gateway socket")]);
results.push(["socket.io connect websocket-only via /?XTransformPort=3003", await socketConnect(`${base}/?XTransformPort=3003`, { transports: ["websocket"] }, "gateway ws")]);

let allPass = true;
for (const [name, ok, extra = ""] of results) {
  if (!ok) allPass = false;
  if (typeof ok === "boolean" && !extra) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  else if (typeof ok === "boolean" && extra) console.log(`${ok ? "PASS" : "FAIL"} ${name} — ${extra}`);
}
console.log(allPass ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED");
process.exit(allPass ? 0 : 1);
