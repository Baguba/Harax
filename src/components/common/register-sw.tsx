"use client";

import { useEffect } from "react";

/**
 * Registers the service worker in production builds only.
 * In `next dev` the SW would fight the dev server's hot reload — so it stays off.
 */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const t = setTimeout(() => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline support is a bonus, never a blocker */
      });
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  return null;
}
