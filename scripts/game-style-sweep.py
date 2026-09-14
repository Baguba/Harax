#!/usr/bin/env python3
"""Sweep the Harax UI into the game-UI style:
- rounded-Nxl border bg-card / bg-popover cards -> game-card (fat ink outline + hard lift)
- hairline border-border/XX dividers -> bold 2px edge lines
- font-semibold on muted small text -> font-bold (chunkier voice)
Only touches class strings; component logic untouched.
"""
import re, pathlib

ROOT = pathlib.Path("/home/z/my-project/src/components")
SKIP = {"ui"}  # shadcn primitives handled manually

def sub_count(pat, repl, s):
    return re.subn(pat, repl, s)

total = 0
for f in ROOT.rglob("*.tsx"):
    if f.parent.name in SKIP:
        continue
    s = orig = f.read_text()
    n = 0

    # 1) main card surfaces -> game-card (keep radius, drop redundant border/bg)
    s, k = sub_count(r"rounded-(2xl|3xl|\[2\.5rem\]) border bg-card\b", r"game-card rounded-\1", s); n += k
    s, k = sub_count(r"rounded-(2xl|3xl) border bg-card/", r"game-card rounded-\1 bg-card/", s); n += k

    # 2) dividers: border-border/40-70 -> border-edge (2px)
    s, k = sub_count(r"border-b border-border/\d+", "border-b-2 border-edge", s); n += k
    s, k = sub_count(r"border-t border-border/\d+", "border-t-2 border-edge", s); n += k
    s, k = sub_count(r"border-r border-border/\d+", "border-r-2 border-edge", s); n += k
    s, k = sub_count(r"border-l border-border/\d+", "border-l-2 border-edge", s); n += k

    # 3) small chips: rounded-full border bg-card -> game-chip (keep bg if stated)
    s, k = sub_count(r"rounded-full border bg-card\b", "game-chip", s); n += k

    # 4) muted small labels: bump semibold -> bold in tiny text for the chunky voice
    s, k = sub_count(r"text-(\[[^\]]+\]|\d+px|xs|sm|base) font-semibold", r"text-\1 font-bold", s); n += k

    if n:
        f.write_text(s)
        total += n
        print(f"{n:3d}  {f.relative_to(ROOT)}")
print("TOTAL:", total)
