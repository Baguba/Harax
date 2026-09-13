"use client";

import { useQuery } from "@tanstack/react-query";
import { apiQ, timeAgo, formatEventDate } from "@/lib/client-api";
import type { EventDTO, GroupDTO, ChannelDTO, SideRoomDTO } from "@/lib/types";
import { useAppStore } from "@/store/app-store";
import { UserAvatar } from "@/components/common/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, CalendarDays, Users, Megaphone, Ghost, Flame, ChevronRight } from "lucide-react";
import { CATEGORY_META } from "@/lib/validation-constants";

export function RightRail() {
  const setView = useAppStore((s) => s.setView);
  const { data: events } = useQuery({
    queryKey: ["rail-events"],
    queryFn: () => apiQ<{ events: EventDTO[] }>("/api/events?timeframe=upcoming"),
  });
  const { data: groups } = useQuery({
    queryKey: ["rail-groups"],
    queryFn: () => apiQ<{ groups: GroupDTO[] }>("/api/groups"),
  });
  const { data: channels } = useQuery({
    queryKey: ["rail-channels"],
    queryFn: () => apiQ<{ channels: ChannelDTO[] }>("/api/channels"),
  });
  const { data: rooms } = useQuery({
    queryKey: ["rail-rooms"],
    queryFn: () => apiQ<{ rooms: SideRoomDTO[] }>("/api/sidechat"),
  });

  const upcoming = (events?.events ?? []).slice(0, 3);
  const suggestedGroups = (groups?.groups ?? []).filter((g) => !g.isMember).slice(0, 3);
  const officialChannels = (channels?.channels ?? []).filter((c) => c.official).slice(0, 3);
  const hotRooms = (rooms?.rooms ?? []).filter((r) => r.lastHourActive).slice(0, 2);

  return (
    <div className="space-y-4">
      {/* Campus pulse */}
      <RailCard title="Campus pulse" icon={Flame}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest via-ink to-ink p-4 text-lemon-soft">
          <div className="grain absolute inset-0" />
          <p className="relative font-display text-3xl font-bold text-lemon-gradient">⚡ Active</p>
          <p className="relative mt-1 text-[11px] leading-relaxed text-lemon-soft/70">
            {hotRooms.length > 0
              ? `${hotRooms.map((r) => r.name).join(" & ")} are popping right now`
              : "Sidechat rooms are warming up — be the first spark"}
          </p>
          <button
            onClick={() => setView({ name: "sidechat" })}
            className="relative mt-3 inline-flex items-center gap-1 rounded-full bg-lemon px-3.5 py-1.5 text-[11px] font-bold text-ink transition-transform hover:scale-105"
          >
            <Ghost className="h-3.5 w-3.5" /> Enter sidechat
          </button>
        </div>
      </RailCard>

      {/* Upcoming events */}
      <RailCard title="Upcoming events" icon={CalendarDays} action={{ label: "All events", onClick: () => setView({ name: "events" }) }}>
        <div className="space-y-2.5">
          {upcoming.length === 0 && <Skeleton className="h-16 w-full rounded-2xl" />}
          {upcoming.map((e) => {
            const d = formatEventDate(e.startsAt);
            return (
              <button
                key={e.id}
                onClick={() => setView({ name: "events" })}
                className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 text-left transition-all hover:border-lemon/50 hover:shadow-md"
              >
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-lemon/20 font-display font-bold text-lime-800 dark:text-lime-300">
                  <span className="text-sm leading-none">{d.day}</span>
                  <span className="text-[8px] tracking-widest">{d.month}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{e.title}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{e.location} · {d.time}</p>
                  <p className="mt-1 text-[10px] font-semibold text-lime-700 dark:text-lime-400">{e.stats.going} going</p>
                </div>
              </button>
            );
          })}
        </div>
      </RailCard>

      {/* Suggested groups */}
      {suggestedGroups.length > 0 && (
        <RailCard title="Groups for you" icon={Users} action={{ label: "Browse", onClick: () => setView({ name: "groups" }) }}>
          <div className="space-y-2">
            {suggestedGroups.map((g) => (
              <button
                key={g.id}
                onClick={() => setView({ name: "group", id: g.id })}
                className="flex w-full items-center gap-2.5 rounded-2xl border border-border/60 bg-card p-3 text-left transition-all hover:border-lemon/50 hover:shadow-md"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-lg">{g.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{g.name}</p>
                  <p className="text-[10px] text-muted-foreground">{g.memberCount} members</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </RailCard>
      )}

      {/* Official channels */}
      <RailCard title="Official channels" icon={Megaphone} action={{ label: "All", onClick: () => setView({ name: "channels" }) }}>
        <div className="space-y-2">
          {officialChannels.map((c) => (
            <button
              key={c.id}
              onClick={() => setView({ name: "channel", id: c.id })}
              className="flex w-full items-center gap-2.5 rounded-2xl border border-border/60 bg-card p-3 text-left transition-all hover:border-lemon/50 hover:shadow-md"
            >
              <UserAvatar user={{ name: c.name, avatarUrl: c.avatarUrl }} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate text-xs font-bold">
                  {c.name}
                  <span className="rounded bg-lemon/25 px-1 text-[8px] font-bold text-lime-800 dark:text-lime-300">✓</span>
                </p>
                <p className="text-[10px] text-muted-foreground">{c.subscriberCount} subscribers</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </RailCard>

      <p className="px-2 pt-2 text-center text-[10px] leading-relaxed text-muted-foreground">
        Harax · Haramaya University community
        <br />
        Made with ⚡ and lemon green
      </p>
    </div>
  );
}

function RailCard({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: React.ElementType;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border/60 bg-card/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-lime-600 dark:text-lime-400" />
        <h3 className="font-display text-sm font-bold">{title}</h3>
        {action && (
          <button onClick={action.onClick} className="ml-auto text-[10px] font-bold text-lime-700 hover:underline dark:text-lime-400">
            {action.label} →
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

export { TrendingUp };
