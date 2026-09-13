"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api, apiQ, timeAgo } from "@/lib/client-api";
import type { ProfileDTO } from "@/lib/types";
import { useAppStore } from "@/store/app-store";
import { UserAvatar } from "@/components/common/user-avatar";
import { RoleBadge, VerifiedBadge } from "@/components/common/role-badge";
import { PostCard } from "@/components/feed/post-card";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Loader2, CalendarDays, Users, Megaphone, MapPin, AtSign, Newspaper } from "lucide-react";
import { DEPARTMENTS, YEARS } from "@/lib/validation-constants";

/* solid cover colors — flat, no gradients */
const COVERS = ["#a3e635", "#4d7c0f", "#14290f", "#d9f99d", "#65a30d"];

export function ProfileView({ userId }: { userId: string }) {
  const me = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => apiQ<{ user: ProfileDTO }>(`/api/users/${userId}`),
  });
  const profile = data?.user;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-52 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (!profile) {
    return <EmptyState emoji="🔍" title="Profile not found" />;
  }

  const stats = [
    { label: "Posts", value: profile.stats.posts },
    { label: "Reactions", value: profile.stats.reactionsReceived },
    { label: "Comments", value: profile.stats.comments },
    { label: "Groups", value: profile.stats.groups },
  ];

  return (
    <div className="space-y-4">
      {/* header card */}
      <div className="overflow-hidden rounded-3xl border bg-card">
        <div className="relative h-36 sm:h-44" style={{ background: profile.coverUrl ?? COVERS[0] }}>
          {profile.isMe && (
            <Button
              onClick={() => setEditOpen(true)}
              size="sm"
              className="absolute right-3 top-3 gap-1.5 rounded-2xl glass font-semibold"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit profile
            </Button>
          )}
        </div>
        <div className="relative px-5 pb-5">
          <div className="-mt-12 flex items-end gap-4">
            <UserAvatar user={profile} size="xxl" className="ring-4 ring-card" />
            <div className="mb-1 min-w-0 flex-1">
              <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-bold leading-tight">
                {profile.name}
                {profile.verified && <VerifiedBadge className="h-5 w-5" />}
                <RoleBadge role={profile.role} />
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {profile.department && (
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile.department}{profile.year ? ` · ${profile.year}` : ""}</span>
                )}
                <span className="inline-flex items-center gap-1"><AtSign className="h-3 w-3" /> {profile.email}</span>
                <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> joined {timeAgo(profile.createdAt)} ago</span>
              </p>
            </div>
          </div>
          {profile.bio && <p className="mt-3 text-sm leading-relaxed text-foreground/90">{profile.bio}</p>}

          {/* stat strip */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-border/60 bg-muted/30 p-2.5 text-center">
                <p className="font-display text-lg font-bold text-lime-700 dark:text-lime-400">{s.value}</p>
                <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* groups + channels */}
      {(profile.groups.length > 0 || profile.channels.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {profile.groups.length > 0 && (
            <section className="rounded-3xl border bg-card p-4">
              <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold"><Users className="h-4 w-4 text-lime-600" /> Groups</h3>
              <div className="space-y-1">
                {profile.groups.slice(0, 5).map((g) => (
                  <button key={g.id} onClick={() => setView({ name: "group", id: g.id })} className="flex w-full items-center gap-2.5 rounded-2xl px-2 py-1.5 text-left transition-colors hover:bg-muted">
                    <span className="text-lg">{g.emoji}</span>
                    <span className="truncate text-xs font-bold">{g.name}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
          {profile.channels.length > 0 && (
            <section className="rounded-3xl border bg-card p-4">
              <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold"><Megaphone className="h-4 w-4 text-lime-600" /> Runs channels</h3>
              <div className="space-y-1">
                {profile.channels.slice(0, 5).map((c) => (
                  <button key={c.id} onClick={() => setView({ name: "channel", id: c.id })} className="flex w-full items-center gap-2.5 rounded-2xl px-2 py-1.5 text-left transition-colors hover:bg-muted">
                    <UserAvatar user={{ name: c.name, avatarUrl: c.avatarUrl }} size="sm" />
                    <span className="truncate text-xs font-bold">{c.name}</span>
                    {c.official && <span className="rounded bg-lemon/25 px-1 text-[8px] font-bold text-lime-800 dark:text-lime-300">✓</span>}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* upcoming events */}
      {profile.upcomingEvents.length > 0 && (
        <section className="rounded-3xl border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold"><CalendarDays className="h-4 w-4 text-lime-600" /> Going next</h3>
          <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
            {profile.upcomingEvents.map((e) => (
              <button
                key={e.id}
                onClick={() => setView({ name: "events" })}
                className="card-lift flex w-44 shrink-0 flex-col gap-2 rounded-2xl border bg-card p-3 text-left"
              >
                {e.coverUrl && (
                  <img src={e.coverUrl} alt="" className="h-16 w-full rounded-xl object-cover" loading="lazy" />
                )}
                <p className="line-clamp-2 text-xs font-bold leading-snug">{e.title}</p>
                <p className="text-[10px] font-semibold text-lime-700 dark:text-lime-400">
                  {new Date(e.startsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {e.status === "GOING" ? "going" : "interested"}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* posts */}
      <section aria-label="User posts">
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold">
          <Newspaper className="h-4 w-4 text-lime-600" /> {profile.isMe ? "Your posts" : "Latest posts"}
        </h3>
        {profile.posts.length === 0 ? (
          <EmptyState
            emoji="🌱"
            title={profile.isMe ? "You haven't posted yet" : `${profile.name.split(" ")[0]} hasn't posted yet`}
            description={profile.isMe ? "Your first campus moment is waiting to be shared." : undefined}
          />
        ) : (
          <div className="space-y-4">
            {profile.posts.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        )}
      </section>

      {profile.isMe && me && <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} profile={profile} />}
    </div>
  );
}

function EditProfileDialog({ open, onOpenChange, profile }: { open: boolean; onOpenChange: (v: boolean) => void; profile: ProfileDTO }) {
  const qc = useQueryClient();
  const { user, setUser } = useAppStore();
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [department, setDepartment] = useState(profile.department ?? "");
  const [year, setYear] = useState(profile.year ?? "");
  const [cover, setCover] = useState(profile.coverUrl ?? COVERS[0]);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (name.trim().length < 2) return toast.error("Name must be at least 2 characters.");
    setLoading(true);
    const res = await api("/api/users/me", {
      method: "PATCH",
      body: { name: name.trim(), bio: bio.trim() || null, department: department || null, year: year || null, coverUrl: cover },
    });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    qc.invalidateQueries({ queryKey: ["profile", profile.id] });
    if (user) setUser({ ...user, name: name.trim(), bio: bio.trim() || null, department: department || null, year: year || null, coverUrl: cover });
    onOpenChange(false);
    toast.success("Profile updated ✨");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto rounded-3xl nice-scrollbar sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold">Edit profile ✨</DialogTitle>
          <DialogDescription>This is how the campus sees you.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Display name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" maxLength={60} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-[70px] rounded-xl" maxLength={300} placeholder="e.g. CS 3rd year · will debug your code for injera" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent className="max-h-60 nice-scrollbar">
                  {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Cover style</Label>
            <div className="flex gap-2">
              {COVERS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCover(c)}
                  className={`h-12 flex-1 rounded-2xl border-2 transition-all ${cover === c ? "border-lemon scale-105" : "border-transparent"}`}
                  style={{ background: c }}
                  aria-label="Choose cover"
                />
              ))}
            </div>
          </div>
          <Button onClick={submit} disabled={loading} className="h-12 w-full rounded-2xl font-display font-bold shadow-[0_8px_24px_rgba(163,230,53,0.35)]">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
