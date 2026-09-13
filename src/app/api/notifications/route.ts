import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail("Sign in first.", 401);

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return ok({
    notifications: notifications.map((n) => ({
      id: n.id, type: n.type, title: n.title, body: n.body, link: n.link,
      read: n.read, createdAt: n.createdAt.toISOString(),
    })),
    unread: notifications.filter((n) => !n.read).length,
  });
}

export async function POST() {
  const user = await getSessionUser();
  if (!user) return fail("Sign in first.", 401);
  await db.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  return ok({ cleared: true });
}
