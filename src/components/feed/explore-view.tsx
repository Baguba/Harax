"use client";

import { useQuery } from "@tanstack/react-query";
import { apiQ, formatEventDate } from "@/lib/client-api";
import type { GroupDTO, ChannelDTO, EventDTO } from "@/lib/types";
import { useAppStore } from "@/store/app-store";
import { UserAvatar } from "@/components/common/user-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { ScrollReveal } from "@/components/common/scroll-reveal";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Compass, Users, Megaphone, CalendarDays, ArrowUpRight, TrendingUp } from "lucide-react";
import { CATEGORY_META } from "@/lib/validation-constants";
import type { SearchResults } from "@/lib/types";

export function ExploreView() {
  const setView = useAppStore((s) => s.setView);

  const { data: groups } = useQuery({ queryKey: ["explore-groups"], queryFn: () => apiQ<{ groups: GroupDTO[] }>("/api/groups") });
  const { data: channels } = useQuery({ queryKey: ["explore-channels"], queryFn: () => apiQ<{ channels: ChannelDTO[] }>("/api/channels") });
  const { data: events } = useQuery({ queryKey: ["explore-events"], queryFn: () => apiQ<{ events: EventDTO[] }>("/api/events?timeframe=upcoming") });
  const { data: people } = useQuery({ queryKey: ["explore-people"], queryFn: () => apiQ<SearchResults>("/api/search?q=a") });

  const activeRooms = (groups?.groups ?? []).filter((g) => g.memberCount > 0).slice(0, 6);
  const official = (channels?.channels ?? []).slice(0, 4);
  const upcoming = (events?.events ?? []).slice(0, 3);
  const topPeople = (people?.users ?? []).slice(0, 8);

  return (
    <div className="space-y-8">
      {/* header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-forest p-6 text-lemon-soft">
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-lemon/30 bg-lemon/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-lime-300">
            <Compass className="h-3 w-3" /> Explore Haramaya
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold">
            Discover every corner
            <br />
            <span className="text-lime-300">of your campus.</span>
          </h1>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-lemon-soft/70">
            Trending groups, official channels, upcoming events and the people who make Haramaya hum.
          </p>
        </div>
      </div>

      {/* upcoming events strip */}
      <section aria-labelledby="explore-events">
        <SectionTitle icon={CalendarDays} title="Happening soon" hint="Next events" onHint={() => setView({ name: "events" })} />
        <div className="grid gap-3 sm:grid-cols-3">
          {upcoming.length === 0 && <Skeleton className="h-36 rounded-3xl" />}
          {upcoming.map((e) => {
            const d = formatEventDate(e.startsAt);
            const cat = CATEGORY_META[e.category];
            return (
              <button
                key={e.id}
                onClick={() => setView({ name: "events" })}
                className="card-lift group relative overflow-hidden rounded-3xl border bg-card p-4 text-left"
              >
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-lemon/10 blur-2xl transition-all group-hover:bg-lemon/25" />
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-secondary p-2.5 text-center text-foreground">
                    <p className="font-display text-lg font-bold leading-none">{d.day}</p>
                    <p className="text-[8px] font-bold tracking-widest">{d.month}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-bold">{e.title}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{d.full}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${cat?.className}`}>{cat?.emoji} {e.category}</span>
                  <span className="text-[10px] font-semibold text-lime-700 dark:text-lime-400">{e.stats.going} going</span>
                  <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* groups */}
      <section aria-labelledby="explore-groups">
        <SectionTitle icon={Users} title="Active groups" hint="All groups" onHint={() => setView({ name: "groups" })} />
        <div className="grid gap-3 sm:grid-cols-2">
          {(groups?.groups ?? []).slice(0, 4).map((g) => (
            <button
              key={g.id}
              onClick={() => setView({ name: "group", id: g.id })}
              className="card-lift flex items-center gap-3 rounded-3xl border bg-card p-4 text-left"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-2xl">{g.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-bold">{g.name}</p>
                <p className="truncate text-xs text-muted-foreground">{g.description ?? "Campus group"}</p>
                <p className="mt-1 text-[10px] font-semibold text-lime-700 dark:text-lime-400">{g.memberCount} members · {g.postCount} posts</p>
              </div>
            </button>
          ))}
          {groups == null && <><Skeleton className="h-20 rounded-3xl" /><Skeleton className="h-20 rounded-3xl" /></>}
        </div>
      </section>

      {/* channels */}
      <section aria-labelledby="explore-channels">
        <SectionTitle icon={Megaphone} title="Official voices" hint="All channels" onHint={() => setView({ name: "channels" })} />
        <div className="grid gap-3 sm:grid-cols-2">
          {official.map((c) => (
            <button
              key={c.id}
              onClick={() => setView({ name: "channel", id: c.id })}
              className="card-lift flex items-center gap-3 rounded-3xl border bg-card p-4 text-left"
            >
              <UserAvatar user={{ name: c.name, avatarUrl: c.avatarUrl }} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate font-display text-sm font-bold">
                  {c.name}
                  {c.official && <Badge className="h-4 rounded bg-lemon px-1.5 text-[8px] font-bold text-ink">VERIFIED</Badge>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{c.description}</p>
                <p className="mt-1 text-[10px] font-semibold text-lime-700 dark:text-lime-400">{c.subscriberCount} subscribers</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* people */}
      <section aria-labelledby="explore-people">
        <SectionTitle icon={TrendingUp} title="Campus creators" hint="" onHint={() => {}} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {topPeople.map((p) => (
            <button
              key={p.id}
              onClick={() => setView({ name: "profile", id: p.id })}
              className="card-lift flex flex-col items-center gap-2 rounded-3xl border bg-card p-4 text-center"
            >
              <UserAvatar user={p} size="xl" />
              <p className="w-full truncate text-xs font-bold">{p.name}</p>
              <p className="w-full truncate text-[10px] text-muted-foreground">{p.department ?? p.role}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, hint, onHint }: { icon: React.ElementType; title: string; hint: string; onHint: () => void }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4 text-lime-600 dark:text-lime-400" />
      <h2 id="explore-title" className="font-display text-lg font-bold">{title}</h2>
      {hint && (
        <button onClick={onHint} className="ml-auto text-[10px] font-bold text-lime-700 hover:underline dark:text-lime-400">
          {hint} →
        </button>
      )}
    </div>
  );
}
