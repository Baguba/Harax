import { db } from "@/lib/db";
import { ok, fail, readJson } from "@/lib/api";
import { getSessionUser, hasRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail("Sign in first.", 401);
  if (!hasRole(user, "ADMIN")) return fail("Admin access required.", 403);

  const reports = await db.report.findMany({
    include: { reporter: { select: { id: true, name: true, avatarUrl: true, role: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 80,
  });

  const withTargets = await Promise.all(
    reports.map(async (r) => {
      let target: { id: string; name?: string; content?: string; avatarUrl?: string | null } | null = null;
      if (r.targetType === "POST") {
        const p = await db.post.findUnique({ where: { id: r.targetId }, include: { author: { select: { name: true } } } });
        if (p) target = { id: p.id, content: p.content.slice(0, 140), name: p.author.name };
      } else if (r.targetType === "USER") {
        const u = await db.user.findUnique({ where: { id: r.targetId }, select: { id: true, name: true, avatarUrl: true, role: true } });
        if (u) target = u;
      }
      return {
        id: r.id, targetType: r.targetType, reason: r.reason, status: r.status,
        createdAt: r.createdAt.toISOString(), reporter: r.reporter, target,
      };
    })
  );

  return ok({ reports: withTargets });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Sign in first.", 401);
  if (!hasRole(user, "ADMIN")) return fail("Admin access required.", 403);

  const body = await readJson<{ reportId?: string; status?: "RESOLVED" | "DISMISSED"; deleteTarget?: boolean }>(req);
  if (!body?.reportId || !body.status) return fail("reportId and status required");

  const report = await db.report.findUnique({ where: { id: body.reportId } });
  if (!report) return fail("Report not found.", 404);

  if (body.deleteTarget) {
    if (report.targetType === "POST") await db.post.delete({ where: { id: report.targetId } }).catch(() => undefined);
    if (report.targetType === "USER") {
      await db.user.update({ where: { id: report.targetId }, data: { banned: true } }).catch(() => undefined);
      await db.session.deleteMany({ where: { userId: report.targetId } }).catch(() => undefined);
    }
  }

  await db.report.update({ where: { id: report.id }, data: { status: body.status } });
  return ok({ updated: true });
}
