#!/usr/bin/env python3
"""Pad Play Store screenshots to exactly 1080x1920 (9:16) with the app's cream background.
Keeps all content by scaling down and padding horizontally."""
from PIL import Image
import os

SRC = "/home/z/my-project/download/play-store"
TARGET_W, TARGET_H = 1080, 1920
BG = (237, 241, 228)  # #edf1e4

for name in sorted(os.listdir(SRC)):
    if not name.endswith(".png") or name.startswith("feature"):
        continue
    p = os.path.join(SRC, name)
    im = Image.open(p).convert("RGB")
    w, h = im.size
    # scale to fit height 1920
    scale = TARGET_H / h
    nw = round(w * scale)
    im = im.resize((nw, TARGET_H), Image.LANCZOS)
    if nw > TARGET_W:  # just in case — crop centered
        x = (nw - TARGET_W) // 2
        im = im.crop((x, 0, x + TARGET_W, TARGET_H))
    else:
        canvas = Image.new("RGB", (TARGET_W, TARGET_H), BG)
        canvas.paste(im, ((TARGET_W - nw) // 2, 0))
        im = canvas
    im.save(p, optimize=True)
    print(f"{name}: -> {im.size[0]}x{im.size[1]}")
