import { io } from "socket.io-client";
import { readFileSync } from "fs";
const jar = readFileSync("/tmp/cookies.txt", "utf8");
const token = jar.split("\n").find(l => l.includes("harax_session"))?.trim().split("\t").pop();
const socket = io("http://localhost:81/?XTransformPort=3003", { path: "/", transports: ["websocket", "polling"], auth: { token } });
const t = setTimeout(() => { console.log("FAIL: timeout"); process.exit(1); }, 9000);
socket.on("connect", () => {
  console.log("connected");
  socket.emit("room:join", { roomType: "GROUP", roomId: process.argv[2] });
});
socket.on("history", (e) => {
  console.log("history:", e.messages.length);
  socket.emit("message:send", { roomId: process.argv[2], content: "Round-trip verified ⚡ " + Date.now() });
});
socket.on("message:new", (m) => {
  clearTimeout(t);
  console.log("ROUND-TRIP OK:", m.content, "| sender:", m.sender?.name, "| room:", m.roomId);
  process.exit(0);
});
socket.on("room:error", (e) => console.log("room:error:", e));
socket.on("auth:error", (e) => console.log("auth:error:", e));
socket.on("rate:error", (e) => console.log("rate:error:", e));
socket.on("connect_error", (e) => console.log("connect_error:", e.message));
