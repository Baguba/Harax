import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getSessionUser, hasRole } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  const channel = await db.channel.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true, role: true, verified: true } },
      subscribers: { select: { userId: true } },
      posts: {
        include: {
          author: { select: { id: true, name: true, avatarUrl: true, role: true, verified: true } },
          likes: { select: { userId: true, reaction: true } },
          comments: { select: { id: true } },
        },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        take: 50,
      },
    },
  });
  if (!channel) return fail("Channel not found.", 404);

  return ok({
    channel: {
      id: channel.id, name: channel.name, handle: channel.handle, description: channel.description,
      official: channel.official, avatarUrl: channel.avatarUrl, createdAt: channel.createdAt.toISOString(),
      owner: channel.owner,
      subscriberCount: channel.subscribers.length,
      isSubscribed: user ? channel.subscribers.some((s) => s.userId === user.id) : false,
      canBroadcast: user ? channel.ownerId === user.id || hasRole(user, "ADMIN") : false,
      posts: channel.posts.map((p) => ({
        id: p.id, content: p.content, mediaUrl: p.mediaUrl, mediaType: p.mediaType,
        pinned: p.pinned, createdAt: p.createdAt.toISOString(),
        author: p.author,
        stats: { reactions: p.likes.length, comments: p.comments.length },
        myReaction: user ? p.likes.find((l) => l.userId === user.id)?.reaction ?? null : null,
      })),
    },
  });
}
