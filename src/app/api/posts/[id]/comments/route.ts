import { db } from "@/lib/db";
import { ok, fail, readJson } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { commentSchema, firstError } from "@/lib/validation";
import { rateLimit, clientKey } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const comments = await db.comment.findMany({
    where: { postId: id },
    include: { author: true },
    orderBy: { createdAt: "asc" },
  });
  return ok({
    comments: comments.map((c) => ({
      id: c.id, content: c.content, createdAt: c.createdAt.toISOString(),
      author: { id: c.author.id, name: c.author.name, avatarUrl: c.author.avatarUrl, role: c.author.role, verified: c.author.verified },
    })),
  });
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return fail("Sign in to comment.", 401);

  const rl = rateLimit({ key: clientKey(req, `comment:${user.id}`), max: 15, windowMs: 60_000 });
  if (!rl.ok) return fail("Easy there, speed typist. Wait a moment.", 429);

  const body = await readJson(req);
  if (!body) return fail("Invalid request body");
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) return fail(firstError(parsed.error), 422);

  const post = await db.post.findUnique({ where: { id } });
  if (!post) return fail("Post not found.", 404);

  const comment = await db.comment.create({
    data: { postId: id, authorId: user.id, content: parsed.data.content },
    include: { author: true },
  });

  if (post.authorId !== user.id) {
    await db.notification.create({
      data: {
        userId: post.authorId, type: "POST_COMMENT",
        title: `${user.name} commented on your post`,
        body: parsed.data.content.slice(0, 70), link: "feed",
      },
    }).catch(() => undefined);
  }

  return ok({
    comment: {
      id: comment.id, content: comment.content, createdAt: comment.createdAt.toISOString(),
      author: { id: comment.author.id, name: comment.author.name, avatarUrl: comment.author.avatarUrl, role: comment.author.role, verified: comment.author.verified },
    },
  }, 201);
}
