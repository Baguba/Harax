#!/usr/bin/env node
// Seeds the Game Zone with demo data so the leaderboard + hall of fame feel alive:
//   · Season 1 (current week, Mon Sep 14 2026 EAT) with weekly scores for seeded users
//   · Season 0 (previous week, closed) with winners + prizes
// Idempotent: skips anything that already exists.
//
// Run: node scripts/seed-games.cjs

const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

const WEEK_MS = 7 * 24 * 3600_000;
const EAT = 3 * 3600_000;
const SEASON_ANCHOR = Date.UTC(2026, 8, 14) - EAT; // Mon Sep 14 2026 00:00 EAT

function weekStart(date = new Date()) {
  const eat = new Date(date.getTime() + EAT);
  const daysSinceMonday = (eat.getUTCDay() + 6) % 7;
  const mondayEat = Date.UTC(eat.getUTCFullYear(), eat.getUTCMonth(), eat.getUTCDate() - daysSinceMonday);
  return new Date(mondayEat - EAT);
}

const PRIZES = {
  1: "Gold champion trophy + 500 ETB campus voucher",
  2: "Silver trophy + 300 ETB campus voucher",
  3: "Bronze trophy + 150 ETB campus voucher",
};

async function main() {
  const now = new Date();
  const start = weekStart(now);
  const index = Math.floor((start.getTime() - SEASON_ANCHOR) / WEEK_MS) + 1;
  const prevStart = new Date(start.getTime() - WEEK_MS);
  const prevIndex = index - 1;

  // ── current season ────────────────────────────────────────
  let current = await db.gameSeason.findUnique({ where: { index } });
  if (!current) {
    current = await db.gameSeason.create({
      data: { index, startsAt: start, endsAt: new Date(start.getTime() + WEEK_MS) },
    });
    console.log(`created current season #${index} (${start.toISOString()} → +7d)`);
  } else {
    console.log(`current season #${index} already exists`);
  }

  // ── past (closed) season ──────────────────────────────────
  let past = await db.gameSeason.findUnique({ where: { index: prevIndex } });
  if (!past) {
    past = await db.gameSeason.create({
      data: {
        index: prevIndex,
        startsAt: prevStart,
        endsAt: start,
        closed: true,
      },
    });
    console.log(`created past season #${prevIndex} (closed)`);
  } else {
    await db.gameSeason.update({ where: { id: past.id }, data: { closed: true } });
    console.log(`past season #${prevIndex} already exists`);
  }

  // ── pick seeded users ─────────────────────────────────────
  const emails = [
    "selam.awoke@gmail.com",
    "dr.meron@haramaya.edu.et",
    "naol.girma@gmail.com",
    "hanna.gebre@gmail.com",
    "tigist.bekele@gmail.com",
    "dawit.mengistu@gmail.com",
    "fatuma.ahmed@gmail.com",
    "bereket.tesfaye@gmail.com",
    "mahlet.assefa@gmail.com",
    "rediet.girma@gmail.com",
  ];
  const users = [];
  for (const email of emails) {
    const u = await db.user.findUnique({ where: { email } });
    if (u) users.push(u);
    else console.log(`  (skipped unknown user ${email})`);
  }
  if (users.length < 3) {
    console.log("Not enough seeded users found — aborting.");
    return;
  }

  // ── current week scores (deterministic, feels like mid-week) ──
  const currentScores = [
    { i: 0, points: 47, wins: 3, draws: 2, losses: 1 },   // Selam
    { i: 1, points: 38, wins: 2, draws: 3, losses: 0 },   // Dr. Meron
    { i: 2, points: 35, wins: 3, draws: 0, losses: 2 },
    { i: 3, points: 29, wins: 2, draws: 2, losses: 1 },
    { i: 4, points: 22, wins: 1, draws: 4, losses: 1 },
    { i: 5, points: 18, wins: 1, draws: 3, losses: 0 },
    { i: 6, points: 15, wins: 1, draws: 1, losses: 2 },
    { i: 7, points: 12, wins: 1, draws: 0, losses: 3 },
    { i: 8, points: 6, wins: 0, draws: 3, losses: 0 },
    { i: 9, points: 4, wins: 0, draws: 2, losses: 0 },
  ];
  for (const s of currentScores) {
    if (s.i >= users.length) break;
    const user = users[s.i];
    await db.seasonScore.upsert({
      where: { seasonId_userId: { seasonId: current.id, userId: user.id } },
      create: { seasonId: current.id, userId: user.id, points: s.points, wins: s.wins, draws: s.draws, losses: s.losses },
      update: {},
    });
  }
  console.log(`seeded ${Math.min(currentScores.length, users.length)} current-season scores`);

  // ── past season: scores + winners ─────────────────────────
  const pastScores = [
    { i: 2, points: 61, wins: 4, draws: 1, losses: 1 },
    { i: 5, points: 44, wins: 3, draws: 2, losses: 0 },
    { i: 0, points: 39, wins: 2, draws: 3, losses: 2 },
    { i: 7, points: 21, wins: 1, draws: 3, losses: 1 },
    { i: 8, points: 9, wins: 0, draws: 4, losses: 1 },
  ];
  for (const s of pastScores) {
    if (s.i >= users.length) break;
    const user = users[s.i];
    await db.seasonScore.upsert({
      where: { seasonId_userId: { seasonId: past.id, userId: user.id } },
      create: { seasonId: past.id, userId: user.id, points: s.points, wins: s.wins, draws: s.draws, losses: s.losses },
      update: {},
    });
    const rank = [1, 2, 3].includes(pastScores.indexOf(s) + 1) ? pastScores.indexOf(s) + 1 : null;
    if (rank) {
      await db.gameWinner.upsert({
        where: { seasonId_userId: { seasonId: past.id, userId: user.id } },
        create: { seasonId: past.id, userId: user.id, rank, points: s.points, prize: PRIZES[rank] },
        update: {},
      });
    }
  }
  console.log("seeded past-season scores + top-3 winners (hall of fame)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
