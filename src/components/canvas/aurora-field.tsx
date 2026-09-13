"use client";

import { useEffect, useRef } from "react";

/**
 * AuroraField — cinematic canvas background.
 * Drifting gradient blobs + organic particle constellation,
 * inspired by film title sequences. GPU-light, DPR-aware.
 */
export function AuroraField({
  density = 70,
  blobs = 4,
  className = "",
  interactive = true,
  reduceOnMobile = true,
}: {
  density?: number;
  blobs?: number;
  className?: string;
  interactive?: boolean;
  reduceOnMobile?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const nParticles = reduceOnMobile && isMobile ? Math.round(density * 0.5) : density;

    let width = 0;
    let height = 0;
    let raf = 0;
    let mouseX = -9999;
    let mouseY = -9999;

    interface Particle {
      x: number; y: number; vx: number; vy: number;
      r: number; baseAlpha: number; phase: number; speed: number;
    }
    interface Blob {
      x: number; y: number; r: number; hue: string;
      vx: number; vy: number; phase: number;
    }

    const particles: Particle[] = [];
    const gradientBlobs: Blob[] = [];

    const LEMON = [163, 230, 53];
    const PALE = [217, 249, 157];
    const FOREST = [77, 124, 15];
    const PALETTE = [LEMON, PALE, FOREST, [134, 239, 172]];

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seed() {
      particles.length = 0;
      for (let i = 0; i < nParticles; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          r: 1 + Math.random() * 2.2,
          baseAlpha: 0.25 + Math.random() * 0.5,
          phase: Math.random() * Math.PI * 2,
          speed: 0.004 + Math.random() * 0.008,
        });
      }
      gradientBlobs.length = 0;
      for (let i = 0; i < blobs; i++) {
        gradientBlobs.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.min(width, height) * (0.22 + Math.random() * 0.28),
          hue: PALETTE[i % PALETTE.length].join(","),
          vx: (Math.random() - 0.5) * 0.14,
          vy: (Math.random() - 0.5) * 0.12,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    function draw(t: number) {
      ctx.clearRect(0, 0, width, height);

      // aurora blobs (lighter blend, low alpha)
      ctx.globalCompositeOperation = "lighter";
      for (const b of gradientBlobs) {
        const wobble = Math.sin(t * 0.00045 + b.phase) * 0.35;
        const bx = b.x + Math.cos(t * 0.0002 + b.phase) * 60;
        const by = b.y + Math.sin(t * 0.00025 + b.phase) * 45;
        const br = b.r * (1 + wobble * 0.18);
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        const dark = document.documentElement.classList.contains("dark");
        const alpha = dark ? 0.1 : 0.14;
        g.addColorStop(0, `rgba(${b.hue},${alpha})`);
        g.addColorStop(1, "rgba(163,230,53,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();

        b.x += b.vx;
        b.y += b.vy;
        if (b.x < -b.r || b.x > width + b.r) b.vx *= -1;
        if (b.y < -b.r || b.y > height + b.r) b.vy *= -1;
      }

      // particle constellation
      ctx.globalCompositeOperation = "source-over";
      for (const p of particles) {
        p.phase += p.speed;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width; else if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height; else if (p.y > height) p.y = 0;

        const alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(p.phase));
        ctx.fillStyle = `rgba(120, 160, 60, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // links between close particles (and to cursor)
      const linkDist = Math.min(width, height) * 0.14;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < linkDist * linkDist) {
            const o = (1 - Math.sqrt(d2) / linkDist) * 0.16;
            ctx.strokeStyle = `rgba(120, 170, 60, ${o})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        if (interactive) {
          const dx = a.x - mouseX;
          const dy = a.y - mouseY;
          const d2 = dx * dx + dy * dy;
          const mr = linkDist * 1.4;
          if (d2 < mr * mr) {
            const o = (1 - Math.sqrt(d2) / mr) * 0.38;
            ctx.strokeStyle = `rgba(163, 230, 53, ${o})`;
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(mouseX, mouseY);
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    }

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    const onLeave = () => {
      mouseX = -9999;
      mouseY = -9999;
    };

    resize();
    seed();
    if (reduced) {
      draw(0);
      cancelAnimationFrame(raf); // static single frame
    } else {
      raf = requestAnimationFrame(draw);
    }

    const ro = new ResizeObserver(() => {
      resize();
      seed();
    });
    ro.observe(canvas);
    if (interactive) {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerleave", onLeave);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [density, blobs, interactive, reduceOnMobile]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
