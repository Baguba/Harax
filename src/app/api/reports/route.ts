import { db } from "@/lib/db";
import { ok, fail, readJson } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { reportSchema, firstError } from "@/lib/validation";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Sign in to report content.", 401);

  const rl = rateLimit({ key: clientKey(req, `report:${user.id}`), max: 10, windowMs: 10 * 60_000 });
  if (!rl.ok) return fail("Too many reports.", 429);

  const body = await readJson(req);
  if (!body) return fail("Invalid request body");
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) return fail(firstError(parsed.error), 422);

  await db.report.create({
    data: {
      reporterId: user.id,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason,
    },
  });

  return ok({ reported: true, message: "Thanks — our moderators will review it." }, 201);
}
