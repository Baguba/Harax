"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { api, apiQ, formatEventDate } from "@/lib/client-api";
import type { EventDTO } from "@/lib/types";
import { useAppStore } from "@/store/app-store";
import { UserAvatar } from "@/components/common/user-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { ConfettiBurst } from "@/components/common/confetti";
import { AuroraField } from "@/components/canvas/aurora-field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarDays, MapPin, Clock, Users, Plus, Loader2, Check, Star, PartyPopper, X } from "lucide-react";
import { CATEGORY_META, EVENT_CATEGORIES } from "@/lib/validation-constants";
import { cn } from "@/lib/utils";

export function EventsView() {
  const user = useAppStore((s) => s.user);
  const qc = useQueryClient();
  const [category, setCategory] = useState<string>("ALL");
  const [timeframe, setTimeframe] = useState<"upcoming" | "past">("upcoming");
  const [detail, setDetail] = useState<EventDTO | null>(null);
  const [confetti, setConfetti] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["events", category, timeframe],
    queryFn: () => apiQ<{ events: EventDTO[] }>(`/api/events?category=${category}&timeframe=${timeframe}`),
  });

  const events = data?.events ?? [];
  const sortedByDate = useMemo(() => events, [events]);

  const rsvp = async (event: EventDTO, status: "GOING" | "INTERESTED" | "NONE") => {
    if (!user) return toast.info("Sign in to RSVP ⚡");
    const res = await api<{ myRsvp: string; going: number; interested: number }>(`/api/events/${event.id}/rsvp`, {
      body: { status },
    });
    if (!res.ok) return toast.error(res.error);
    if (res.data.myRsvp === "GOING") {
      setConfetti((c) => c + 1);
      toast.success("You're in! 🎉", { description: `See you at ${event.title}` });
    }
    qc.invalidateQueries({ queryKey: ["events"] });
    if (detail?.id === event.id) setDetail({ ...detail, myRsvp: res.data.myRsvp as EventDTO["myRsvp"], stats: { ...detail.stats, going: res.data.going, interested: res.data.interested, total: res.data.going + res.data.interested } });
  };

  return (
    <div className="relative">
      <ConfettiBurst trigger={confetti} />

      {/* header */}
      <div className="relative mb-5 overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-lime-100/70 via-card to-card dark:from-lime-400/10">
        <AuroraField density={30} blobs={2} interactive={false} />
        <div className="relative flex flex-wrap items-center gap-3 p-5">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight">Campus events 📅</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Welcome nights, hackathons, football finals — all in one place.</p>
          </div>
          <Button
            onClick={() => (user ? setCreateOpen(true) : toast.info("Sign in to create events ⚡"))}
            className="ml-auto h-10 rounded-2xl font-display font-bold shadow-[0_6px_18px_rgba(163,230,53,0.35)]"
          >
            <Plus className="h-4 w-4" /> Create event
          </Button>
        </div>
      </div>

      {/* filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {["ALL", ...EVENT_CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all",
                category === c
                  ? "border-lemon bg-lemon/20 text-lime-800 dark:text-lime-300"
                  : "text-muted-foreground hover:border-lemon/50 hover:text-foreground"
              )}
            >
              {c === "ALL" ? "✨ All" : `${CATEGORY_META[c]?.emoji ?? ""} ${c.slice(0, 1)}${c.slice(1).toLowerCase()}`}
            </button>
          ))}
        </div>
        <div className="ml-auto flex rounded-full border p-0.5">
          {(["upcoming", "past"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors",
                timeframe === tf ? "bg-muted text-foreground" : "text-muted-foreground"
              )}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* list */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          emoji="🗓"
          title={`No ${timeframe} events here`}
          description={timeframe === "upcoming" ? "Nothing scheduled yet — create the first one and get the campus moving." : "The past events archive is empty."}
          action={<Button onClick={() => setCreateOpen(true)} className="rounded-2xl"><Plus className="h-4 w-4" /> Create event</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sortedByDate.map((e) => {
            const d = formatEventDate(e.startsAt);
            const cat = CATEGORY_META[e.category];
            const soon = new Date(e.startsAt).getTime() - Date.now() < 3 * 86400_000;
            return (
              <motion.button
                key={e.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setDetail(e)}
                className={cn(
                  "card-lift group relative overflow-hidden rounded-3xl border bg-card text-left",
                  e.myRsvp === "GOING" && "border-lemon/60"
                )}
              >
                {/* cover */}
                <div className="relative h-36 overflow-hidden">
                  {e.coverUrl ? (
                    <img src={e.coverUrl} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-lime-300 to-forest" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
                  <div className="absolute left-3 top-3 flex items-center gap-2">
                    <span className={cn("rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide backdrop-blur", cat?.className)}>
                      {cat?.emoji} {e.category}
                    </span>
                    {soon && (
                      <span className="rounded-full bg-lemon px-2.5 py-1 text-[9px] font-bold text-ink">SOON</span>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3 flex items-center gap-2.5 text-white">
                    <div className="rounded-xl bg-lemon px-2.5 py-1 text-center text-ink">
                      <p className="font-display text-sm font-bold leading-none">{d.day}</p>
                      <p className="text-[7px] font-bold tracking-widest">{d.month}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1 text-[10px] opacity-90"><Clock className="h-3 w-3" /> {d.time}</p>
                      <p className="flex items-center gap-1 text-[10px] opacity-90"><MapPin className="h-3 w-3" /> {e.location}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-display text-base font-bold leading-snug">{e.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{e.description}</p>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex -space-x-1.5">
                      {e.attendees.slice(0, 4).map((a) => (
                        <UserAvatar key={a.id} user={a} size="sm" className="ring-2 ring-card" />
                      ))}
                      {e.stats.going > 4 && (
                        <span className="inline-flex h-7 items-center rounded-full bg-muted px-2 text-[9px] font-bold ring-2 ring-card">
                          +{e.stats.going - 4}
                        </span>
                      )}
                    </div>
                    {e.myRsvp ? (
                      <Badge className={cn("gap-1 rounded-full font-bold", e.myRsvp === "GOING" ? "bg-lemon text-ink" : "bg-muted text-foreground")}>
                        <Check className="h-3 w-3" /> {e.myRsvp === "GOING" ? "GOING" : "INTERESTED"}
                      </Badge>
                    ) : (
                      <span className="text-[10px] font-bold text-lime-700 dark:text-lime-400">RSVP →</span>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* detail dialog */}
      <EventDetailDialog event={detail} onClose={() => setDetail(null)} onRsvp={rsvp} />
      <CreateEventDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function EventDetailDialog({
  event,
  onClose,
  onRsvp,
}: {
  event: EventDTO | null;
  onClose: () => void;
  onRsvp: (e: EventDTO, s: "GOING" | "INTERESTED" | "NONE") => void;
}) {
  if (!event) return null;
  const d = formatEventDate(event.startsAt);
  const cat = CATEGORY_META[event.category];

  return (
    <Dialog open={!!event} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto rounded-3xl p-0 sm:max-w-[560px] nice-scrollbar" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{event.title}</DialogTitle>
        <div className="relative h-44 overflow-hidden">
          {event.coverUrl ? (
            <img src={event.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-lime-300 to-forest" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 to-ink/10" />
          <button onClick={onClose} className="absolute right-3 top-3 rounded-full bg-ink/50 p-2 text-white backdrop-blur transition hover:bg-ink" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
          <div className="absolute inset-x-5 bottom-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase", cat?.className)}>{cat?.emoji} {event.category}</span>
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">{d.full} · {d.time}</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold text-white">{event.title}</h2>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2.5 rounded-2xl border border-border/60 bg-muted/30 p-3">
              <MapPin className="h-5 w-5 shrink-0 text-lime-600" />
              <div><p className="text-[10px] font-bold uppercase text-muted-foreground">Location</p><p className="font-semibold">{event.location}</p></div>
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl border border-border/60 bg-muted/30 p-3">
              <Users className="h-5 w-5 shrink-0 text-lime-600" />
              <div><p className="text-[10px] font-bold uppercase text-muted-foreground">Attendance</p><p className="font-semibold">{event.stats.going} going · {event.stats.interested} interested</p></div>
            </div>
          </div>

          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{event.description}</p>

          <div className="flex items-center gap-3 rounded-2xl border border-border/60 p-3">
            <UserAvatar user={event.organizer} size="lg" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Organized by</p>
              <p className="truncate font-semibold">{event.organizer.name}</p>
            </div>
            <PartyPopper className="ml-auto h-6 w-6 text-lemon" />
          </div>

          <div className="flex gap-2.5">
            <Button
              onClick={() => onRsvp(event, event.myRsvp === "GOING" ? "NONE" : "GOING")}
              className={cn("h-12 flex-1 rounded-2xl font-display font-bold", event.myRsvp === "GOING" && "bg-ink text-lemon")}
            >
              <Check className="h-5 w-5" /> {event.myRsvp === "GOING" ? "You're going ✓" : "I'm going"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onRsvp(event, event.myRsvp === "INTERESTED" ? "NONE" : "INTERESTED")}
              className="h-12 rounded-2xl font-semibold"
            >
              <Star className="h-5 w-5" /> Interested
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateEventDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<string>("CAMPUS");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!title.trim() || !description.trim() || !location.trim() || !date) {
      return toast.error("Fill in title, description, location and date.");
    }
    setLoading(true);
    const res = await api<{ event: { id: string } }>("/api/events", {
      body: {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        category,
        startsAt: new Date(`${date}T${time}:00`).toISOString(),
      },
    });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    qc.invalidateQueries({ queryKey: ["events"] });
    onOpenChange(false);
    setTitle(""); setDescription(""); setLocation(""); setDate("");
    toast.success("Event published! 🎉", { description: "The campus can now RSVP." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto rounded-3xl nice-scrollbar sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold">Create an event 🎉</DialogTitle>
          <DialogDescription>Open to the whole Harax community. Keep it campus-appropriate.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Event title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. CS Department Movie Night" className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's happening? Who should come? What to bring?" className="min-h-[90px] rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Main Amphitheatre" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_META[c]?.emoji} {c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Date</Label>
              <Input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Start time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <Button onClick={submit} disabled={loading} className="h-12 w-full rounded-2xl font-display font-bold shadow-[0_8px_24px_rgba(163,230,53,0.35)]">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CalendarDays className="h-5 w-5" />} Publish event
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
