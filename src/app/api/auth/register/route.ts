import { db } from "@/lib/db";
import { ok, fail, readJson } from "@/lib/api";
import { registerSchema, firstError } from "@/lib/validation";
import { hashPassword, createSession, sanitizeUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const rl = rateLimit({ key: clientKey(req, "register"), max: 8, windowMs: 10 * 60_000 });
  if (!rl.ok) return fail(`Too many attempts. Try again in ${rl.retryAfterSec}s.`, 429);

  const body = await readJson(req);
  if (!body) return fail("Invalid request body");

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return fail(firstError(parsed.error), 422);
  const { name, email, password, role, department, year } = parsed.data;

  const exists = await db.user.findUnique({ where: { email } });
  if (exists) return fail("An account with this email already exists. Try signing in.", 409);

  const user = await db.user.create({
    data: {
      name, email, role, department: department || null, year: year || null,
      passwordHash: await hashPassword(password),
      avatarUrl: `/api/avatar?name=${encodeURIComponent(name)}&seed=${encodeURIComponent(email)}`,
      verified: false,
    },
  });

  await db.notification.create({
    data: {
      userId: user.id, type: "SYSTEM", title: "Welcome to Harax! ⚡",
      body: "Your campus, connected. Post your first update and join a group to get started.",
      link: "feed",
    },
  });

  await createSession(user.id);
  return ok({ user: sanitizeUser(user) }, 201);
}
