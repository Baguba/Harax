"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiQ, uploadFile, timeAgo } from "@/lib/client-api";
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
import { Pencil, Loader2, CalendarDays, Users, Megaphone, MapPin, AtSign, Newspaper, Camera, ImagePlus, X } from "lucide-react";
import { DEPARTMENTS, YEARS } from "@/lib/validation-constants";

/* solid cover colors — flat, no gradients */
const COVERS = ["#a3e635", "#4d7c0f", "#14290f", "#d9f99d", "#65a30d"];
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const LIMITS = { avatar: 5 * 1024 * 1024, cover: 8 * 1024 * 1024 };

/** true when the value points at an actual image (uploaded banner/photo), not a flat color. */
function isImageRef(u?: string | null): u is string {
  return !!u && (u.startsWith("/uploads/") || u.startsWith("http"));
}

/** fire-and-forget cleanup of an uploaded file we no longer reference. */
function forgetFile(url?: string | null) {
  if (url && url.startsWith("/uploads/")) {
    void api(`/api/upload?url=${encodeURIComponent(url)}`, { method: "DELETE" });
  }
}

/** upload an avatar/banner image, returning its url (or null after toasting the error). */
async function uploadProfileImage(file: File | undefined, purpose: "avatar" | "cover"): Promise<string | null> {
  if (!file) return null;
  if (file.size > LIMITS[purpose]) {
    toast.error(`That image is too big — the limit is ${Math.round(LIMITS[purpose] / 1024 / 1024)} MB.`);
    return null;
  }
  const up = await uploadFile(file, purpose);
  if (!up.ok) {
    toast.error(up.error);
    return null;
  }
  return up.url;
}

