import { db } from "@/lib/db";
import { ok, fail, readJson } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// POST — join directly, or (group admins) add another user by email
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return fail("Sign in to join groups.", 401);

  const rl = rateLimit({ key: clientKey(req, `join:${user.id}`), max: 20, windowMs: 60_000 });
  if (!rl.ok) return fail("Too many join attempts.", 429);

  const group = await db.group.findUnique({ where: { id }, include: { members: true } });
  if (!group) return fail("Group not found.", 404);

  const body = await readJson<{ addEmail?: string }>(req) ?? {};

  if (body.addEmail) {
    // "add student" flow (Telegram-style)
    if (!isValidEmail(body.addEmail)) return fail("Enter a valid email address.", 422);
    const myMembership = group.members.find((m) => m.userId === user.id);
    const isGroupAdmin = myMembership?.role === "ADMIN" || group.ownerId === user.id;
    if (!isGroupAdmin) return fail("Only group admins can add members.", 403);
    const target = await db.user.findUnique({ where: { email: body.addEmail.toLowerCase() } });
    if (!target) return fail("No Harax account with that email yet. They need to sign up first.", 404);
    if (group.members.some((m) => m.userId === target.id)) return fail(`${target.name} is already in this group.`, 409);
    await db.groupMember.create({ data: { groupId: id, userId: target.id } });
    await db.notification.create({
      data: {
        userId: target.id, type: "GROUP_ADDED",
        title: `${user.name} added you to ${group.name}`,
        body: group.description?.slice(0, 70) ?? null, link: `group:${id}`,
      },
    }).catch(() => undefined);
    return ok({ added: { id: target.id, name: target.name, avatarUrl: target.avatarUrl } }, 201);
  }

  // self-join
  if (group.members.some((m) => m.userId === user.id)) return fail("You're already a member.", 409);
  if (!group.isPublic) return fail("This group is invite-only — ask an admin to add you.", 403);

  await db.groupMember.create({ data: { groupId: id, userId: user.id } });
  return ok({ joined: true }, 201);
}

// DELETE — leave group
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return fail("Sign in first.", 401);
  const group = await db.group.findUnique({ where: { id } });
  if (!group) return fail("Group not found.", 404);
  if (group.ownerId === user.id) return fail("Owners can't leave — transfer ownership or delete the group.", 400);
  await db.groupMember.deleteMany({ where: { groupId: id, userId: user.id } });
  return ok({ left: true });
}
