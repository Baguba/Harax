import { db } from "@/lib/db";
import { ok, fail, readJson } from "@/lib/api";
import { getSessionUser, hasRole } from "@/lib/auth";
import { postSchema, firstError } from "@/lib/validation";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { transformPost, postInclude } from "@/lib/posts";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export async function GET(req: Request) {
  const user = await getSessionUser();
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "feed"; // feed | group | channel | profile
  const groupId = url.searchParams.get("groupId");
  const channelId = url.searchParams.get("channelId");
  const authorId = url.searchParams.get("authorId");
  const tab = url.searchParams.get("tab") ?? "latest"; // latest | trending
  const page = Math.max(0, Math.min(100, Number(url.searchParams.get("page") ?? 0) || 0));

  const where = (() => {
    if (scope === "group" && groupId) return { groupId };
    if (scope === "channel" && channelId) return { channelId };
    if (scope === "profile" && authorId) return { authorId, audience: "PUBLIC" };
    // main feed: public + channel broadcasts
    return { OR: [{ audience: "PUBLIC" }, { audience: "CHANNEL" }] };
  })();

  // access control for private-ish scopes
  if (scope === "group" && groupId) {
    const group = await db.group.findUnique({ where: { id: groupId }, include: { members: true } });
    if (!group) return fail("Group not found.", 404);
    const isMember = group.members.some((m) => m.userId === user?.id);
    if (!group.isPublic && !isMember && user?.id !== group.ownerId) return fail("This group is private.", 403);
  }

  const total = await db.post.count({ where });

  let posts = await db.post.findMany({
    where,
    include: postInclude,
    orderBy: tab === "trending" ? undefined : [{ pinned: "desc" }, { createdAt: "desc" }],
    ...(tab === "trending" ? {} : { skip: page * PAGE_SIZE, take: PAGE_SIZE }),
  });

  if (tab === "trending") {
    const since = new Date(Date.now() - 7 * 86400_000);
    posts = posts.filter((p) => p.createdAt > since);
    posts.sort((a, b) => {
      const pa = Number(a.pinned) * 1000;
      const pb = Number(b.pinned) * 1000;
      const scoreA = a.likes.length * 2 + a.comments.length + pa;
      const scoreB = b.likes.length * 2 + b.comments.length + pb;
      return scoreB - scoreA || b.createdAt.getTime() - a.createdAt.getTime();
    });
    posts = posts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }

  return ok({
    posts: posts.map((p) => transformPost(p, user?.id)),
    page,
    hasMore: (page + 1) * PAGE_SIZE < total,
    total,
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Sign in to post.", 401);

  const rl = rateLimit({ key: clientKey(req, `post:${user.id}`), max: 10, windowMs: 5 * 60_000 });
  if (!rl.ok) return fail(`You're posting too fast — wait ${rl.retryAfterSec}s.`, 429);

  const body = await readJson(req);
  if (!body) return fail("Invalid request body");
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return fail(firstError(parsed.error), 422);
  const { content, mediaUrl, mediaType, groupId, channelId } = parsed.data;

  let audience: string = "PUBLIC";
  if (groupId) {
    const group = await db.group.findUnique({ where: { id: groupId }, include: { members: true } });
    if (!group) return fail("Group not found.", 404);
    const isMember = group.members.some((m) => m.userId === user.id) || group.ownerId === user.id;
    if (!isMember) return fail("Join the group before posting.", 403);
    audience = "GROUP";
  } else if (channelId) {
    const channel = await db.channel.findUnique({ where: { id: channelId } });
    if (!channel) return fail("Channel not found.", 404);
    const canBroadcast = channel.ownerId === user.id || hasRole(user, "ADMIN");
    if (!canBroadcast) return fail("Only channel owners and admins can broadcast here.", 403);
    audience = "CHANNEL";
  }

  const post = await db.post.create({
    data: { authorId: user.id, content, mediaUrl, mediaType, groupId, channelId, audience },
    include: postInclude,
  });

  // Notify channel subscribers on broadcast
  if (audience === "CHANNEL" && channelId) {
    const subs = await db.channelSubscriber.findMany({ where: { channelId } });
    const notifications = subs
      .filter((s) => s.userId !== user.id)
      .map((s) => ({
        userId: s.userId, type: "CHANNEL_POST",
        title: channelPostTitle(post.channel?.name ?? "A channel you follow"),
        body: content.slice(0, 80), link: `channel:${channelId}`,
      }));
    if (notifications.length) await db.notification.createMany({ data: notifications });
  }

  return ok({ post: transformPost(post, user.id) }, 201);
}

function channelPostTitle(channelName: string): string {
  return `${channelName} posted`;
}
