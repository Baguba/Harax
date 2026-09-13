import { db } from "@/lib/db";
import { ok, fail, readJson } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
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
