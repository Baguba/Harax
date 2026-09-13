/**
 * Bridge from Next REST routes → chat mini-service.
 *
 * When a message is created over REST, we ask the chat service (loopback
 * control endpoint on 127.0.0.1:3011) to broadcast it to every
 * socket-connected peer in the room — so REST sends are still real-time
 * for everyone else.
 *
 * Fire-and-forget by design: if the chat service is down the message is
 * already persisted; clients fall back to polling.
 */
const CHAT_INTERNAL_URL = process.env.CHAT_INTERNAL_URL ?? "http://127.0.0.1:3011";
const CHAT_INTERNAL_TOKEN = process.env.CHAT_INTERNAL_TOKEN ?? "harax-internal-2026";

export async function notifyChatBroadcast(payload: {
  roomType: "GROUP" | "SIDECHAT";
  roomId: string;
  messageId: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`${CHAT_INTERNAL_URL}/internal/broadcast`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-token": CHAT_INTERNAL_TOKEN,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
