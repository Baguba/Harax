#!/usr/bin/env node
/**
 * Harax production start — `next start` on :3000 + chat service on :3003.
 * Run `npm run build` first.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const children = [];

const withTag = (tag) => (chunk) => {
  for (const line of String(chunk).split("\n")) {
    if (line.trim()) process.stdout.write(`[${tag}] ${line}\n`);
  }
};

const chat = spawn(process.execPath, ["mini-services/chat-service/index.js"], {
  cwd: root,
  env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL || "file:../db/custom.db" },
});
children.push(chat);
chat.stdout.on("data", withTag("chat"));
chat.stderr.on("data", withTag("chat"));

const nextBin = require.resolve("next/dist/bin/next");
const web = spawn(process.execPath, [nextBin, "start", "-p", "3000"], { cwd: root });
children.push(web);
web.stdout.on("data", withTag("web"));
web.stderr.on("data", withTag("web"));
web.once("exit", (code) => {
  if (shuttingDown) return;
  console.log(`[web] exited (code ${code})`);
  for (const c of children) c.kill("SIGTERM");
  process.exit(code ?? 0);
});

console.log("harax prod: web on http://localhost:3000 · chat on :3003");

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[start] ${signal} received — stopping`);
  for (const c of children) c.kill("SIGTERM");
  setTimeout(() => process.exit(0), 400);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
