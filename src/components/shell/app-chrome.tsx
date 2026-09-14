"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, Compass, CalendarDays, Users, Megaphone, Ghost, Bell, User as UserIcon, ShieldCheck, BadgeCheck, Plus, LogOut, Moon, Sun, Search, X, ChevronLeft } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore, type View, type ViewName } from "@/store/app-store";
import { api, timeAgo } from "@/lib/client-api";
import type { SearchResults, NotificationDTO, SessionUser } from "@/lib/types";
import { HaraxLogo, HaraxMark } from "@/components/common/harax-logo";
import { UserAvatar } from "@/components/common/user-avatar";
import { RoleBadge } from "@/components/common/role-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const NAV_ITEMS: Array<{ name: ViewName; label: string; icon: React.ElementType; showFor?: "admin" }> = [
  { name: "feed", label: "Feed", icon: Newspaper },
  { name: "explore", label: "Explore", icon: Compass },
  { name: "events", label: "Events", icon: CalendarDays },
  { name: "groups", label: "Groups", icon: Users },
  { name: "channels", label: "Channels", icon: Megaphone },
  { name: "sidechat", label: "Sidechat", icon: Ghost },
  { name: "notifications", label: "Notifications", icon: Bell },
  { name: "profile", label: "Profile", icon: UserIcon },
  { name: "admin", label: "Admin", icon: ShieldCheck, showFor: "admin" },
];

export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === "ADMIN" || user?.role === "SUPERADMIN";
}

/* ── Sidebar (desktop) ─────────────────────────────────── */
export function Sidebar({ unread, onLogout }: { unread: number; onLogout: () => void }) {
  const { user, view, setView, setComposerOpen } = useAppStore();
  if (!user) return null;

  return (
    <aside className="sticky top-0 hidden h-svh w-[248px] shrink-0 flex-col border-r-2 border-edge bg-card px-4 py-5 lg:flex">
      <button className="px-2 py-1 text-left" onClick={() => setView({ name: "feed" })} aria-label="Harax home">
        <HaraxLogo size={36} />
      </button>

      <Button
        onClick={() => setComposerOpen(true)}
        className="mt-6 h-11 rounded-2xl text-game-caps"
      >
        <Plus className="h-5 w-5" /> New post
      </Button>

      <nav className="mt-6 flex-1 space-y-1.5" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          if (item.showFor === "admin" && !isAdmin(user)) return null;
          const active = view.name === item.name || (item.name === "profile" && view.name === "profile");
          return (
            <button
              key={item.name}
              onClick={() => setView(item.name === "profile" ? { name: "profile", id: user.id } : { name: item.name })}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-xl border-2 px-3.5 py-2 text-sm font-bold transition-all",
                active
                  ? "border-ink bg-lemon text-ink shadow-[0_3px_0_0_var(--bevel-lemon)]"
                  : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className={cn("h-5 w-5 transition-transform group-hover:scale-110")} />
              {item.label}
              {item.name === "notifications" && unread > 0 && (
                <Badge className="ml-auto h-5 min-w-5 rounded-full bg-ink px-1.5 text-[10px] font-bold text-lemon">{unread}</Badge>
              )}
            </button>
          );
        })}
      </nav>

      <div className="game-inset p-3">
        <div className="flex items-center gap-2.5">
          <UserAvatar user={user} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight">{user.name}</p>
            <p className="truncate text-[10px] font-bold text-muted-foreground leading-tight">{user.department ?? user.role}</p>
          </div>
          <button
            onClick={onLogout}
            className="rounded-lg border-2 border-transparent p-1.5 text-muted-foreground transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-500/40 dark:hover:bg-red-500/10"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ── Topbar with global search ─────────────────────────── */
