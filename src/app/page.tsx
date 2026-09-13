"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { api } from "@/lib/client-api";
import type { SessionUser } from "@/lib/types";
import { Landing } from "@/components/landing/landing";
import { AuthModal } from "@/components/auth/auth-modal";
import { AppShell } from "@/components/shell/app-shell";
import { HaraxMark } from "@/components/common/harax-logo";

export default function Home() {
  const { user, setUser, authChecked, setAuthChecked } = useAppStore();
  const [initialUser, setInitialUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let mounted = true;
    api<{ user: SessionUser | null }>("/api/auth/me").then((res) => {
      if (!mounted) return;
      if (res.ok && res.data.user) {
        setUser(res.data.user);
        setInitialUser(res.data.user);
      }
      setAuthChecked(true);
    });
    return () => {
      mounted = false;
    };
  }, [setUser, setAuthChecked]);

  return (
    <>
      <AnimatePresence mode="wait">
        {!authChecked ? (
          <BootScreen key="boot" />
        ) : user ? (
          <motion.div key="app" initial={{ opacity: 0, scale: 0.995 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
            <AppShell initialUser={initialUser} />
          </motion.div>
        ) : (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <Landing />
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal />
    </>
  );
}

function BootScreen() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-background">
      <motion.div
        initial={{ scale: 0.7, rotate: -8, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        <HaraxMark size={72} />
      </motion.div>
      <div className="text-center">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="font-display text-3xl font-bold tracking-tight text-foreground"
        >
          harax
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-1 text-xs font-medium text-muted-foreground"
        >
          Waking up the campus…
        </motion.p>
      </div>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full w-1/2 rounded-full bg-primary"
          animate={{ x: ["-100%", "220%"] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
