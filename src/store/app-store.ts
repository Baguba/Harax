"use client";

import { create } from "zustand";
import type { SessionUser } from "@/lib/types";

export type ViewName =
  | "feed"
  | "explore"
  | "events"
  | "groups"
  | "group"
  | "channels"
  | "channel"
  | "sidechat"
  | "games"
  | "notifications"
  | "profile"
  | "settings"
  | "admin";

export interface View {
  name: ViewName;
  id?: string; // group id / channel id / profile id
}

interface AppState {
  user: SessionUser | null;
  authChecked: boolean;
  view: View;
  viewHistory: View[];
  authOpen: boolean;
  authMode: "login" | "register";
  composerOpen: boolean; // mobile quick composer
  setAuthChecked: (v: boolean) => void;
  setUser: (u: SessionUser | null) => void;
  setView: (v: View) => void;
  goBack: () => void;
  openAuth: (mode?: "login" | "register") => void;
  closeAuth: () => void;
  setAuthMode: (m: "login" | "register") => void;
  setComposerOpen: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  authChecked: false,
  view: { name: "feed" },
  viewHistory: [],
  authOpen: false,
  authMode: "login",
  composerOpen: false,
  setAuthChecked: (v) => set({ authChecked: v }),
  setUser: (u) => set({ user: u }),
  setView: (v) => {
    const { view, viewHistory } = get();
    if (view.name === v.name && view.id === v.id) return;
    set({ view: v, viewHistory: [...viewHistory.slice(-8), view], composerOpen: false });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  },
  goBack: () => {
    const { viewHistory } = get();
    if (viewHistory.length === 0) {
      set({ view: { name: "feed" } });
      return;
    }
    const history = [...viewHistory];
    const prev = history.pop()!;
    set({ view: prev, viewHistory: history });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  },
  openAuth: (mode = "login") => set({ authOpen: true, authMode: mode }),
  closeAuth: () => set({ authOpen: false }),
  setAuthMode: (m) => set({ authMode: m }),
  setComposerOpen: (v) => set({ composerOpen: v }),
}));
