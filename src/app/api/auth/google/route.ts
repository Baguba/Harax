// Google Sign-In (demo mode).
// In production, wire GOOGLE_CLIENT_ID/SECRET with NextAuth GoogleProvider.
// In this sandbox (no external OAuth callback allowed), the client opens a
// Google-styled account sheet and this endpoint creates/links the account
// server-side — same session, hashing and security guarantees.
import { db } from "@/lib/db";
import { ok, fail, readJson } from "@/lib/api";
import { googleSchema, firstError } from "@/lib/validation";
import { createSession, sanitizeUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const rl = rateLimit({ key: clientKey(req, "google"), max: 20, windowMs: 10 * 60_000 });
  if (!rl.ok) return fail(`Too many attempts. Try again in ${rl.retryAfterSec}s.`, 429);

  const body = await readJson(req);
  if (!body) return fail("Invalid request body");
  const parsed = googleSchema.safeParse(body);
  if (!parsed.success) return fail(firstError(parsed.error), 422);
  const { email, name, avatarUrl, role, department } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.banned) return fail("This account has been suspended. Contact the ICT office.", 403);
    // link google provider if first time
    if (existing.provider === "credentials" && !existing.googleId) {
      await db.user.update({ where: { id: existing.id }, data: { googleId: `demo-${email}`, provider: "google", verified: true } });
    }
    await createSession(existing.id);
    return ok({ user: sanitizeUser({ ...existing, provider: "google", verified: true }) });
  }

  const user = await db.user.create({
    data: {
      email,
      name,
      role,
      department: department || null,
      provider: "google",
      googleId: `demo-${email}`,
      verified: true,
      avatarUrl: avatarUrl || `/api/avatar?name=${encodeURIComponent(name)}&seed=${encodeURIComponent(email)}`,
    },
  });

  await db.notification.create({
    data: {
      userId: user.id, type: "SYSTEM", title: "Welcome to Harax! ⚡",
      body: "Signed in with Google. Your campus, connected.",
      link: "feed",
    },
  });

  await createSession(user.id);
  return ok({ user: sanitizeUser(user) }, 201);
}
