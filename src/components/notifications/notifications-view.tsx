"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api, apiQ, timeAgo } from "@/lib/client-api";
import type { NotificationDTO } from "@/lib/types";
import { useAppStore } from "@/store/app-store";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Heart, MessageCircle, CalendarDays, Megaphone, Users, Info, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_META: Record<string, { icon: React.ElementType; className: string; label: string }> = {
  POST_REACTION: { icon: Heart, className: "bg-red-100 text-red-500 dark:bg-red-500/15 dark:text-red-300", label: "Reaction" },
  POST_COMMENT: { icon: MessageCircle, className: "bg-lime-100 text-lime-800 dark:bg-lime-500/15 dark:text-lime-300", label: "Comment" },
  EVENT_NEW: { icon: CalendarDays, className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300", label: "Event" },
  CHANNEL_POST: { icon: Megaphone, className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", label: "Broadcast" },
  GROUP_ADDED: { icon: Users, className: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300", label: "Group" },
  SYSTEM: { icon: Info, className: "bg-muted text-foreground", label: "System" },
};

export function NotificationsView() {
  const setView = useAppStore((s) => s.setView);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["notifications"], queryFn: () => apiQ<{ notifications: NotificationDTO[]; unread: number }>("/api/notifications") });

  const markAll = async () => {
    const res = await api("/api/notifications", { method: "POST" });
    if (res.ok) qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const open = (n: NotificationDTO) => {
    if (!n.link) return;
    const [name, id] = n.link.split(":");
    if (name === "channel") setView({ name: "channel", id });
    else if (name === "group") setView({ name: "group", id });
    else if (["feed", "events", "settings"].includes(name)) setView({ name: name as never });
  };

  const notifications = data?.notifications ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">Notifications 🔔</h1>
        {data && data.unread > 0 && (
          <span className="rounded-full bg-lemon px-2.5 py-0.5 text-xs font-bold text-ink">{data.unread} new</span>
        )}
        <Button variant="ghost" onClick={markAll} className="ml-auto gap-1.5 rounded-2xl text-xs font-bold" disabled={isLoading}>
          <CheckCheck className="h-4 w-4" /> Mark all read
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : notifications.length === 0 ? (
        <EmptyState emoji="🔕" title="All quiet" description="When people react, comment or broadcast, you'll hear about it here." />
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.SYSTEM;
            const Icon = meta.icon;
            return (
              <motion.button
                key={n.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => open(n)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all hover:shadow-md",
                  n.read ? "bg-card/60 border-border/50" : "border-lemon/40 bg-lemon/[0.06]"
                )}
              >
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", meta.className)}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold leading-tight">{n.title}</span>
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-lemon" />}
                  </span>
                  {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>}
                </span>
                <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">{timeAgo(n.createdAt)}</span>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
