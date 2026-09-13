// Typed fetch wrapper for all Harax API calls.
export async function api<T = unknown>(
  path: string,
  options?: { method?: string; body?: unknown; signal?: AbortSignal }
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(path, {
      method: options?.method ?? (options?.body ? "POST" : "GET"),
      headers: options?.body ? { "Content-Type": "application/json" } : undefined,
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: options?.signal,
      credentials: "same-origin",
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      return { ok: false, error: json?.error ?? `Request failed (${res.status})` };
    }
    return { ok: true, data: json.data as T };
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return { ok: false, error: "aborted" };
    return { ok: false, error: "Network hiccup — check your connection." };
  }
}

/** Query-friendly version: unwraps the envelope and throws on error (for react-query). */
export async function apiQ<T>(path: string): Promise<T> {
  const res = await api<T>(path);
  if (!res.ok) throw new Error(res.error);
  return res.data;
}

export async function uploadFile(file: File): Promise<{ ok: true; url: string; mediaType: "image" | "video" } | { ok: false; error: string }> {
  try {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) return { ok: false, error: json?.error ?? "Upload failed" };
    return { ok: true, url: json.data.url, mediaType: json.data.mediaType };
  } catch {
    return { ok: false, error: "Upload failed — try a smaller file." };
  }
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 0) return "just now";
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatEventDate(iso: string): { day: string; month: string; time: string; full: string } {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("en-GB", { day: "2-digit" }),
    month: d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
    time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    full: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" }),
  };
}
