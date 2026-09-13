import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await getSessionUser(); // warms auth; results are public
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) return ok({ users: [], groups: [], channels: [], events: [] });

  const [users, groups, channels, events] = await Promise.all([
    db.user.findMany({
      where: {
        banned: false,
        OR: [
          { name: { contains: q } },
          { department: { contains: q } },
          { bio: { contains: q } },
        ],
      },
      select: { id: true, name: true, avatarUrl: true, role: true, department: true, verified: true },
      take: 6,
    }),
    db.group.findMany({
      where: { OR: [{ name: { contains: q } }, { description: { contains: q } }] },
      select: { id: true, name: true, emoji: true, isPublic: true, members: { select: { userId: true } } },
      take: 6,
    }),
    db.channel.findMany({
      where: { OR: [{ name: { contains: q } }, { description: { contains: q } }, { handle: { contains: q } }] },
      select: { id: true, name: true, handle: true, official: true, avatarUrl: true, subscribers: { select: { userId: true } } },
      take: 6,
    }),
    db.event.findMany({
      where: { OR: [{ title: { contains: q } }, { description: { contains: q } }, { location: { contains: q } }] },
      select: { id: true, title: true, startsAt: true, category: true, coverUrl: true, location: true },
      take: 6,
    }),
  ]);

  return ok({
    users,
    groups: groups.map((g) => ({ id: g.id, name: g.name, emoji: g.emoji, isPublic: g.isPublic, memberCount: g.members.length })),
    channels: channels.map((c) => ({ id: c.id, name: c.name, handle: c.handle, official: c.official, avatarUrl: c.avatarUrl, subscriberCount: c.subscribers.length })),
    events: events.map((e) => ({ ...e, startsAt: e.startsAt.toISOString() })),
  });
}
