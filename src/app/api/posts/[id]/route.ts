import { db } from "@/lib/db";
import { ok, fail, readJson } from "@/lib/api";
import { getSessionUser, hasRole } from "@/lib/auth";
import { reactionSchema } from "@/lib/validation";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { transformPost, postInclude } from "@/lib/posts";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  const post = await db.post.findUnique({ where: { id }, include: postInclude });
  if (!post) return fail("Post not found.", 404);
  return ok({ post: transformPost(post, user?.id) });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return fail("Sign in first.", 401);
  const post = await db.post.findUnique({ where: { id } });
  if (!post) return fail("Post not found.", 404);
  if (post.authorId !== user.id && !hasRole(user, "ADMIN")) {
    return fail("You can only delete your own posts.", 403);
  }
  await db.post.delete({ where: { id } });
  return ok({ deleted: true });
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return fail("Sign in first.", 401);
  const body = await readJson<{ pinned?: boolean }>(req);
  if (!body || typeof body.pinned !== "boolean") return fail("Invalid request");
  const post = await db.post.findUnique({ where: { id } });
  if (!post) return fail("Post not found.", 404);
  if (!hasRole(user, "ADMIN")) return fail("Only admins can pin posts.", 403);
  const updated = await db.post.update({ where: { id }, data: { pinned: body.pinned }, include: postInclude });
  return ok({ post: transformPost(updated, user.id) });
}
