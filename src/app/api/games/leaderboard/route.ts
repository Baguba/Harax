import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { currentSeason } from "@/lib/games-season";

export const dynamic = "force-dynamic";

/**
 * GET /api/games/leaderboard — weekly ladder + past podiums.
 * Public (works signed-out too; `isMe` flags need a session).
 */
export async function GET() {
  const user = await getSessionUser();
  const season = await currentSeason();

  let leaders: Array<{
    rank: number;
    user: { id: string; name: string; avatarUrl: string | null; role: string };
    points: number; wins: number; draws: number; losses: number;
    isMe: boolean;
  }> = [];

  if (season.id !== "virtual") {
    const scores = await db.seasonScore.findMany({
      where: { seasonId: season.id, points: { gt: 0 } },
      include: { user: true },
      orderBy: [{ points: "desc" }, { wins: "desc" }, { user: { name: "asc" } }],
      take: 50,
    });
    leaders = scores.map((s, i) => ({
      rank: i + 1,
      user: { id: s.user.id, name: s.user.name, avatarUrl: s.user.avatarUrl, role: s.user.role },
      points: s.points, wins: s.wins, draws: s.draws, losses: s.losses,
      isMe: user?.id === s.user.id,
    }));
  }

  const pastSeasons = await db.gameSeason.findMany({
    where: { closed: true },
    orderBy: { index: "desc" },
    take: 6,
  });
  const pastIds = pastSeasons.map((s) => s.id);
  const winnerRows = pastIds.length
    ? await db.gameWinner.findMany({
        where: { seasonId: { in: pastIds } },
        include: { user: true },
        orderBy: { rank: "asc" },
      })
    : [];
  const past = pastSeasons.map((s) => ({
    index: s.index,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    winners: winnerRows
      .filter((w) => w.seasonId === s.id)
      .map((w) => ({
        user: { id: w.user.id, name: w.user.name, avatarUrl: w.user.avatarUrl, role: w.user.role },
        rank: w.rank, points: w.points, prize: w.prize,
      })),
  }));

  return ok({
    season: {
      index: season.index,
      startsAt: season.startsAt.toISOString(),
      endsAt: season.endsAt.toISOString(),
    },
    leaders,
    pastSeasons: past,
  });
}
