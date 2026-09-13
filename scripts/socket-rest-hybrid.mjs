// Verifies: REST send → chat service broadcast → socket-connected peer receives message:new
import { io } from "socket.io-client";
import { readFileSync } from "fs";

const jar = readFileSync("/tmp/cookies.txt", "utf8");
const token = jar.split("\n").find((l) => l.includes("harax_session"))?.trim().split("\t").pop();

const roomType = process.argv[2] ?? "SIDECHAT";
const roomId = process.argv[3];
if (!roomId) {
  console.log("usage: node socket-rest-hybrid.mjs <GROUP|SIDECHAT> <roomId>");
  process.exit(1);
}

const socket = io("http://localhost:81/?XTransformPort=3003", { path: "/", transports: ["websocket", "polling"], auth: { token } });
const t = setTimeout(() => { console.log("FAIL: timeout"); process.exit(1); }, 12000);

socket.on("connect", () => {
  console.log("socket connected");
  socket.emit("room:join", { roomType, roomId });
});

socket.on("history", async () => {
  console.log("joined + history received — now sending via REST as the same user...");
  // send over REST (cookie auth)
  const base = roomType === "GROUP" ? "http://localhost:3000/api/groups" : "http://localhost:3000/api/sidechat";
  const res = await fetch(`${base}/${roomId}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `harax_session=${token}` },
    body: JSON.stringify({ content: `hybrid rest->socket ${Date.now()}` }),
  });
  const json = await res.json().catch(() => null);
  console.log("REST send:", res.status, json?.ok ? "ok" : JSON.stringify(json).slice(0, 120));
  if (!json?.ok) {
    clearTimeout(t);
    console.log("FAIL: REST send failed");
    process.exit(1);
  }
});

socket.on("message:new", (m) => {
  clearTimeout(t);
  console.log("SOCKET RECEIVED:", m.content, "| anon:", m.anonName, "| sender:", m.sender?.name ?? "(anonymous)");
  console.log("HYBRID ROUND-TRIP OK");
  process.exit(0);
});

socket.on("auth:error", (e) => console.log("auth:error:", e));
socket.on("room:error", (e) => console.log("room:error:", e));
socket.on("connect_error", (e) => console.log("connect_error:", e.message));
