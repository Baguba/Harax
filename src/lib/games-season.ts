/**
 * Game Zone season bridge → chat mini-service.
 *
 * Season rollover (award top-3, close, reopen) lives in ONE place:
 * mini-services/chat-service/games.js. REST routes ping its loopback
 * control endpoint (127.0.0.1:3011) to run ensureSeason() before reading.
 * If the service is down we fall back to a read-only "virtual" season,
 * so the leaderboard still renders.
 */
import { db } from "@/lib/db";

const CHAT_INTERNAL_URL = process.env.CHAT_INTERNAL_URL ?? "http://127.0.0.1:3011";
const CHAT_INTERNAL_TOKEN = process.env.CHAT_INTERNAL_TOKEN ?? "harax-internal-2026";

const WEEK_MS = 7 * 24 * 3600_000;
const EAT_OFFSET_MS = 3 * 3600_000;
const SEASON_ANCHOR = Date.UTC(2026, 8, 14) - EAT_OFFSET_MS; // Mon Sep 14 2026 00:00 EAT

export interface SeasonRow {
  id: string;
  index: number;
  startsAt: Date;
  endsAt: Date;
  closed: boolean;
}

function weekStart(date = new Date()): Date {
  const eat = new Date(date.getTime() + EAT_OFFSET_MS);
  const daysSinceMonday = (eat.getUTCDay() + 6) % 7;
  const mondayEat = Date.UTC(eat.getUTCFullYear(), eat.getUTCMonth(), eat.getUTCDate() - daysSinceMonday);
  return new Date(mondayEat - EAT_OFFSET_MS);
}

/** Ask the game service to roll seasons over; fall back to a virtual row. */
export async function currentSeason(): Promise<SeasonRow> {
  try {
    const res = await fetch(`${CHAT_INTERNAL_URL}/internal/ensure-season`, {
      method: "POST",
      headers: { "x-internal-token": CHAT_INTERNAL_TOKEN },
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const json = (await res.json()) as { ok: boolean; season?: { id: string; index: number; startsAt: string; endsAt: string } };
      if (json.ok && json.season) {
        return {
          id: json.season.id,
          index: json.season.index,
          startsAt: new Date(json.season.startsAt),
          endsAt: new Date(json.season.endsAt),
          closed: false,
        };
      }
    }
  } catch {
    // service down — read-only path below
  }

  const now = new Date();
  const live = await db.gameSeason.findFirst({
    where: { startsAt: { lte: now }, endsAt: { gt: now } },
    orderBy: { index: "desc" },
  });
  if (live) return live;

  // virtual: the week that should be running (scores may lag one rollover behind)
  const start = weekStart(now);
  return {
    id: "virtual",
    index: Math.floor((start.getTime() - SEASON_ANCHOR) / WEEK_MS) + 1,
    startsAt: start,
    endsAt: new Date(start.getTime() + WEEK_MS),
    closed: false,
  };
}
