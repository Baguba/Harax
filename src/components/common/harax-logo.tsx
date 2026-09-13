"use client";

import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function HaraxMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-lime-300 via-lime-400 to-lime-700 shadow-[0_4px_16px_rgba(163,230,53,0.4)]",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Zap className="text-ink fill-ink" strokeWidth={2.5} style={{ width: size * 0.55, height: size * 0.55 }} />
      <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-white/70" />
    </span>
  );
}

export function HaraxLogo({ size = 36, showText = true, className }: { size?: number; showText?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <HaraxMark size={size} />
      {showText && (
        <span className="font-display text-2xl font-bold tracking-tight">
          <span className="text-foreground">Ha</span>
          <span className="text-lemon-gradient">rax</span>
        </span>
      )}
    </span>
  );
}
