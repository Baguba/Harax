import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const me = await getSessionUser();

  const user = await db.user.findUnique({
    where: { id },
    include: {
      posts: {
        where: { audience: "PUBLIC" },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true, role: true, verified: true, department: true } },
          likes: { select: { userId: true, reaction: true } },
          comments: { select: { id: true, author: { select: { id: true, name: true, avatarUrl: true, role: true } }, content: true, createdAt: true } },
          channel: { select: { id: true, name: true, handle: true, official: true } },
          group: { select: { id: true, name: true, emoji: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      memberships: {
        include: { group: { select: { id: true, name: true, emoji: true, isPublic: true } } },
      },
      rsvps: { include: { event: { select: { id: true, title: true, startsAt: true, category: true, coverUrl: true } } } },
      channelsOwned: { select: { id: true, name: true, handle: true, official: true, avatarUrl: true, _count: { select: { subscribers: true } } } },
      _count: { select: { posts: true, comments: true, likes: true } },
    },
  });

  if (!user || user.banned) return fail("User not found.", 404);

  const reactionBreakdown = (likes: Array<{ reaction: string }>) => {
    const b: Record<string, number> = {};
    for (const l of likes) b[l.reaction] = (b[l.reaction] ?? 0) + 1;
    return b;
  };

  return ok({
    user: {
      id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, coverUrl: user.coverUrl,
      role: user.role, department: user.department, year: user.year, bio: user.bio,
      verified: user.verified, provider: user.provider, createdAt: user.createdAt.toISOString(),
      stats: {
        posts: user._count.posts, comments: user._count.comments,
        reactionsReceived: user._count.likes,
        groups: user.memberships.length, events: user.rsvps.length,
      },
      isMe: me?.id === user.id,
      posts: user.posts.map((p) => ({
        id: p.id, content: p.content, mediaUrl: p.mediaUrl, mediaType: p.mediaType,
        audience: p.audience, pinned: p.pinned, createdAt: p.createdAt.toISOString(),
        author: p.author,
        channel: p.channel, group: p.group,
        stats: { reactions: p.likes.length, comments: p.comments.length },
        reactionBreakdown: reactionBreakdown(p.likes),
        myReaction: me ? p.likes.find((l) => l.userId === me.id)?.reaction ?? null : null,
        topComments: p.comments.slice(-2).reverse().map((c) => ({
          id: c.id, content: c.content, createdAt: c.createdAt.toISOString(),
          author: { id: c.author.id, name: c.author.name, avatarUrl: c.author.avatarUrl, role: c.author.role },
        })),
      })),
      groups: user.memberships.map((m) => ({ ...m.group, groupRole: m.role })),
      upcomingEvents: user.rsvps
        .filter((r) => r.event.startsAt > new Date())
        .map((r) => ({ ...r.event, startsAt: r.event.startsAt.toISOString(), status: r.status }))
        .slice(0, 5),
      channels: user.channelsOwned,
    },
  });
}
