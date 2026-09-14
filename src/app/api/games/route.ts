import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { currentSeason } from "@/lib/games-season";

export const dynamic = "force-dynamic";

/**
 * GET /api/games — Game Zone home payload:
 * season window, my weekly stats + rank, my recent match history.
 */
export async function GET() {
  const user = await getSessionUser();
  const season = await currentSeason();

  let me: {
    points: number; wins: number; draws: number; losses: number;
    played: number; rank: number | null;
  } | null = null;
  if (user && season.id !== "virtual") {
    const score = await db.seasonScore.findUnique({
      where: { seasonId_userId: { seasonId: season.id, userId: user.id } },
    });
    const ahead = score
      ? await db.seasonScore.count({
          where: { seasonId: season.id, points: { gt: score.points } },
        })
      : 0;
    me = {
      points: score?.points ?? 0,
      wins: score?.wins ?? 0,
      draws: score?.draws ?? 0,
      losses: score?.losses ?? 0,
      played: (score?.wins ?? 0) + (score?.draws ?? 0) + (score?.losses ?? 0),
      rank: score && score.points > 0 ? ahead + 1 : null,
    };
  }

  let history: Array<{
    id: string; game: string; vsBot: boolean; status: string;
    opponent: { id: string; name: string; avatarUrl: string | null; role: string } | null;
    myColor: string; winnerId: string | null; reason: string | null;
    endedAt: string | null; createdAt: string;
  }> = [];
  if (user) {
    const matches = await db.gameMatch.findMany({
      where: { OR: [{ playerXId: user.id }, { playerOId: user.id }] },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const oppIds = matches
      .map((m) => (m.playerXId === user.id ? m.playerOId : m.playerXId))
      .filter((x): x is string => Boolean(x));
    const opponents = oppIds.length
      ? await db.user.findMany({ where: { id: { in: oppIds } } })
      : [];
    history = matches.map((m) => {
      const oppId = m.playerXId === user.id ? m.playerOId : m.playerXId;
      const opp = opponents.find((u) => u.id === oppId);
      const swap: Record<string, string> = { X: "O", O: "X", w: "b", b: "w", r: "k", k: "r" };
      const myColor = m.playerXId === user.id ? m.hostColor : (swap[m.hostColor] ?? m.hostColor);
      return {
        id: m.id, game: m.game, vsBot: m.vsBot, status: m.status,
        opponent: m.vsBot
          ? { id: "bot", name: "Harax Bot", avatarUrl: null, role: "BOT" }
          : opp
            ? { id: opp.id, name: opp.name, avatarUrl: opp.avatarUrl, role: opp.role }
            : null,
        myColor, winnerId: m.winnerId, reason: m.reason,
        endedAt: m.endedAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
      };
    });
  }

  return ok({
    season: {
      index: season.index,
      startsAt: season.startsAt.toISOString(),
      endsAt: season.endsAt.toISOString(),
    },
    me,
    history,
  });
}
