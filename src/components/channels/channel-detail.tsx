"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiQ, timeAgo } from "@/lib/client-api";
import type { ChannelDetailDTO, PostDTO } from "@/lib/types";
import { useAppStore } from "@/store/app-store";
import { useChat } from "@/hooks/use-chat";
import { ChatRoom } from "@/components/groups/group-detail";
import { PostCard } from "@/components/feed/post-card";
import { PostComposer } from "@/components/feed/post-composer";
import { EmptyState } from "@/components/common/empty-state";
import { UserAvatar } from "@/components/common/user-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ChevronLeft, Megaphone, Bell, BellRing, BadgeCheck, Radio, Newspaper } from "lucide-react";

export function ChannelDetail({ channelId }: { channelId: string }) {
  const user = useAppStore((s) => s.user);
  const goBack = useAppStore((s) => s.goBack);
  const qc = useQueryClient();
  const [tab, setTab] = useState<"broadcasts" | "chat">("broadcasts");
  const chat = useChat("GROUP", tab === "chat" ? channelId : null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["channel", channelId],
    queryFn: () => apiQ<{ channel: ChannelDetailDTO }>(`/api/channels/${channelId}`),
  });
  const channel = data?.channel;

  const toggleSub = async () => {
    if (!channel || !user) return toast.info("Sign in to subscribe ⚡");
    const res = await api<{ subscribed: boolean; subscriberCount: number }>(`/api/channels/${channelId}/subscribe`, { body: {} });
    if (!res.ok) return toast.error(res.error);
    qc.invalidateQueries({ queryKey: ["channel", channelId] });
    qc.invalidateQueries({ queryKey: ["channels"] });
    toast.success(res.data.subscribed ? "Subscribed 🔔" : "Unsubscribed");
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-28 rounded-3xl" /><Skeleton className="h-64 rounded-3xl" /></div>;

  if (error || !channel) {
    return <EmptyState emoji="📡" title="Channel not found" action={<Button onClick={goBack} className="rounded-2xl">Back</Button>} />;
  }

  const posts: PostDTO[] = channel.posts.map((p) => ({
    id: p.id,
    content: p.content,
    mediaUrl: p.mediaUrl,
    mediaType: p.mediaType,
    audience: "CHANNEL",
    pinned: p.pinned,
    createdAt: p.createdAt,
    author: p.author,
    channel: { id: channel.id, name: channel.name, handle: channel.handle, official: channel.official },
    group: null,
    stats: p.stats,
    reactionBreakdown: {},
    myReaction: p.myReaction,
    topComments: [],
  }));

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-forest via-ink to-ink p-5 text-lemon-soft sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-lemon/15 blur-3xl" />
        <button onClick={goBack} className="absolute left-3 top-3 rounded-xl p-2 text-lemon-soft/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden" aria-label="Back">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="relative flex flex-wrap items-center gap-3.5">
          <UserAvatar user={{ name: channel.name, avatarUrl: channel.avatarUrl }} size="xxl" ring={channel.official} />
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 font-display text-xl font-bold text-white">
              {channel.name}
              {channel.official && (
                <span className="inline-flex items-center gap-1 rounded-full bg-lemon px-2 py-0.5 text-[9px] font-bold text-ink">
                  <BadgeCheck className="h-3 w-3" /> VERIFIED
                </span>
              )}
            </h1>
            <p className="text-xs text-lemon-soft/70">
              @{channel.handle} · {channel.subscriberCount} subscribers
              {chat.connected && <span className="text-lime-300"> · {chat.online} listening now</span>}
            </p>
            {channel.description && <p className="mt-1.5 max-w-md text-xs leading-relaxed text-lemon-soft/60">{channel.description}</p>}
          </div>
          <Button
            onClick={toggleSub}
            className={cn2(channel.isSubscribed ? "border border-lemon/40 bg-transparent text-lemon hover:bg-lemon/10" : "bg-lemon font-bold text-ink hover:bg-lime-300")}
          >
            {channel.isSubscribed ? <><BellRing className="h-4 w-4" /> Subscribed</> : <><Bell className="h-4 w-4" /> Subscribe</>}
          </Button>
        </div>
      </div>

      {channel.canBroadcast ? (
        <Tabs value={tab} onValueChange={(v) => setTab(v as "broadcasts" | "chat")}>
          <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1">
            <TabsTrigger value="broadcasts" className="rounded-xl font-semibold gap-1.5"><Newspaper className="h-4 w-4" /> Broadcasts</TabsTrigger>
            <TabsTrigger value="chat" className="rounded-xl font-semibold gap-1.5"><Radio className="h-4 w-4" /> Live room</TabsTrigger>
          </TabsList>

          <TabsContent value="broadcasts" className="mt-4 space-y-4">
            <PostComposer channelId={channelId} compactPlaceholder="Write a broadcast to your subscribers…" />
            <ChannelPosts posts={posts} />
          </TabsContent>

          <TabsContent value="chat" className="mt-4">
            <ChatRoom chat={chat} canChat title={`${channel.name} live room`} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 rounded-2xl border border-lemon/30 bg-lemon/10 p-3.5 text-xs font-semibold text-lime-800 dark:text-lime-300">
            <Megaphone className="h-4 w-4" />
            Broadcast channel — only {channel.name} and admins can post. Reactions are open to everyone.
          </div>
          <ChannelPosts posts={posts} />
        </div>
      )}
    </div>
  );
}

function ChannelPosts({ posts }: { posts: PostDTO[] }) {
  if (posts.length === 0) {
    return <EmptyState emoji="📭" title="No broadcasts yet" description="When this channel posts, subscribers get notified instantly." />;
  }
  return <div className="space-y-4">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>;
}

function cn2(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
