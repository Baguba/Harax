"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api, apiQ } from "@/lib/client-api";
import type { ChannelDTO } from "@/lib/types";
import { useAppStore } from "@/store/app-store";
import { UserAvatar } from "@/components/common/user-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Megaphone, Plus, Loader2, Bell, BellRing, Check, Radio } from "lucide-react";
import { hasMinRole } from "@/lib/role-utils";
import { cn } from "@/lib/utils";

export function ChannelsView() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["channels"], queryFn: () => apiQ<{ channels: ChannelDTO[] }>("/api/channels") });
  const channels = data?.channels ?? [];

  const toggleSub = async (c: ChannelDTO) => {
    if (!user) return toast.info("Sign in to subscribe");
    const res = await api<{ subscribed: boolean; subscriberCount: number }>(`/api/channels/${c.id}/subscribe`, { body: {} });
    if (!res.ok) return toast.error(res.error);
    qc.invalidateQueries({ queryKey: ["channels"] });
    toast.success(res.data.subscribed ? `Subscribed to ${c.name} 🔔` : `Unsubscribed from ${c.name}`);
  };

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-forest p-6 text-lemon-soft">
        <div className="relative flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-lemon/30 bg-lemon/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-lime-300">
              <Radio className="h-3 w-3" /> Broadcast channels
            </div>
            <h1 className="mt-2 font-display text-2xl font-bold text-white">Official voices of Haramaya</h1>
            <p className="mt-1 max-w-md text-xs text-lemon-soft/70">
              Registrar announcements, union news and department channels — one-to-many broadcasts that matter.
            </p>
          </div>
          {user && hasMinRole(user.role, "LECTURER") && (
            <Button onClick={() => setCreateOpen(true)} className="ml-auto h-10 rounded-2xl bg-lemon font-display font-bold text-ink hover:bg-lime-300">
              <Plus className="h-4 w-4" /> New channel
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-3xl" />)}</div>
      ) : channels.length === 0 ? (
        <EmptyState emoji="📡" title="No channels yet" description="Official channels will appear here." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {channels.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "card-lift rounded-3xl border bg-card p-5",
                c.official && "border-lemon/40"
              )}
            >
              <div className="flex items-center gap-3">
                <UserAvatar user={{ name: c.name, avatarUrl: c.avatarUrl }} size="xl" ring={c.official} />
                <div className="min-w-0 flex-1">
                  <h3 className="flex flex-wrap items-center gap-1.5 font-display text-base font-bold">
                    {c.name}
                    {c.official && <Badge className="h-4.5 rounded bg-lemon px-1.5 text-[8px] font-bold text-ink">✓ VERIFIED</Badge>}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">@{c.handle}</p>
                </div>
                <Button
                  onClick={() => toggleSub(c)}
                  variant={c.isSubscribed ? "outline" : "default"}
                  size="sm"
                  className={cn("h-9 rounded-2xl font-bold", c.isSubscribed && "gap-1")}
                >
                  {c.isSubscribed ? <><BellRing className="h-4 w-4 text-lime-600" /> Subscribed</> : <><Bell className="h-4 w-4" /> Subscribe</>}
                </Button>
              </div>
              <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{c.description}</p>
              <div className="mt-3 flex items-center gap-3 text-[10px] font-semibold text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Megaphone className="h-3 w-3 text-lime-600" /> {c.postCount} broadcasts</span>
                <span className="inline-flex items-center gap-1"><Check className="h-3 w-3 text-lime-600" /> {c.subscriberCount} subscribers</span>
                <button onClick={() => setView({ name: "channel", id: c.id })} className="ml-auto font-bold text-lime-700 hover:underline dark:text-lime-400">
                  Open →
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <CreateChannelDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CreateChannelDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const setView = useAppStore((s) => s.setView);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (name.trim().length < 3) return toast.error("Channel name needs at least 3 characters.");
    setLoading(true);
    const res = await api<{ channel: { id: string; name: string } }>("/api/channels", {
      body: { name: name.trim(), description: description.trim() || undefined },
    });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    qc.invalidateQueries({ queryKey: ["channels"] });
    onOpenChange(false);
    setName(""); setDescription("");
    toast.success(`📡 ${res.data.channel.name} is live!`);
    setView({ name: "channel", id: res.data.channel.id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold">Create a channel 📡</DialogTitle>
          <DialogDescription>
            Channels are for departments, offices and clubs. Lecturers and admins can create them.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Channel name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Plant Sciences Dept" className="rounded-xl" maxLength={60} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will you broadcast?" className="min-h-[70px] rounded-xl" maxLength={500} />
          </div>
          <Button onClick={submit} disabled={loading} className="h-12 w-full rounded-2xl font-display font-bold shadow-[0_8px_24px_rgba(163,230,53,0.35)]">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Megaphone className="h-5 w-5" />} Launch channel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
