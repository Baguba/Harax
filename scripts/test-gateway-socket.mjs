// Test the exact socket connection the Game Zone client makes,
// both direct (localhost) and through the gateway (preview URL style).
import { io } from "socket.io-client";
import http from "node:http";

function wsUpgradeTest(origin, query) {
  return new Promise((resolve) => {
    const url = new URL(query, origin);
    const req = http.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      method: "GET",
      headers: {
        Connection: "Upgrade",
        Upgrade: "websocket",
        "Sec-WebSocket-Version": "13",
        "Sec-WebSocket-Key": Buffer.from(Math.random().toString()).toString("base64"),
      },
      timeout: 4000,
    });
    req.on("response", (res) => resolve(`HTTP ${res.statusCode} (no upgrade)`));
    req.on("upgrade", (res) => resolve(`101 UPGRADED (websocket ok)`));
    req.on("error", (e) => resolve(`ERROR ${e.message}`));
    req.on("timeout", () => { req.destroy(); resolve("TIMEOUT"); });
    req.end();
  });
}

function socketTest(label, url, opts) {
  return new Promise((resolve) => {
    const socket = io(url, opts);
    const t = setTimeout(() => { socket.disconnect(); resolve(`${label}: TIMEOUT (never connected)`); }, 6000);
    socket.on("connect", () => {
      clearTimeout(t);
      const transport = socket.io.engine.transport.name;
      socket.disconnect();
      resolve(`${label}: CONNECTED via ${transport}`);
    });
    socket.on("connect_error", (e) => {
      clearTimeout(t);
      socket.disconnect();
      resolve(`${label}: CONNECT_ERROR ${e.message}`);
    });
  });
}

console.log("--- raw WS upgrade tests ---");
console.log("direct 3003:", await wsUpgradeTest("http://localhost:3003", "/?EIO=4&transport=websocket"));
console.log("gateway 81 :", await wsUpgradeTest("http://localhost:81", "/?EIO=4&transport=websocket&XTransformPort=3003"));

console.log("--- socket.io client tests (same options as use-game-socket.ts) ---");
const opts = { path: "/", transports: ["websocket", "polling"], withCredentials: true, forceNew: true, reconnectionAttempts: 2, reconnectionDelay: 500 };
console.log(await socketTest("direct", "http://localhost:3003", { ...opts }));
console.log(await socketTest("gateway", "http://localhost:81/?XTransformPort=3003", { ...opts }));
process.exit(0);
