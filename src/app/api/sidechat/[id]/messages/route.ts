import { db } from "@/lib/db";
import { ok, fail, readJson } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { notifyChatBroadcast } from "@/lib/chat-notify";
import { z } from "zod";
import { createHash } from "crypto";

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

const sendSchema = z.object({
  content: z.string().trim().max(1000),
  mediaUrl: z.string().regex(/^\/uploads\//).nullish(),
  mediaType: z.enum(["image", "video"]).nullish(),
});

// NOTE: keep in sync with mini-services/chat-service/index.js (anonNameFor)
const ANON_PREFIX = [
  "NightOwl", "LekuLurker", "LibraryGhost", "MemeLord", "FirfirFan",
  "CouchPotato", "ShutterBug", "Guest", "DormOwl", "TeaSpiller",
  "CampusFox", "AcaciaShade", "SunsetChaser", "BunaBuddy", "QuietStorm",
];
function anonNameFor(userId: string, roomId: string): string {
  const h = createHash("md5").update(`${userId}:${roomId}`).digest();
  const prefix = ANON_PREFIX[h[0] % ANON_PREFIX.length];
  return `${prefix} ${(h[1] % 89) + 10}`;
}

function toDTO(m: { id: string; roomId: string; content: string; mediaUrl: string | null; mediaType: string | null; createdAt: Date; anonName: string | null }) {
  return {
    id: m.id,
    roomId: m.roomId,
    content: m.content,
    mediaUrl: m.mediaUrl,
    mediaType: m.mediaType,
    createdAt: m.createdAt.toISOString(),
    anonName: m.anonName,
    sender: null,
  };
}

// GET /api/sidechat/:id/messages — history for polling / first paint.
export async function GET(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return fail("Authentication required.", 401);

  const { id } = await params;
  const room = await db.sideRoom.findUnique({ where: { id } });
  if (!room) return fail("Room not found.", 404);

  const rl = rateLimit({ key: clientKey(req, `smsg:${user.id}`), max: 120, windowMs: 60_000 });
  if (!rl.ok) return fail("Too many requests.", 429);

  const messages = await db.message.findMany({
    where: { roomType: "SIDECHAT", roomId: id },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return ok({ messages: messages.reverse().map(toDTO) });
}

// POST /api/sidechat/:id/messages — anonymous send over REST.
export async function POST(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return fail("Sign in to send messages.", 401);

  const { id } = await params;

  const rl = rateLimit({ key: clientKey(req, `ssend:${user.id}`), max: 8, windowMs: 10_000 });
  if (!rl.ok) return fail("Easy — a few seconds between messages.", 429, { retryAfter: rl.retryAfterSec });

  const body = sendSchema.safeParse(await readJson(req));
  if (!body.success) return fail("Message can't be empty (max 1000 chars).", 422);
  const { content, mediaUrl, mediaType } = body.data;
  if (!content && !mediaUrl) return fail("Message can't be empty.", 422);

  const room = await db.sideRoom.findUnique({ where: { id } });
  if (!room) return fail("Room not found.", 404);

  const message = await db.message.create({
    data: {
      roomType: "SIDECHAT",
      roomId: id,
      senderId: null,
      content,
      mediaUrl: mediaUrl ?? null,
      mediaType: mediaType ?? null,
      anonName: anonNameFor(user.id, id),
    },
  });

  notifyChatBroadcast({ roomType: "SIDECHAT", roomId: id, messageId: message.id });

  return ok({ message: toDTO(message) }, 201);
}
