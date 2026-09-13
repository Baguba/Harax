import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return fail("Sign in to subscribe.", 401);

  const rl = rateLimit({ key: clientKey(req, `sub:${user.id}`), max: 40, windowMs: 60_000 });
  if (!rl.ok) return fail("Too many changes.", 429);

  const channel = await db.channel.findUnique({ where: { id }, include: { subscribers: { select: { userId: true } } } });
  if (!channel) return fail("Channel not found.", 404);

  const existing = channel.subscribers.some((s) => s.userId === user.id);
  if (existing) {
    await db.channelSubscriber.deleteMany({ where: { channelId: id, userId: user.id } });
  } else {
    await db.channelSubscriber.create({ data: { channelId: id, userId: user.id } });
  }

  return ok({ subscribed: !existing, subscriberCount: channel.subscribers.length + (existing ? -1 : 1) });
}
