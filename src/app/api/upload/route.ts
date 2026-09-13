import { ok, fail } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
};
const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
};
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_VIDEO = 32 * 1024 * 1024;

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Sign in to upload media.", 401);

  const rl = rateLimit({ key: clientKey(req, `upload:${user.id}`), max: 12, windowMs: 10 * 60_000 });
  if (!rl.ok) return fail(`Slow down a little. Try again in ${rl.retryAfterSec}s.`, 429);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("Invalid upload payload.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) return fail("No file received.");
  if (file.size === 0) return fail("The file is empty.");

  const type = file.type;
  let ext: string;
  let kind: "image" | "video";
  if (IMAGE_TYPES[type]) {
    if (file.size > MAX_IMAGE) return fail("Images must be under 8 MB.", 413);
    ext = IMAGE_TYPES[type]; kind = "image";
  } else if (VIDEO_TYPES[type]) {
    if (file.size > MAX_VIDEO) return fail("Videos must be under 32 MB. Keep clips short! 🎬", 413);
    ext = VIDEO_TYPES[type]; kind = "video";
  } else {
    return fail("Unsupported file type. Use JPG, PNG, WEBP, GIF, MP4, WEBM or MOV.", 415);
  }

  const name = `${randomUUID()}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, name), buf);

  return ok({ url: `/uploads/${name}`, mediaType: kind, size: file.size }, 201);
}
