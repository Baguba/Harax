import { unlink } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { ok, fail, readJson } from "@/lib/api";
import { getSessionUser, destroySession } from "@/lib/auth";
import { profileSchema, firstError } from "@/lib/validation";

export const dynamic = "force-dynamic";

// PATCH /api/users/me — update own profile
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Sign in first.", 401);

  const body = await readJson(req);
  if (!body) return fail("Invalid request body");
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return fail(firstError(parsed.error), 422);

  await db.user.update({ where: { id: user.id }, data: parsed.data });

  return ok({ user: { ...user, ...parsed.data } });
}

/** Only genuine uploads we wrote ourselves — never trust arbitrary paths. */
const UPLOAD_RE = /^\/uploads\/[a-f0-9-]{36}\.(jpg|png|webp|gif|mp4|webm|mov)$/i;

async function removeUpload(url: string | null | undefined): Promise<void> {
  if (!url || !UPLOAD_RE.test(url)) return;
  try {
    await unlink(path.join(process.cwd(), "public", url));
  } catch {
    // already gone — fine
  }
}

// DELETE /api/users/me — permanently delete own account (Google Play requirement).
// Prisma cascades wipe posts, comments, likes, RSVPs, memberships, messages,
// notifications, reports, sessions and game records; sidechat messages are
// anonymized (sender set null) by the schema. Uploaded files are unlinked.
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return fail("Sign in first.", 401);

  if (user.role === "SUPERADMIN") {
    return fail(
      "The super admin account cannot delete itself — promote another admin first so the platform keeps an owner.",
      403
    );
  }

  // gather file references before the rows cascade away
  const [profile, posts] = await Promise.all([
    db.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true, coverUrl: true } }),
    db.post.findMany({ where: { authorId: user.id }, select: { mediaUrl: true } }),
  ]);

  await db.user.delete({ where: { id: user.id } });

  // best-effort file cleanup (DB is already consistent without it)
  await Promise.all([
    removeUpload(profile?.avatarUrl),
    removeUpload(profile?.coverUrl),
    ...posts.map((p) => removeUpload(p.mediaUrl)),
  ]);

  await destroySession();

  return ok({ deleted: true });
}
