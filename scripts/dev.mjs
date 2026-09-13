#!/usr/bin/env node
/**
 * Harax dev orchestrator — one command runs everything:
 *
 *   [web]  Next.js        → http://localhost:3000
 *   [chat] socket.io svc  → :3003 (real-time) + 127.0.0.1:3011 (control)
 *
 * If a healthy chat service is already running (e.g. started separately,
 * as in the hosting sandbox), it is reused instead of racing for the port.
 * If the chat service dies entirely, the app keeps working — chat falls
 * back to REST sends + polling.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import http from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CHAT_HEALTH = "http://127.0.0.1:3011/health";
const children = [];

const withTag = (tag) => (chunk) => {
  for (const line of String(chunk).split("\n")) {
    if (line.trim()) process.stdout.write(`[${tag}] ${line}\n`);
  }
};

function probe(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 1500 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  let chat = null;

  if (await probe(CHAT_HEALTH)) {
    console.log("[chat] already running on :3003 — reusing it");
  } else {
    chat = spawn(process.execPath, ["mini-services/chat-service/index.js"], {
      cwd: root,
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL || "file:../db/custom.db" },
    });
    children.push(chat);
    chat.stdout.on("data", withTag("chat"));
    chat.stderr.on("data", withTag("chat"));
    chat.once("exit", async (code) => {
      if (shuttingDown) return;
      await sleep(500);
      if (await probe(CHAT_HEALTH)) {
        console.log("[chat] another instance owns :3003 — continuing with it");
      } else {
        console.log(`[chat] exited (code ${code}) — chat continues over REST/polling`);
      }
    });
  }

  const nextBin = require.resolve("next/dist/bin/next");
  const web = spawn(process.execPath, [nextBin, "dev", "-p", "3000"], {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: "1", NO_COLOR: undefined },
  });
  children.push(web);
  web.stdout.on("data", withTag("web"));
  web.stderr.on("data", withTag("web"));
  web.once("exit", (code) => {
    if (shuttingDown) return;
    console.log(`[web] exited (code ${code}) — shutting down`);
    if (chat) chat.kill("SIGTERM");
    process.exit(code ?? 0);
  });

  console.log(`harax dev: web on http://localhost:3000 · chat on :3003`);
}

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[dev] ${signal} received — stopping web + chat`);
  for (const child of children) child.kill("SIGTERM");
  await sleep(400);
  process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  main().catch((e) => {
    console.error("[dev] fatal:", e);
    process.exit(1);
  });
}
