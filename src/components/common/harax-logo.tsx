"use client";

import { cn } from "@/lib/utils";

/**
 * Harax mark — a hand-drawn speech bubble with a lowercase "h" inside
 * and a little leaf sprouting off the corner (a nod to Haramaya's
 * agricultural roots). Slightly tilted, thick rounded strokes: it should
 * feel like something a student doodled on the back of a notebook,
 * not a corporate asset.
 */
function MarkSvg({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Harax logo"
    >
      <g transform="rotate(-4 32 32)">
        {/* speech bubble — deliberately a bit wobbly, with a doodled tail */}
        <path
          d="M22 12C17.2 12 13.2 16 13.2 20.8C13.2 25.2 13 29.4 13.2 33.6C13.4 38.2 17.2 41.8 22 41.8L27.8 41.8C25.2 45.2 22.4 48.3 20.2 50.6C23.6 49 27.2 45.4 30.6 42C34.9 42 39.7 41.9 44 41.6C48.8 41.4 52.4 37.8 52.4 33C52.5 29 52.6 24.6 52.4 20.6C52.3 16 48.6 12.2 43.8 12.2C36 12.1 28.5 12 22 12Z"
          fill="var(--lemon)"
          stroke="var(--ink)"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        {/* the lowercase h, drawn like one pen stroke */}
        <path
          d="M28.6 19.4L28.6 35M28.6 25.6C29.8 23.4 31.8 22.6 33.7 23.1C35.9 23.7 37 25.8 36.9 28.3L36.9 35"
          stroke="var(--ink)"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
      </g>
      {/* leaf sprouting off the top-right corner */}
      <g transform="translate(44.2 1.8) rotate(32)">
        <path
          d="M1.4 9.4C0.4 4.5 3.3 0.8 8.4 0.6C9.6 5.5 6.9 9.6 1.9 10C1.7 10 1.5 9.7 1.4 9.4Z"
          fill="#4d7c0f"
          stroke="var(--ink)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M2.8 7.7C4.4 5.7 6.2 3.8 8.1 2.3"
          stroke="#d9f99d"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export function HaraxMark({ className, size = 36 }: { className?: string; size?: number }) {
  return <MarkSvg size={size} className={cn("inline-block shrink-0", className)} />;
}

export function HaraxLogo({
  size = 36,
  showText = true,
  className,
  textClassName,
}: {
  size?: number;
  showText?: boolean;
  className?: string;
  textClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <HaraxMark size={size} />
      {showText && (
        <span className={cn("font-display font-bold tracking-tight text-foreground", textClassName)} style={{ fontSize: size * 0.62 }}>
          harax
        </span>
      )}
    </span>
  );
}
