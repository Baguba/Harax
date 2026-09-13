"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { MiniAuthor } from "@/lib/types";

const SIZES = { sm: 28, md: 36, lg: 44, xl: 64, xxl: 96 } as const;

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
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-lime-300 to-lime-700 font-display font-bold text-ink",
        ring && "ring-2 ring-lemon/60 ring-offset-2 ring-offset-background",
        onClick && "cursor-pointer transition-transform hover:scale-105 active:scale-95",
        className
      )}
      style={{ width: px, height: px, fontSize: px * 0.38 }}
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
