import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

export const dynamic = "force-dynamic";

// Runtime fallback for /uploads/* — `next start` only serves public/ files that
// existed at boot, so freshly uploaded media would 404 until a restart. This
// handler streams files that live in public/uploads on disk right now.
// Files present at boot are still served by Next's static layer first.

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

const CONTENT_TYPE: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  if (!Array.isArray(segments) || segments.length === 0) {
    return new Response("Not found", { status: 404 });
  }
  const target = path.resolve(UPLOADS_DIR, ...segments);
  if (target !== UPLOADS_DIR && !target.startsWith(UPLOADS_DIR + path.sep)) {
    return new Response("Not found", { status: 404 }); // traversal guard
  }
  let fileStat;
  try {
    fileStat = await stat(target);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!fileStat.isFile()) {
    return new Response("Not found", { status: 404 });
  }
  const ext = path.extname(target).toLowerCase();
  const contentType = CONTENT_TYPE[ext] ?? "application/octet-stream";
  const stream = Readable.toWeb(createReadStream(target)) as unknown as ReadableStream;
  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": contentType,
      "content-length": String(fileStat.size),
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
