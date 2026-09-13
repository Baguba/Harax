import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  const rooms = await db.sideRoom.findMany({
    orderBy: { createdAt: "asc" },
  });
  const counts = await db.message.groupBy({
    by: ["roomId"],
    where: { roomType: "SIDECHAT" },
    _count: { _all: true },
  });
  const lastMsgs = await db.message.findMany({
    where: { roomType: "SIDECHAT" },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  const lastByRoom = new Map<string, typeof lastMsgs[number]>();
  for (const m of lastMsgs) if (!lastByRoom.has(m.roomId)) lastByRoom.set(m.roomId, m);

  return ok({
    rooms: rooms.map((r) => {
      const last = lastByRoom.get(r.id);
      return {
        id: r.id, key: r.key, name: r.name, emoji: r.emoji, description: r.description,
        messageCount: counts.find((c) => c.roomId === r.id)?._count._all ?? 0,
        lastMessage: last ? { content: last.content, anonName: last.anonName, createdAt: last.createdAt.toISOString() } : null,
        lastHourActive: last ? Date.now() - last.createdAt.getTime() < 3600_000 : false,
      };
    }),
    me: user ? { id: user.id, name: user.name } : null,
  });
}
