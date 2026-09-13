import { db } from "@/lib/db";
import { ok, fail, readJson } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { reactionSchema } from "@/lib/validation";
import { rateLimit, clientKey } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return fail("Sign in to react.", 401);

  const rl = rateLimit({ key: clientKey(req, `react:${user.id}`), max: 60, windowMs: 60_000 });
  if (!rl.ok) return fail("Too many reactions too fast.", 429);

  const body = await readJson<{ reaction?: string; remove?: boolean }>(req);
  if (!body) return fail("Invalid request");
  const post = await db.post.findUnique({ where: { id } });
  if (!post) return fail("Post not found.", 404);

  if (body.remove) {
    await db.like.deleteMany({ where: { postId: id, userId: user.id } });
  } else {
    const parsed = reactionSchema.safeParse(body.reaction ?? "LIKE");
    if (!parsed.success) return fail("Unknown reaction.", 422);
    await db.like.upsert({
      where: { postId_userId: { postId: id, userId: user.id } },
      create: { postId: id, userId: user.id, reaction: parsed.data },
      update: { reaction: parsed.data },
    });

    if (post.authorId !== user.id) {
      await db.notification.create({
        data: {
          userId: post.authorId, type: "POST_REACTION",
          title: `${user.name} reacted to your post`,
          body: post.content.slice(0, 70), link: "feed",
        },
      }).catch(() => undefined);
    }
  }

  const likes = await db.like.findMany({ where: { postId: id } });
  const breakdown: Record<string, number> = {};
  for (const l of likes) breakdown[l.reaction] = (breakdown[l.reaction] ?? 0) + 1;
  const mine = likes.find((l) => l.userId === user.id)?.reaction ?? null;

  return ok({ reactions: likes.length, breakdown, myReaction: mine });
}
