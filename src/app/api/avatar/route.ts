import { avatarSvg } from "@/lib/art";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const name = (url.searchParams.get("name") ?? "Harax").slice(0, 60);
  const seed = (url.searchParams.get("seed") ?? name).slice(0, 60);
  const size = Math.min(256, Math.max(32, Number(url.searchParams.get("size") ?? 96) || 96));
  const svg = avatarSvg(seed, name, size);
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
