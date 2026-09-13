import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { getSessionUser, hasRole } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  const group = await db.group.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true, role: true } },
      members: {
        include: { user: { select: { id: true, name: true, avatarUrl: true, role: true, department: true } } },
        orderBy: { joinedAt: "asc" },
      },
      _count: { select: { posts: true } },
    },
  });
  if (!group) return fail("Group not found.", 404);

  const isMember = user ? group.members.some((m) => m.userId === user.id) : false;
  if (!group.isPublic && !isMember && user?.id !== group.ownerId && !hasRole(user ?? ({} as never), "ADMIN")) {
    return fail("This group is private.", 403);
  }

  return ok({
    group: {
      id: group.id, name: group.name, description: group.description, emoji: group.emoji,
      isPublic: group.isPublic, createdAt: group.createdAt.toISOString(),
      owner: group.owner,
      memberCount: group.members.length,
      postCount: group._count.posts,
      isMember,
      myRole: user ? group.members.find((m) => m.userId === user.id)?.role ?? null : null,
      members: group.members.map((m) => ({
        id: m.user.id, name: m.user.name, avatarUrl: m.user.avatarUrl,
        role: m.user.role, department: m.user.department, groupRole: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
    },
  });
}
