import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { ok, fail } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/upload — multipart file upload for post media, profile photos and banners.
// Security: session required, per-user rate limit, declared-type AND magic-byte checks,
// whitelisted extensions only, random filenames (no path input from the client), hard size caps.

const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const VIDEO_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const MAX = {
  avatar: 5 * 1024 * 1024, // 5 MB
  cover: 8 * 1024 * 1024, // 8 MB
  image: 8 * 1024 * 1024, // 8 MB — post photos
  video: 64 * 1024 * 1024, // 64 MB — post videos
} as const;

const BODY_HARD_CAP = 70 * 1024 * 1024; // reject absurd bodies before buffering

/** Sniff the real format from magic bytes so a renamed .exe can never pass as an image. */
function sniffImage(buf: Buffer): string | null {
  const ascii = (start: number, len: number) => buf.subarray(start, start + len).toString("latin1");
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && ascii(0, 8) === "\x89PNG\r\n\x1a\n") return "image/png";
  if (buf.length >= 6 && (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a")) return "image/gif";
  if (buf.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  return null;
}

function sniffVideo(buf: Buffer): string | null {
  if (buf.length >= 12 && buf.subarray(4, 8).toString("latin1") === "ftyp") return "video/mp4"; // mp4 & mov share the ftyp box
  if (buf.length >= 4 && buf.subarray(0, 4).toString("latin1") === "\x1aE\xdf\xa3") return "video/webm"; // EBML header (webm/mkv)
  return null;
}

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Sign in first.", 401);

  const rl = rateLimit({ key: `upload:${user.id}`, max: 20, windowMs: 5 * 60_000 });
  if (!rl.ok) return fail(`Slow down a little — try again in ${rl.retryAfterSec}s.`, 429);

  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > BODY_HARD_CAP) return fail("That file is way too big.", 413);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("Upload failed — corrupted form data.", 400);
  }

  const file = form.get("file");
  const purpose = String(form.get("purpose") ?? "post").toLowerCase();
  if (!["avatar", "cover", "post"].includes(purpose)) return fail("Unknown upload purpose.", 422);
  if (!(file instanceof File) || file.size === 0) return fail("No file received.", 422);

  const declaredType = (file.type || "").toLowerCase();

  // Videos are only allowed on post media — never avatars/banners.
  const isImage = declaredType in IMAGE_EXT;
  const isVideo = declaredType in VIDEO_EXT;
  if (purpose === "avatar" && !isImage) return fail("Profile photos must be JPG, PNG, WebP or GIF images.", 422);
  if (purpose === "cover" && !isImage) return fail("Banners must be JPG, PNG, WebP or GIF images.", 422);
  if (!isImage && !isVideo) return fail("Only JPG, PNG, WebP, GIF images and MP4/WebM/MOV videos are allowed.", 422);

  const cap = purpose === "avatar" ? MAX.avatar : purpose === "cover" ? MAX.cover : isVideo ? MAX.video : MAX.image;
  if (file.size > cap) {
    return fail(`File is too big — the limit is ${Math.round(cap / 1024 / 1024)} MB.`, 413);
  }

  const buf = Buffer.from(await file.arrayBuffer());

  // Magic-byte check: the real format must back up the declared type.
  const sniffed = isImage ? sniffImage(buf) : sniffVideo(buf);
  if (isImage && sniffed !== declaredType) {
    return fail("That doesn't look like a real image — file may be corrupted or mislabeled.", 422);
  }
  if (isVideo && !sniffed) {
    return fail("That doesn't look like a real video file.", 422);
  }

  const ext = (isImage ? IMAGE_EXT[declaredType] : VIDEO_EXT[declaredType]) ?? "bin";
  const name = `${randomUUID()}.${ext}`;

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, name), buf);
  } catch {
    return fail("Could not save the file — check server permissions on public/uploads.", 500);
  }

  return ok({
    url: `/uploads/${name}`,
    mediaType: isImage ? "image" : "video",
    purpose,
  });
}

// DELETE /api/upload?url=/uploads/<uuid>.<ext> — remove a file you previously uploaded.
export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Sign in first.", 401);

  const url = new URL(req.url).searchParams.get("url") ?? "";
  if (!/^\/uploads\/[a-f0-9-]{36}\.(jpg|png|webp|gif|mp4|webm|mov)$/i.test(url)) {
    return fail("Invalid file reference.", 422);
  }

  try {
    await unlink(path.join(process.cwd(), "public", url));
  } catch {
    // already gone — treat as success so clients can clean up state idempotently
  }
  return ok({ removed: url });
}
