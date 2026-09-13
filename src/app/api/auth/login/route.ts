import { db } from "@/lib/db";
import { ok, fail, readJson } from "@/lib/api";
import { loginSchema, firstError } from "@/lib/validation";
import { verifyPassword, createSession, sanitizeUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const rl = rateLimit({ key: clientKey(req, "login"), max: 12, windowMs: 10 * 60_000 });
  if (!rl.ok) return fail(`Too many login attempts. Try again in ${rl.retryAfterSec}s.`, 429);

  const body = await readJson(req);
  if (!body) return fail("Invalid request body");

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return fail(firstError(parsed.error), 422);

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.passwordHash) return fail("Incorrect email or password.", 401);
  if (user.banned) return fail("This account has been suspended. Contact the ICT office.", 403);

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return fail("Incorrect email or password.", 401);

  await createSession(user.id);
  return ok({ user: sanitizeUser(user) });
}
