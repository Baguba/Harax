"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { MiniAuthor } from "@/lib/types";

const SIZES = { sm: 28, md: 36, lg: 44, xl: 64, xxl: 96 } as const;

/* flat, friendly palette — picked deterministically from the name */
const AVATAR_BG = ["#a3e635", "#d9f99d", "#bef264", "#ecfccb", "#65a30d"];
const AVATAR_FG = ["#0c110b", "#0c110b", "#0c110b", "#1c2b12", "#0c110b"];

function colorFor(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % AVATAR_BG.length;
}

export function UserAvatar({
  user,
  size = "md",
  className,
  ring = false,
  onClick,
}: {
  user: Pick<MiniAuthor, "name" | "avatarUrl">;
  size?: keyof typeof SIZES;
  className?: string;
  ring?: boolean;
  onClick?: () => void;
}) {
  const px = SIZES[size];
  const colorIdx = colorFor(user.name || "?");
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <span
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full border-2 border-ink font-display font-bold",
        ring && "ring-2 ring-lemon ring-offset-2 ring-offset-background",
        onClick && "cursor-pointer transition-transform hover:scale-105 active:scale-95",
        className
      )}
      style={{ width: px, height: px, fontSize: px * 0.38, background: AVATAR_BG[colorIdx], color: AVATAR_FG[colorIdx] }}
      aria-label={`${user.name} avatar`}
    >
      {user.avatarUrl ? (
        <Image
          src={user.avatarUrl}
          alt=""
          width={px * 2}
          height={px * 2}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        initials || "?"
      )}
    </span>
  );
}
