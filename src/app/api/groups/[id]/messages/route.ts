import { db } from "@/lib/db";
import { ok, fail, readJson } from "@/lib/api";
import { getSessionUser, getUserByToken, isValidTokenShape } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { notifyChatBroadcast } from "@/lib/chat-notify";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

const sendSchema = z.object({
  content: z.string().trim().max(1000),
  mediaUrl: z.string().regex(/^\/uploads\//).nullish(),
  mediaType: z.enum(["image", "video"]).nullish(),
});

function toDTO(m: { id: string; roomId: string; content: string; mediaUrl: string | null; mediaType: string | null; createdAt: Date; sender: { id: string; name: string; avatarUrl: string | null; role: string } | null }) {
  return {
    id: m.id,
    roomId: m.roomId,
    content: m.content,
    mediaUrl: m.mediaUrl,
    mediaType: m.mediaType,
    createdAt: m.createdAt.toISOString(),
    anonName: null as string | null,
    sender: m.sender ? { id: m.sender.id, name: m.sender.name, avatarUrl: m.sender.avatarUrl, role: m.sender.role } : null,
  };
}

// GET /api/groups/:id/messages?token=<sessionToken>&before=<iso>
// Used by the chat mini-service bootstrapping + REST fallback (polling).
export async function GET(req: Request, { params }: Params) {
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
    messages: messages.reverse().map(toDTO),
    hasMore: messages.length === take,
  });
}

// POST /api/groups/:id/messages — send a message over REST.
// Primary write path for the web client (reliable, validated, rate-limited);
// the chat service broadcasts it to socket-connected peers afterwards.
export async function POST(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return fail("Sign in to send messages.", 401);

  const { id } = await params;

  const rl = rateLimit({ key: clientKey(req, `gsend:${user.id}`), max: 8, windowMs: 10_000 });
  if (!rl.ok) return fail("Easy — a few seconds between messages.", 429, { retryAfter: rl.retryAfterSec });

  const body = sendSchema.safeParse(await readJson(req));
  if (!body.success) return fail("Message can't be empty (max 1000 chars).", 422);
  const { content, mediaUrl, mediaType } = body.data;
  if (!content && !mediaUrl) return fail("Message can't be empty.", 422);

  const group = await db.group.findUnique({ where: { id }, include: { members: true } });
  if (!group) return fail("Group not found.", 404);
  const isMember = group.members.some((m) => m.userId === user.id) || group.ownerId === user.id;
  if (!isMember && !group.isPublic) return fail("This group is private — join it first.", 403);

  const message = await db.message.create({
    data: {
      roomType: "GROUP",
      roomId: id,
      senderId: user.id,
      content,
      mediaUrl: mediaUrl ?? null,
      mediaType: mediaType ?? null,
    },
    include: { sender: { select: { id: true, name: true, avatarUrl: true, role: true } } },
  });

  // real-time delivery for everyone else (fire-and-forget)
  notifyChatBroadcast({ roomType: "GROUP", roomId: id, messageId: message.id });

  return ok({ message: toDTO(message) }, 201);
}
