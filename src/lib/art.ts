// Deterministic SVG art generators for avatars & cover art.
// Everything is generated locally — no external image dependencies.

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const PALETTES: [string, string, string][] = [
  ["#a3e635", "#4d7c0f", "#0b0f0a"], // lemon → forest
  ["#bef264", "#3f6212", "#0b0f0a"], // lime → olive
  ["#d9f99d", "#65a30d", "#14210b"], // pale lime → lime
  ["#4ade80", "#166534", "#031a0d"], // green → deep forest
  ["#facc15", "#4d7c0f", "#0b0f0a"], // sun → forest
  ["#34d399", "#065f46", "#022c22"], // emerald
  ["#86efac", "#15803d", "#04120a"], // mint → green
];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function avatarSvg(seed: string, name: string, size = 96): string {
  const h = hashSeed(seed || name || "default");
  const [c1, c2, ink] = PALETTES[h % PALETTES.length];
  const angle = h % 360;
  const gid = `g${h % 99999}`;
  const iid = `i${h % 77777}`;
  const label = esc(initials(name || seed));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${angle} 0.5 0.5)">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="${iid}" cx="0.3" cy="0.2" r="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.28)}" fill="${ink}"/>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.28)}" fill="url(#${gid})"/>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.28)}" fill="url(#${iid})"/>
  <circle cx="${size * 0.82}" cy="${size * 0.18}" r="${size * 0.06}" fill="#ffffff" opacity="0.5"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
    font-family="'Space Grotesk','Inter',system-ui,sans-serif" font-weight="700"
    font-size="${Math.round(size * 0.36)}" fill="#0b0f0a" letter-spacing="0.5">${label}</text>
</svg>`;
}

function wrapTitle(title: string, max = 26): string[] {
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) {
      if (cur) lines.push(cur.trim());
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur.trim());
  return lines.slice(0, 3);
}

const CAT_EMOJI: Record<string, string> = {
  CAMPUS: "🏛",
  ACADEMIC: "🎓",
  SPORTS: "⚽",
  CULTURE: "🎭",
  CLUB: "🪩",
  CAREER: "💼",
};

export function ogSvg(seed: string, title: string, category = "CAMPUS", w = 1200, h = 630): string {
  const hh = hashSeed(seed || title);
  const [c1, c2, ink] = PALETTES[hh % PALETTES.length];
  const lines = wrapTitle(title);
  const emoji = CAT_EMOJI[category] ?? "✨";
  // deterministic decorative circles
  const orbs = [0, 1, 2, 3].map((i) => {
    const s = (hh >> (i * 5)) % 100 / 100;
    const x = 120 + Math.round(s * (w - 240));
    const y = 60 + Math.round(((hh >> (i * 7 + 3)) % 100 / 100) * (h - 120));
    const r = 40 + Math.round(((hh >> (i * 11 + 7)) % 100 / 100) * 120);
    const op = 0.12 + ((hh >> (i * 3 + 1)) % 10) / 100;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${i % 2 ? c1 : c2}" opacity="${op}"/>`;
  }).join("\n  ");
  const titleSvg = lines
    .map((l, i) => `<text x="64" y="${300 + i * 64}" font-family="'Space Grotesk','Inter',sans-serif" font-weight="700" font-size="56" fill="#f7fee7">${esc(l)}</text>`)
    .join("\n  ");
  const gid = `og${hh % 99999}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${ink}"/>
      <stop offset="1" stop-color="#12290f"/>
    </linearGradient>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.06"/></feComponentTransfer></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#${gid})"/>
  <rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.5"/>
  ${orbs}
  <rect x="0" y="0" width="14" height="${h}" fill="${c1}"/>
  <text x="64" y="120" font-family="'Space Grotesk','Inter',sans-serif" font-weight="500" font-size="26" fill="${c1}" letter-spacing="6">HARAX · HARAMAYA</text>
  ${titleSvg}
  <rect x="64" y="${340 + (lines.length - 1) * 64}" width="${120 + category.length * 14}" height="52" rx="26" fill="#a3e635"/>
  <text x="${124 + (category.length * 14) / 2}" y="${371 + (lines.length - 1) * 64}" text-anchor="middle" font-family="'Inter',sans-serif" font-weight="600" font-size="22" fill="#0b0f0a">${emoji} ${esc(category)}</text>
  <circle cx="${w - 110}" cy="${h - 110}" r="64" fill="none" stroke="${c1}" stroke-width="2" opacity="0.5"/>
  <text x="${w - 110}" y="${h - 96}" text-anchor="middle" font-size="40">⚡</text>
</svg>`;
}
