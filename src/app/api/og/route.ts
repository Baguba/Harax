import { ogSvg } from "@/lib/art";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const title = (url.searchParams.get("title") ?? "Harax").slice(0, 90);
  const seed = (url.searchParams.get("seed") ?? title).slice(0, 90);
  const cat = (url.searchParams.get("cat") ?? "CAMPUS").slice(0, 12).toUpperCase();
  const svg = ogSvg(seed, title, cat);
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
