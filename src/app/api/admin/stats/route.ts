import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getSessionUser, hasRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail("Sign in first.", 401);
  if (!hasRole(user, "ADMIN")) return fail("Admin access required.", 403);

  const [users, totalPosts, totalEvents, totalGroups, totalChannels, totalMessages, openReports, sessions7d] =
    await Promise.all([
      db.user.findMany({
        include: { _count: { select: { posts: true, comments: true, memberships: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      db.post.count(),
      db.event.count(),
      db.group.count(),
      db.channel.count(),
      db.message.count(),
      db.report.count({ where: { status: "OPEN" } }),
      db.session.count(),
    ]);

  const roleDist: Record<string, number> = { STUDENT: 0, LECTURER: 0, ADMIN: 0, SUPERADMIN: 0 };
  for (const u of users) roleDist[u.role] = (roleDist[u.role] ?? 0) + 1;

  // activity over the last 14 days (posts + comments + messages)
  const since = new Date(Date.now() - 14 * 86400_000);
  const [postsByDay, messagesByDay] = await Promise.all([
    db.post.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    db.message.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
  ]);
  const days: Array<{ date: string; label: string; posts: number; messages: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    const key = d.toISOString().slice(0, 10);
    days.push({
      date: key,
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      posts: postsByDay.filter((p) => p.createdAt.toISOString().slice(0, 10) === key).length,
      messages: messagesByDay.filter((m) => m.createdAt.toISOString().slice(0, 10) === key).length,
    });
  }

  const topPosts = await db.post.findMany({
    where: { audience: { in: ["PUBLIC", "CHANNEL"] } },
    include: { author: { select: { name: true, role: true, avatarUrl: true } }, likes: { select: { id: true } }, comments: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
    take: 120,
  });
  topPosts.sort((a, b) => (b.likes.length * 2 + b.comments.length) - (a.likes.length * 2 + a.comments.length));

  return ok({
    stats: {
      users: users.length, posts: totalPosts, events: totalEvents, groups: totalGroups,
      channels: totalChannels, messages: totalMessages, openReports, activeSessions: sessions7d,
      roleDist,
    },
    activity: days,
    users: users.map((u) => ({
      id: u.id, name: u.name, email: u.email, role: u.role, department: u.department,
      avatarUrl: u.avatarUrl, verified: u.verified, banned: u.banned, provider: u.provider,
      createdAt: u.createdAt.toISOString(),
      counts: { posts: u._count.posts, comments: u._count.comments, groups: u._count.memberships },
    })),
    topPosts: topPosts.slice(0, 8).map((p) => ({
      id: p.id, content: p.content.slice(0, 120), createdAt: p.createdAt.toISOString(),
      author: p.author, stats: { reactions: p.likes.length, comments: p.comments.length },
    })),
  });
}
