import { db } from "@/lib/db";
import { ok, fail, readJson } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { eventSchema, firstError } from "@/lib/validation";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { OG } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const timeframe = url.searchParams.get("timeframe") ?? "upcoming"; // upcoming | past | all

  const where: Record<string, unknown> = {};
  if (category && category !== "ALL") where.category = category;
  if (timeframe === "upcoming") where.startsAt = { gte: new Date() };
  if (timeframe === "past") where.startsAt = { lt: new Date() };

  const events = await db.event.findMany({
    where,
    include: {
      organizer: true,
      rsvps: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
    },
    orderBy: { startsAt: timeframe === "past" ? "desc" : "asc" },
    take: 60,
  });

  return ok({
    events: events.map((e) => {
      const going = e.rsvps.filter((r) => r.status === "GOING");
      const interested = e.rsvps.filter((r) => r.status === "INTERESTED");
      const mine = user ? e.rsvps.find((r) => r.userId === user.id)?.status ?? null : null;
      return {
        id: e.id, title: e.title, description: e.description, location: e.location,
        category: e.category, coverUrl: e.coverUrl,
        startsAt: e.startsAt.toISOString(), endsAt: e.endsAt?.toISOString() ?? null,
        createdAt: e.createdAt.toISOString(),
        organizer: { id: e.organizer.id, name: e.organizer.name, avatarUrl: e.organizer.avatarUrl, role: e.organizer.role },
        stats: { going: going.length, interested: interested.length, total: e.rsvps.length },
        myRsvp: mine,
        attendees: e.rsvps.slice(0, 8).map((r) => ({ id: r.user.id, name: r.user.name, avatarUrl: r.user.avatarUrl, status: r.status })),
      };
    }),
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Sign in to create events.", 401);

  const rl = rateLimit({ key: clientKey(req, `event:${user.id}`), max: 5, windowMs: 10 * 60_000 });
  if (!rl.ok) return fail(`Too many events created. Wait ${rl.retryAfterSec}s.`, 429);

  const body = await readJson(req);
  if (!body) return fail("Invalid request body");
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return fail(firstError(parsed.error), 422);

  const startsAt = new Date(parsed.data.startsAt);
  if (isNaN(startsAt.getTime())) return fail("Invalid start date/time.", 422);
  if (startsAt.getTime() < Date.now() - 86400_000) return fail("Start time can't be in the past.", 422);
  let endsAt: Date | null = null;
  if (parsed.data.endsAt) {
    endsAt = new Date(parsed.data.endsAt);
    if (isNaN(endsAt.getTime()) || endsAt < startsAt) return fail("End time must be after the start.", 422);
  }

  const event = await db.event.create({
    data: {
      title: parsed.data.title, description: parsed.data.description,
      location: parsed.data.location, category: parsed.data.category,
      startsAt, endsAt,
      organizerId: user.id,
      coverUrl: parsed.data.coverUrl || OG(parsed.data.title, parsed.data.category),
    },
  });

  await db.rsvp.create({ data: { eventId: event.id, userId: user.id, status: "GOING" } }).catch(() => undefined);

  // fan-out notification to a sample of active users (keep it light for demo)
  const someUsers = await db.user.findMany({ where: { banned: false }, select: { id: true }, take: 200 });
  await db.notification.createMany({
    data: someUsers
      .filter((u) => u.id !== user.id)
      .map((u) => ({
        userId: u.id, type: "EVENT_NEW",
        title: `New event: ${event.title}`,
        body: `${event.location} · ${event.startsAt.toLocaleDateString()}`,
        link: "events",
      })),
  }).catch(() => undefined);

  return ok({ event: { id: event.id, title: event.title } }, 201);
}
