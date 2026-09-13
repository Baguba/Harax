import { io } from "socket.io-client";
import { readFileSync } from "fs";

// extract session cookie from cookie jar
const jar = readFileSync("/tmp/cookies.txt", "utf8");
const token = jar.split("\n").find(l => l.includes("harax_session"))?.trim().split("\t").pop();
console.log("token shape ok:", /^[a-f0-9]{64}$/.test(token));

const socket = io("http://localhost:81/?XTransformPort=3003", {
  path: "/",
  transports: ["websocket", "polling"],
  auth: { token },
});

let ok = false;
const timeout = setTimeout(() => { if (!ok) { console.log("FAIL: no message round-trip"); process.exit(1); } }, 8000);

socket.on("connect", () => {
  console.log("connected:", socket.id);
  // find a group first via REST
  socket.emit("room:join", { roomType: "GROUP", roomId: process.argv[2] });
});
socket.on("auth:error", (e) => console.log("auth:error", e));
socket.on("room:error", (e) => console.log("room:error", e));
socket.on("history", (e) => console.log("history loaded:", e.messages.length, "messages"));
socket.on("message:new", (m) => {
  ok = true;
  clearTimeout(timeout);
  console.log("RECEIVED broadcast:", m.content);
  process.exit(0);
});
socket.on("connect_error", (e) => console.log("connect_error:", e.message));
