import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { getUserByToken, isValidTokenShape } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

// GET /api/groups/:id/messages?token=<sessionToken>&before=<iso>
// Used by the chat mini-service bootstrapping + REST fallback.
export async function GET(req: Request) {
  const url = new URL(req.url);

  let user = await getSessionUser();
  if (!user) {
    const token = url.searchParams.get("token");
    if (isValidTokenShape(token)) user = await getUserByToken(token);
  }
  if (!user) return fail("Authentication required.", 401);

  const { id } = await params;
  const group = await db.group.findUnique({ where: { id }, include: { members: true } });
  if (!group) return fail("Group not found.", 404);
  const isMember = group.members.some((m) => m.userId === user.id);
  if (!group.isPublic && !isMember) return fail("This group is private.", 403);

  const rl = rateLimit({ key: clientKey(req, `gmsg:${user.id}`), max: 120, windowMs: 60_000 });
  if (!rl.ok) return fail("Too many requests.", 429);

  const before = url.searchParams.get("before");
  const take = Math.min(80, Number(url.searchParams.get("take") ?? 50) || 50);

  const messages = await db.message.findMany({
    where: { roomType: "GROUP", roomId: id, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
    include: { sender: { select: { id: true, name: true, avatarUrl: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });

  return ok({
    messages: messages.reverse().map((m) => ({
      id: m.id, content: m.content, mediaUrl: m.mediaUrl, mediaType: m.mediaType,
      createdAt: m.createdAt.toISOString(),
      sender: m.sender ? { id: m.sender.id, name: m.sender.name, avatarUrl: m.sender.avatarUrl, role: m.sender.role } : null,
    })),
    hasMore: messages.length === take,
  });
}
