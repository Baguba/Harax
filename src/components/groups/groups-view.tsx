"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api, apiQ } from "@/lib/client-api";
import type { GroupDTO } from "@/lib/types";
import { useAppStore } from "@/store/app-store";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users, Plus, Loader2, Lock, Globe, MessagesSquare, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const EMOJI_CHOICES = ["💬", "🔥", "📚", "⚽", "🩺", "🛏️", "🎤", "🌱", "💻", "🪩", "♟", "📷", "🎮", "☕"];

export function GroupsView() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["groups"], queryFn: () => apiQ<{ groups: GroupDTO[] }>("/api/groups") });
  const mine = useQuery({ queryKey: ["groups-mine"], queryFn: () => apiQ<{ groups: GroupDTO[] }>("/api/groups?mine=1") });

  const allGroups = data?.groups ?? [];
  const myGroups = mine.data?.groups ?? [];
  const source = tab === "mine" ? myGroups : allGroups;
  const filtered = q.trim() ? source.filter((g) => g.name.toLowerCase().includes(q.toLowerCase())) : source;

  const join = async (g: GroupDTO) => {
    if (!user) return toast.info("Sign in to join groups");
    const res = await api(`/api/groups/${g.id}/members`, { body: {} });
    if (!res.ok) return toast.error(res.error);
    setToast(`${g.emoji} Joined ${g.name}!`);
    // navigate to group
    setView({ name: "group", id: g.id });
  };

  const setToast = (msg: string) => toast.success(msg);

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card">
        <div className="relative flex flex-wrap items-center gap-3 p-5">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Groups 💬</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Class squads, study circles, clubs — Telegram-style group chat on campus.</p>
          </div>
          <Button
            onClick={() => (user ? setCreateOpen(true) : toast.info("Sign in to create groups"))}
            className="ml-auto h-10 rounded-2xl font-display font-bold shadow-[0_6px_18px_rgba(163,230,53,0.35)]"
          >
            <Plus className="h-4 w-4" /> Create group
          </Button>
        </div>
      </div>

      {/* tabs + search */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-2xl border p-0.5">
          {(["all", "mine"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-xl px-4 py-1.5 text-xs font-bold transition-colors",
                tab === t ? "bg-lemon/20 text-lime-800 dark:text-lime-300" : "text-muted-foreground"
              )}
            >
              {t === "all" ? "Discover" : `My groups${myGroups.length ? ` (${myGroups.length})` : ""}`}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search groups…" className="h-9 rounded-2xl pl-9 text-xs" />
        </div>
      </div>

      {/* grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-3xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          emoji="👥"
          title={tab === "mine" ? "You haven't joined a group yet" : "No groups found"}
          description={tab === "mine" ? "Your class squad, study circle or fan club is waiting for you." : "Try a different search — or create the group yourself."}
          action={<Button onClick={() => setCreateOpen(true)} className="rounded-2xl"><Plus className="h-4 w-4" /> Create group</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card-lift group flex flex-col rounded-3xl border bg-card p-5"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary text-3xl transition-transform group-hover:rotate-6 group-hover:scale-110">
                  {g.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-center gap-1.5 truncate font-display text-base font-bold">
                    {g.name}
                    {!g.isPublic && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </h3>
                  <p className="line-clamp-2 mt-0.5 text-xs leading-relaxed text-muted-foreground">{g.description ?? "Campus group"}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-semibold">
                  <Users className="h-3.5 w-3.5 text-lime-600" /> {g.memberCount} members
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessagesSquare className="h-3.5 w-3.5" /> {g.postCount} posts
                </span>
                <span className="ml-auto inline-flex items-center gap-1">
                  <Globe className="h-3 w-3" /> {g.isPublic ? "public" : "private"}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() => setView({ name: "group", id: g.id })}
                  variant={g.isMember ? "outline" : "default"}
                  className="h-9 flex-1 rounded-2xl text-xs font-bold"
                >
                  {g.isMember ? "Open group" : "Join & open"}
                </Button>
                {!g.isMember && (
                  <Button onClick={() => join(g)} variant="outline" className="h-9 rounded-2xl px-3 text-xs font-bold">
                    Quick join
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

export function CreateGroupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const setView = useAppStore((s) => s.setView);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("💬");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (name.trim().length < 3) return toast.error("Group name needs at least 3 characters.");
    setLoading(true);
    const res = await api<{ group: { id: string; name: string; emoji: string } }>("/api/groups", {
      body: { name: name.trim(), description: description.trim() || undefined, emoji, isPublic },
    });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    qc.invalidateQueries({ queryKey: ["groups"] });
    qc.invalidateQueries({ queryKey: ["groups-mine"] });
    onOpenChange(false);
    setName(""); setDescription("");
    toast.success(`${res.data.group.emoji} ${res.data.group.name} is live!`);
    setView({ name: "group", id: res.data.group.id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold">Create a group 💬</DialogTitle>
          <DialogDescription>
            Anyone signed in can create a group. You become its admin and can add students by email.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Group name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CS 4th Year Squad" className="rounded-xl" maxLength={60} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this group about?" className="min-h-[70px] rounded-xl" maxLength={500} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Group emoji</Label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={cn(
                    "rounded-xl border px-2.5 py-1.5 text-xl transition-all hover:scale-110",
                    emoji === e && "border-lemon bg-lemon/20 scale-110"
                  )}
                  aria-label={`Emoji ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 p-3.5">
            <div>
              <p className="text-xs font-bold">Public group</p>
              <p className="text-[10px] text-muted-foreground">Anyone at Haramaya can discover & join</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} aria-label="Toggle public group" />
          </div>
          <Button onClick={submit} disabled={loading} className="h-12 w-full rounded-2xl font-display font-bold shadow-[0_8px_24px_rgba(163,230,53,0.35)]">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />} Create group
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
