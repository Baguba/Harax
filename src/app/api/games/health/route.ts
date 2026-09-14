import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

const CHAT_INTERNAL_URL = process.env.CHAT_INTERNAL_URL ?? "http://127.0.0.1:3011";

/**
 * GET /api/games/health — is the real-time game service alive?
 *
 * The Game Zone needs the socket.io service (chat-service on :3003) for
 * matchmaking and live play. This endpoint probes its loopback control
 * port server-side, so the UI can tell the difference between
 * "the service isn't running" and "your network is blocking the
 * real-time connection".
 */
export async function GET() {
  try {
    const res = await fetch(`${CHAT_INTERNAL_URL}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    return ok({ socketService: res.ok });
  } catch {
    return ok({ socketService: false });
  }
}
