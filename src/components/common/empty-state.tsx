"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  emoji,
  title,
  description,
  action,
  className,
}: {
  emoji: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/80 px-6 py-14 text-center", className)}>
      <div className="relative">
        <div className="absolute inset-0 -z-10 animate-pulse-glow rounded-full" />
        <span className="text-5xl" role="img" aria-label={title}>
          {emoji}
        </span>
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}