export function ProfileView({ userId }: { userId: string }) {
  const me = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const setView = useAppStore((s) => s.setView);
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState<"avatar" | "banner" | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

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

  /** header flow: upload + save immediately, like big social apps do. */
  const applyPhoto = async (file: File | undefined, purpose: "avatar" | "banner") => {
    if (!file || !me) return;
    const field = purpose === "avatar" ? "avatarUrl" : "coverUrl";
    setPhotoBusy(purpose);
    const url = await uploadProfileImage(file, purpose === "avatar" ? "avatar" : "cover");
    if (url) {
      const prev = (purpose === "avatar" ? profile.avatarUrl : profile.coverUrl) ?? null;
      const res = await api("/api/users/me", { method: "PATCH", body: { [field]: url } });
      if (res.ok) {
        forgetFile(prev);
        qc.invalidateQueries({ queryKey: ["profile", userId] });
        setUser({ ...me, [field]: url });
        toast.success(purpose === "avatar" ? "Looking sharp — photo updated." : "Banner updated.");
      } else {
        toast.error(res.error);
        forgetFile(url);
      }
    }
    setPhotoBusy(null);
  };

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
        <div className="relative h-36 bg-muted sm:h-44">
          {isImageRef(profile.coverUrl) ? (
            <img src={profile.coverUrl} alt="Profile banner" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: profile.coverUrl ?? COVERS[0] }} />
          )}
          {profile.isMe && (
            <Button
              onClick={() => setEditOpen(true)}
              size="sm"
              className="absolute right-3 top-3 gap-1.5 rounded-2xl glass font-semibold"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit profile
            </Button>
          )}
          {profile.isMe && (
            <button
              type="button"
              onClick={() => bannerInput.current?.click()}
              disabled={photoBusy === "banner"}
              aria-label={isImageRef(profile.coverUrl) ? "Change banner photo" : "Add a banner photo"}
              className="absolute bottom-3 right-3 inline-flex h-9 items-center gap-1.5 rounded-full glass px-3 text-xs font-bold shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
            >
              {photoBusy === "banner" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" aria-hidden />
              )}
              <span className="hidden sm:inline">
                {photoBusy === "banner" ? "Uploading…" : isImageRef(profile.coverUrl) ? "Change banner" : "Add banner photo"}
              </span>
            </button>
          )}
        </div>
        <div className="relative px-5 pb-5">
          <div className="-mt-12 flex items-end gap-4">
            <div className="relative w-fit">
              <UserAvatar user={profile} size="xxl" className="ring-4 ring-card" />
              {profile.isMe && (
                <button
                  type="button"
                  onClick={() => avatarInput.current?.click()}
                  disabled={photoBusy === "avatar"}
                  aria-label="Change profile photo"
                  className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-card bg-primary text-primary-foreground shadow-md transition-transform hover:scale-110 active:scale-95 disabled:opacity-60"
                >
                  {photoBusy === "avatar" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" aria-hidden />
                  )}
                </button>
              )}
            </div>
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

      {/* hidden pickers for the header quick-actions */}
      <input
        ref={avatarInput}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          void applyPhoto(e.target.files?.[0], "avatar");
          e.target.value = "";
        }}
      />
      <input
        ref={bannerInput}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          void applyPhoto(e.target.files?.[0], "banner");
          e.target.value = "";
        }}
      />

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

      {profile.isMe && me && (
        <EditProfileDialog
          key={editOpen ? `open-${profile.name}-${profile.avatarUrl ?? "n"}-${profile.coverUrl ?? "n"}` : "closed"}
          open={editOpen}
          onOpenChange={setEditOpen}
          profile={profile}
        />
      )}
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
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [cover, setCover] = useState(profile.coverUrl ?? COVERS[0]);
  const [loading, setLoading] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  /** files uploaded during this dialog session — deleted again if the user cancels. */
  const fresh = useRef<string[]>([]);
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const markFresh = (url: string) => {
    fresh.current.push(url);
  };

  const pickAvatar = async (file?: File) => {
    if (!file) return;
    setAvatarBusy(true);
    const url = await uploadProfileImage(file, "avatar");
    setAvatarBusy(false);
    if (url) {
      markFresh(url);
      setAvatarUrl(url);
    }
  };

  const pickCover = async (file?: File) => {
    if (!file) return;
    setCoverBusy(true);
    const url = await uploadProfileImage(file, "cover");
    setCoverBusy(false);
    if (url) {
      markFresh(url);
      setCover(url);
    }
  };

  const submit = async () => {
    if (name.trim().length < 2) return toast.error("Name must be at least 2 characters.");
    setLoading(true);
    const res = await api("/api/users/me", {
      method: "PATCH",
      body: {
        name: name.trim(),
        bio: bio.trim() || null,
        department: department || null,
        year: year || null,
        avatarUrl,
        coverUrl: cover,
      },
    });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    // clean up uploads we no longer reference: replaced-this-session files AND abandoned originals
    const kept = new Set([avatarUrl, isImageRef(cover) ? cover : null].filter(Boolean) as string[]);
    const originals = [profile.avatarUrl, isImageRef(profile.coverUrl) ? profile.coverUrl : null].filter(Boolean) as string[];
    fresh.current.filter((f) => !kept.has(f)).forEach(forgetFile);
    originals.filter((o) => !kept.has(o)).forEach(forgetFile);
    fresh.current = [];
    qc.invalidateQueries({ queryKey: ["profile", profile.id] });
    if (user) {
      setUser({
        ...user,
        name: name.trim(),
        bio: bio.trim() || null,
        department: department || null,
        year: year || null,
        avatarUrl,
        coverUrl: cover,
      });
    }
    onOpenChange(false);
    toast.success("Profile updated ✨");
  };

  const close = (v: boolean) => {
    if (!v && fresh.current.length > 0) {
      // dialog cancelled — remove uploads that were never saved to the profile
      fresh.current.forEach(forgetFile);
      fresh.current = [];
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92svh] overflow-y-auto rounded-3xl nice-scrollbar sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold">Edit profile ✨</DialogTitle>
          <DialogDescription>This is how the campus sees you.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* profile photo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <UserAvatar user={{ name, avatarUrl }} size="xl" />
              {avatarBusy && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl font-bold"
                onClick={() => avatarInput.current?.click()}
                disabled={avatarBusy}
              >
                <Camera className="h-3.5 w-3.5" /> {avatarUrl ? "Change photo" : "Add photo"}
              </Button>
              {avatarUrl && (
                <button
                  type="button"
                  className="text-left text-[11px] font-bold text-red-600 hover:underline dark:text-red-400"
                  onClick={() => setAvatarUrl(null)}
                >
                  Remove photo
                </button>
              )}
            </div>
            <input
              ref={avatarInput}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                void pickAvatar(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>

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

          {/* banner: photo + flat colors */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Banner</Label>
            <div className="flex gap-2">
              {COVERS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCover(c)}
                  className={`h-12 flex-1 rounded-2xl border-2 transition-all ${cover === c ? "border-lemon scale-105" : "border-transparent"}`}
                  style={{ background: c }}
                  aria-label="Choose cover color"
                />
              ))}
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                disabled={coverBusy}
                aria-label="Upload a banner photo"
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed transition-all ${
                  isImageRef(cover) ? "border-lemon scale-105 bg-muted" : "border-border hover:border-lime-500 hover:bg-muted/50"
                }`}
              >
                {coverBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" aria-hidden />}
              </button>
            </div>
            {isImageRef(cover) && (
              <div className="relative">
                <img src={cover} alt="Banner preview" className="h-20 w-full rounded-2xl border object-cover" />
                <button
                  type="button"
                  onClick={() => setCover(COVERS[0])}
                  aria-label="Remove banner photo"
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-foreground shadow transition-transform hover:scale-110"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <p className="text-[10px] leading-snug text-muted-foreground">
              Pick a flat color or upload a photo (JPG, PNG, WebP, GIF · up to 8 MB).
            </p>
            <input
              ref={coverInput}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                void pickCover(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>

          <Button onClick={submit} disabled={loading} className="h-12 w-full rounded-2xl font-display font-bold shadow-[0_8px_24px_rgba(163,230,53,0.35)]">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
