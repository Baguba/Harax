import { io } from "socket.io-client";
import { readFileSync } from "fs";
const jar = readFileSync("/tmp/cookies.txt", "utf8");
const token = jar.split("\n").find(l => l.includes("harax_session"))?.trim().split("\t").pop();
const socket = io("http://localhost:81/?XTransformPort=3003", { path: "/", transports: ["websocket"], auth: { token } });
socket.on("connect", () => {
  socket.emit("room:join", { roomType: "GROUP", roomId: process.argv[2] });
  setTimeout(() => {
    socket.emit("message:send", { roomId: process.argv[2], content: "Real-time chat verified through the gateway ⚡" });
    console.log("sent test message");
    setTimeout(() => process.exit(0), 500);
  }, 800);
});
