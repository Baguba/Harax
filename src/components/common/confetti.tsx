"use client";

import { useEffect, useMemo, useState } from "react";

const COLORS = ["#a3e635", "#d9f99d", "#65a30d", "#facc15", "#4ade80", "#bef264"];

/** A small confetti burst — used on RSVP confirmations & milestone moments. */
export function ConfettiBurst({ trigger }: { trigger: number }) {
  const [expired, setExpired] = useState<number[]>([]);

  const pieces = useMemo(() => {
    if (trigger <= 0) return [];
    return Array.from({ length: 26 }, (_, i) => ({
      x: (Math.random() - 0.5) * 140,
      delay: Math.random() * 0.18,
      color: COLORS[i % COLORS.length],
      left: 20 + Math.random() * 60,
    }));
  }, [trigger]);

  useEffect(() => {
    if (trigger <= 0) return;
    const t = setTimeout(() => setExpired((e) => (e.includes(trigger) ? e : [...e, trigger])), 1700);
    return () => clearTimeout(t);
  }, [trigger]);

  if (trigger <= 0 || expired.includes(trigger)) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={`${trigger}-${i}`}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            top: "30%",
            background: p.color,
            animationDelay: `${p.delay}s`,
            transform: `translateX(${p.x}px)`,
          }}
        />
      ))}
    </div>
  );
}