export function Topbar({ unread, onLogout }: { unread: number; onLogout: () => void }) {
  const { user, setView, view } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      const res = await api<SearchResults>(`/api/search?q=${encodeURIComponent(q.trim())}`);
      setSearching(false);
      if (res.ok) {
        setResults(res.data);
        setOpen(true);
      }
    }, 350);
  }, [q]);

  const onQueryChange = (v: string) => {
    setQ(v);
    if (v.trim().length < 2) {
      setResults(null);
      setOpen(false);
    }
  };

  const go = (v: View) => {
    setOpen(false);
    setQ("");
    setView(v);
  };

  return (
    <header className="sticky top-0 z-30 border-b-2 border-edge bg-card/95 backdrop-blur-sm">
      <div className="flex h-14 items-center gap-3 px-3 sm:px-5">
        {/* mobile back / logo */}
        <button className="lg:hidden" onClick={() => useAppStore.getState().goBack()} aria-label="Go back">
          <ChevronLeft className="h-6 w-6 text-muted-foreground" />
        </button>
        <button className="lg:hidden" onClick={() => setView({ name: "feed" })} aria-label="Harax home">
          <HaraxMark size={32} />
        </button>

        {/* search */}
        <div className="relative mx-auto w-full max-w-xl">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => q.trim().length >= 2 && setOpen(true)}
            placeholder="Search people, groups, channels, events…"
            className="h-10 rounded-xl border-2 border-input bg-card pl-10 pr-9 text-sm font-bold shadow-[0_3px_0_0_var(--edge-soft)] focus-visible:shadow-none"
            aria-label="Global search"
          />
          {q && (
            <button onClick={() => { setQ(""); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Clear search">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}

          <AnimatePresence>
            {open && results && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute inset-x-0 top-12 z-50 max-h-[70svh] overflow-y-auto rounded-2xl border bg-popover p-2 shadow-2xl nice-scrollbar"
              >
                {searching && <p className="p-3 text-xs text-muted-foreground">Searching…</p>}
                {results.users.length === 0 && results.groups.length === 0 && results.channels.length === 0 && results.events.length === 0 && !searching && (
                  <p className="p-3 text-xs text-muted-foreground">Nothing found for "{q}"</p>
                )}
                {results.users.length > 0 && <SearchGroup label="People">
                  {results.users.map((u) => (
                    <SearchRow key={u.id} onClick={() => go({ name: "profile", id: u.id })}>
                      <UserAvatar user={u} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-bold">{u.name}</span>
                      {u.verified && <BadgeCheck className="h-3.5 w-3.5 text-lime-600" aria-label="Verified" />}
                      <span className="truncate text-[10px] text-muted-foreground">{u.department}</span>
                    </SearchRow>
                  ))}
                </SearchGroup>}
                {results.groups.length > 0 && <SearchGroup label="Groups">
                  {results.groups.map((g) => (
                    <SearchRow key={g.id} onClick={() => go({ name: "group", id: g.id })}>
                      <span className="text-lg">{g.emoji}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold">{g.name}</span>
                      <span className="text-[10px] text-muted-foreground">{g.memberCount} members</span>
                    </SearchRow>
                  ))}
                </SearchGroup>}
                {results.channels.length > 0 && <SearchGroup label="Channels">
                  {results.channels.map((c) => (
                    <SearchRow key={c.id} onClick={() => go({ name: "channel", id: c.id })}>
                      <Megaphone className="h-4 w-4 text-lime-600" />
                      <span className="min-w-0 flex-1 truncate text-sm font-bold">{c.name}</span>
                      {c.official && <Badge className="h-4 rounded bg-lemon px-1 text-[8px] font-bold text-ink">✓</Badge>}
                    </SearchRow>
                  ))}
                </SearchGroup>}
                {results.events.length > 0 && <SearchGroup label="Events">
                  {results.events.map((e) => (
                    <SearchRow key={e.id} onClick={() => go({ name: "events" })}>
                      <CalendarDays className="h-4 w-4 text-lime-600" />
                      <span className="min-w-0 flex-1 truncate text-sm font-bold">{e.title}</span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(e.startsAt)}</span>
                    </SearchRow>
                  ))}
                </SearchGroup>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* actions */}
        <button
          onClick={() => setView({ name: "notifications" })}
          className="relative rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <motion.span
              key={unread}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-lemon px-1 text-[9px] font-bold text-ink"
            >
              {unread}
            </motion.span>
          )}
        </button>
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        )}
        {user && (
          <button onClick={() => setView({ name: "profile", id: user.id })} className="hidden sm:block" aria-label="My profile">
            <UserAvatar user={user} size="md" ring={view.name === "profile"} />
          </button>
        )}
      </div>
    </header>
  );
}

function SearchGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function SearchRow({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted">
      {children}
    </button>
  );
}

/* ── Mobile bottom nav ─────────────────────────────────── */
export function MobileNav({ unread }: { unread: number }) {
  const { user, view, setView, setComposerOpen } = useAppStore();
  const items = useMemo(() => {
    const base: Array<{ name: ViewName; label: string; icon: React.ElementType; id?: string }> = [
      { name: "feed", label: "Feed", icon: Newspaper },
      { name: "events", label: "Events", icon: CalendarDays },
    ];
    return base;
  }, []);

  return (
    <>
      {/* mobile new post FAB */}
      <button
        onClick={() => setComposerOpen(true)}
        className="fixed bottom-[84px] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-primary text-primary-foreground shadow-[0_5px_0_0_var(--bevel-lemon)] transition-transform hover:scale-105 active:translate-y-[3px] active:shadow-none lg:hidden"
        aria-label="Create post"
      >
        <Plus className="h-6 w-6" strokeWidth={3} />
      </button>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-edge bg-card/97 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden" aria-label="Mobile navigation">
        <div className="grid grid-cols-5">
          {items.map((item) => (
            <TabButton key={item.name} item={item} />
          ))}
          <TabButton item={{ name: "sidechat", label: "Side", icon: Ghost }} />
          <TabButton item={{ name: "groups", label: "Groups", icon: Users }} />
          <button
            onClick={() => user && setView({ name: "profile", id: user.id })}
            className="flex flex-col items-center justify-center gap-0.5 py-2.5"
            aria-label="Profile"
          >
            {user ? (
              <UserAvatar user={user} size="sm" ring={view.name === "profile"} className={view.name === "profile" ? "scale-110" : ""} />
            ) : (
              <UserIcon className="h-5 w-5" />
            )}
            <span className={cn("text-[9px] font-bold", view.name === "profile" ? "text-lime-700 dark:text-lime-300" : "text-muted-foreground")}>Me</span>
          </button>
        </div>
      </nav>
    </>
  );
}

function TabButton({ item }: { item: { name: ViewName; label: string; icon: React.ElementType } }) {
  const { view, setView } = useAppStore();
  const active = view.name === item.name;
  const unread = useAppStore((s) => s.user) ? 0 : 0;
  return (
    <button
      onClick={() => setView({ name: item.name })}
      className="flex flex-col items-center justify-center gap-0.5 py-2.5"
      aria-current={active ? "page" : undefined}
    >
      <span className={cn(
        "flex h-7 w-12 items-center justify-center rounded-full border-2 transition-all",
        active ? "border-ink bg-lemon shadow-[0_2px_0_0_var(--bevel-lemon)]" : "border-transparent"
      )}>
        <item.icon className={cn("h-4.5 w-4.5 transition-all", active ? "text-ink" : "text-muted-foreground")} />
      </span>
      <span className={cn("text-[9px] font-bold", active ? "text-lime-800 dark:text-lime-300" : "text-muted-foreground")}>{item.label}</span>
    </button>
  );
}

/* ── Notification bell polling hook ────────────────────── */
export function useUnreadCount(enabled: boolean): number {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = async () => {
      const res = await api<{ unread: number }>("/api/notifications");
      if (alive && res.ok) setUnread(res.data.unread);
    };
    load();
    const iv = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [enabled]);
  return unread;
}

export function logoutFlow(): Promise<void> {
  return api("/api/auth/logout", { method: "POST" }).then(() => {
    toast("Signed out — see you on campus 👋");
  });
}
