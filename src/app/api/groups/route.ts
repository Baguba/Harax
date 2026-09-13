import { db } from "@/lib/db";
import { ok, fail, readJson } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { groupSchema, firstError } from "@/lib/validation";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  const url = new URL(req.url);
  const mine = url.searchParams.get("mine") === "1";

  const where = mine && user ? { members: { some: { userId: user.id } } } : { isPublic: true };

  const groups = await db.group.findMany({
    where,
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true, role: true } },
      members: { select: { userId: true } },
      _count: { select: { posts: true } },
    },
    orderBy: { members: { _count: "desc" } },
    take: 60,
  });

  return ok({
    groups: groups.map((g) => ({
      id: g.id, name: g.name, description: g.description, emoji: g.emoji,
      isPublic: g.isPublic, createdAt: g.createdAt.toISOString(),
      owner: g.owner,
      memberCount: g.members.length,
      postCount: g._count.posts,
      isMember: user ? g.members.some((m) => m.userId === user.id) : false,
    })),
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Sign in to create a group.", 401);

  const rl = rateLimit({ key: clientKey(req, `group:${user.id}`), max: 5, windowMs: 10 * 60_000 });
  if (!rl.ok) return fail(`Group creation limit reached. Wait ${rl.retryAfterSec}s.`, 429);

  const body = await readJson(req);
  if (!body) return fail("Invalid request body");
  const parsed = groupSchema.safeParse(body);
  if (!parsed.success) return fail(firstError(parsed.error), 422);

  const group = await db.group.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      emoji: parsed.data.emoji || "💬",
      isPublic: parsed.data.isPublic,
      ownerId: user.id,
    },
  });

  await db.groupMember.create({
    data: { groupId: group.id, userId: user.id, role: "ADMIN" },
  });

  return ok({ group: { id: group.id, name: group.name, emoji: group.emoji } }, 201);
}
