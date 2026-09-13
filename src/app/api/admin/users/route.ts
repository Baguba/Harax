import { db } from "@/lib/db";
import { ok, fail, readJson } from "@/lib/api";
import { getSessionUser, hasRole, type Role } from "@/lib/auth";

const ALLOWED_ROLES: Role[] = ["STUDENT", "LECTURER", "ADMIN", "SUPERADMIN"];

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Sign in first.", 401);
  if (!hasRole(user, "SUPERADMIN")) return fail("Only superadmins can change roles.", 403);

  const body = await readJson<{ userId?: string; role?: string; action?: "verify" | "unverify" | "ban" | "unban" }>(req);
  if (!body?.userId) return fail("userId required");

  const target = await db.user.findUnique({ where: { id: body.userId } });
  if (!target) return fail("User not found.", 404);
  if (target.role === "SUPERADMIN" && target.id !== user.id) return fail("Cannot modify another superadmin.", 403);

  if (body.role) {
    if (!ALLOWED_ROLES.includes(body.role as Role)) return fail("Invalid role.", 422);
    if (body.role === "SUPERADMIN" && user.role !== "SUPERADMIN") return fail("Escalation blocked.", 403);
    await db.user.update({ where: { id: target.id }, data: { role: body.role } });
    return ok({ updated: { id: target.id, role: body.role } });
  }

  switch (body.action) {
    case "verify":
    case "unverify":
      await db.user.update({ where: { id: target.id }, data: { verified: body.action === "verify" } });
      return ok({ updated: { id: target.id, verified: body.action === "verify" } });
    case "ban":
      if (target.role === "SUPERADMIN") return fail("Cannot ban a superadmin.", 403);
      await db.user.update({ where: { id: target.id }, data: { banned: true } });
      await db.session.deleteMany({ where: { userId: target.id } });
      return ok({ updated: { id: target.id, banned: true } });
    case "unban":
      await db.user.update({ where: { id: target.id }, data: { banned: false } });
      return ok({ updated: { id: target.id, banned: false } });
    default:
      return fail("Unknown action", 422);
  }
}
