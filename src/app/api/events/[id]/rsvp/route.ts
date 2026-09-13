import { db } from "@/lib/db";
import { ok, fail, readJson } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return fail("Sign in to RSVP.", 401);

  const rl = rateLimit({ key: clientKey(req, `rsvp:${user.id}`), max: 30, windowMs: 60_000 });
  if (!rl.ok) return fail("Too many RSVP changes.", 429);

  const event = await db.event.findUnique({ where: { id }, include: { rsvps: true } });
  if (!event) return fail("Event not found.", 404);

  const body = await readJson<{ status?: "GOING" | "INTERESTED" | "NONE" }>(req) ?? {};
  const desired = body.status === "INTERESTED" ? "INTERESTED" : body.status === "NONE" ? "NONE" : "GOING";

  if (desired === "NONE") {
    await db.rsvp.deleteMany({ where: { eventId: id, userId: user.id } });
  } else {
    await db.rsvp.upsert({
      where: { eventId_userId: { eventId: id, userId: user.id } },
      create: { eventId: id, userId: user.id, status: desired },
      update: { status: desired },
    });
  }

  const rsvps = await db.rsvp.findMany({ where: { eventId: id } });
  return ok({
    myRsvp: desired === "NONE" ? null : desired,
    going: rsvps.filter((r) => r.status === "GOING").length,
    interested: rsvps.filter((r) => r.status === "INTERESTED").length,
  });
}
