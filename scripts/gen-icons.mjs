#!/usr/bin/env node
/**
 * Generate PWA / Play Store PNG icons from the hand-drawn Harax SVG sources.
 * Output (public/):
 *   icon-192.png            192x192  purpose "any"      (transparent bg)
 *   icon-512.png            512x512  purpose "any"      (transparent bg)
 *   icon-maskable-192.png   192x192  purpose "maskable" (full-bleed lemon field)
 *   icon-maskable-512.png   512x512  purpose "maskable" (full-bleed lemon field)
 *   apple-touch-icon.png    180x180  iOS home screen    (opaque)
 * Also copies a Play-Store-ready 512 icon to download/play-store-icon-512.png
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const pub = path.join(root, "public");
const dl = path.join(root, "download");
fs.mkdirSync(dl, { recursive: true });

const anySvg = fs.readFileSync(path.join(pub, "icon.svg"));
// Maskable: flatten rounded corners to a full square so Android masks crop cleanly.
const maskSvg = fs
  .readFileSync(path.join(pub, "icon-maskable.svg"))
  .toString()
  .replace('rx="112"', 'rx="0"');

async function renderPng({ svg, intrinsic, size, out, flatten }) {
  // render at >=2x target then downscale — guarantees exact dimensions & clean edges
  const renderSize = Math.max(size * 2, 256);
  const density = Math.round((72 * renderSize) / intrinsic);
  let img = sharp(Buffer.from(svg), { density }).resize(size, size, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  if (flatten) img = img.flatten({ background: "#a3e635" });
  await img.png().toFile(out);
  const meta = await sharp(out).metadata();
  console.log(
    `ok ${path.basename(out)}  ${meta.width}x${meta.height}  ${(fs.statSync(out).size / 1024).toFixed(1)}KB`
  );
}

const jobs = [
  // "any" icons keep the transparent, sticker-like look of icon.svg (64px intrinsic)
  { svg: anySvg, intrinsic: 64, size: 192, out: path.join(pub, "icon-192.png") },
  { svg: anySvg, intrinsic: 64, size: 512, out: path.join(pub, "icon-512.png") },
  // maskable icons: full-bleed lemon field, safe-zone padded artwork (512px intrinsic)
  { svg: maskSvg, intrinsic: 512, size: 192, out: path.join(pub, "icon-maskable-192.png") },
  { svg: maskSvg, intrinsic: 512, size: 512, out: path.join(pub, "icon-maskable-512.png") },
  // iOS apple-touch-icon must be opaque — reuse full-bleed art
  { svg: maskSvg, intrinsic: 512, size: 180, out: path.join(pub, "apple-touch-icon.png") },
];

for (const j of jobs) await renderPng(j);

// Play Store listing icon: 512x512 opaque PNG
fs.copyFileSync(path.join(pub, "icon-maskable-512.png"), path.join(dl, "play-store-icon-512.png"));
console.log("ok download/play-store-icon-512.png (copy of maskable-512)");
