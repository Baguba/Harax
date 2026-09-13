import { db } from "@/lib/db";
import { ok, fail, readJson } from "@/lib/api";
import { getSessionUser, hasRole } from "@/lib/auth";
import { channelSchema, firstError } from "@/lib/validation";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(_req: Request) {
  const user = await getSessionUser();
  const channels = await db.channel.findMany({
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true, role: true } },
      subscribers: { select: { userId: true } },
      _count: { select: { posts: true } },
      posts: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: [{ official: "desc" }, { subscribers: { _count: "desc" } }],
  });

  return ok({
    channels: channels.map((c) => ({
      id: c.id, name: c.name, handle: c.handle, description: c.description,
      official: c.official, avatarUrl: c.avatarUrl, createdAt: c.createdAt.toISOString(),
      owner: c.owner,
      subscriberCount: c.subscribers.length,
      postCount: c._count.posts,
      lastPostAt: c.posts[0]?.createdAt.toISOString() ?? null,
      isSubscribed: user ? c.subscribers.some((s) => s.userId === user.id) : false,
    })),
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Sign in to create a channel.", 401);
  if (!hasRole(user, "LECTURER")) return fail("Channels are for departments, offices and clubs — lecturers and admins can create them.", 403);

  const rl = rateLimit({ key: clientKey(req, `channel:${user.id}`), max: 3, windowMs: 30 * 60_000 });
  if (!rl.ok) return fail(`Channel limit reached. Wait ${rl.retryAfterSec}s.`, 429);

  const body = await readJson(req);
  if (!body) return fail("Invalid request body");
  const parsed = channelSchema.safeParse(body);
  if (!parsed.success) return fail(firstError(parsed.error), 422);

  const handle = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "channel";
  const clash = await db.channel.findUnique({ where: { handle } });
  const finalHandle = clash ? `${handle}-${Math.random().toString(36).slice(2, 6)}` : handle;

  const channel = await db.channel.create({
    data: {
      name: parsed.data.name,
      handle: finalHandle,
      description: parsed.data.description ?? null,
      official: hasRole(user, "ADMIN"),
      ownerId: user.id,
      avatarUrl: `/api/avatar?name=${encodeURIComponent(parsed.data.name)}&seed=${finalHandle}`,
    },
  });

  await db.channelSubscriber.create({ data: { channelId: channel.id, userId: user.id } }).catch(() => undefined);

  return ok({ channel: { id: channel.id, name: channel.name, handle: channel.handle } }, 201);
}
