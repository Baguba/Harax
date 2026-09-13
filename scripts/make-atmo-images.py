#!/usr/bin/env python3
"""Convert the two uploaded campus photos into optimized, atmospheric-ready WebP backgrounds."""
from PIL import Image, ImageEnhance
import os

OUT = "/home/z/my-project/public/img/landing"
os.makedirs(OUT, exist_ok=True)

jobs = [
    # (src, out, max_width, quality)
    ("/home/z/my-project/upload/2hara.png", f"{OUT}/campus-aerial.webp", 1600, 68),
    ("/home/z/my-project/upload/ChatGPT Image Sep 13, 2026, 06_13_47 PM.png", f"{OUT}/gate.webp", 1448, 70),
]

for src, out, max_w, q in jobs:
    im = Image.open(src).convert("RGB")
    if im.width > max_w:
        h = round(im.height * max_w / im.width)
        im = im.resize((max_w, h), Image.LANCZOS)
    # gentle atmospheric pre-treatment: slightly lift + soften saturation so it
    # sits behind text without fighting it (final blur/tint happens in CSS)
    im = ImageEnhance.Color(im).enhance(0.85)
    im = ImageEnhance.Brightness(im).enhance(1.06)
    im.save(out, "WEBP", quality=q, method=6)
    print(f"{out}  {im.width}x{im.height}  {os.path.getsize(out)//1024} KB")

print("done")
