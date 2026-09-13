"use client";

import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/client-api";
import type { PostDTO } from "@/lib/types";
import { PostComposer } from "@/components/feed/post-composer";
import { PostCard, PostSkeleton } from "@/components/feed/post-card";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";
import { Flame, Clock, Loader2, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

export function FeedView() {
  const user = useAppStore((s) => s.user);
  const [tab, setTab] = useState<"latest" | "trending">("latest");

  const feed = useInfiniteQuery({
    queryKey: ["feed", tab],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      api<{ posts: PostDTO[]; hasMore: boolean; total: number }>(`/api/posts?tab=${tab}&page=${pageParam}`),
    getNextPageParam: (last, pages) => (last.data?.hasMore ? pages.length : undefined),
  });

  const posts = feed.data?.pages.flatMap((p) => p.data?.posts ?? []) ?? [];

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card">
        <div className="relative flex items-center gap-3 p-5">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Good {dayPart()}, {user?.name.split(" ")[0]}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Here's what's happening around Haramaya today.</p>
          </div>
          <div className="ml-auto hidden sm:flex gap-1 rounded-2xl border border-border/60 bg-card/70 p-1">
            <TabBtn active={tab === "latest"} onClick={() => setTab("latest")} icon={Clock} label="Latest" />
            <TabBtn active={tab === "trending"} onClick={() => setTab("trending")} icon={Flame} label="Trending" />
          </div>
        </div>
      </div>

      {/* mobile tabs */}
      <div className="flex gap-1 rounded-2xl border border-border/60 bg-card/70 p-1 sm:hidden">
        <TabBtn active={tab === "latest"} onClick={() => setTab("latest")} icon={Clock} label="Latest" className="flex-1" />
        <TabBtn active={tab === "trending"} onClick={() => setTab("trending")} icon={Flame} label="Trending" className="flex-1" />
      </div>

      <PostComposer />

      {feed.isLoading ? (
        <div className="space-y-4">
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          emoji="🌱"
          title="The feed is quiet…"
          description="Be the spark — post what's happening around campus, share a photo from today, or start a discussion."
        />
      ) : (
        <div className="space-y-4">
          {posts.map((p) => <PostCard key={p.id} post={p} />)}

          {feed.hasNextPage && (
            <Button
              variant="outline"
              onClick={() => feed.fetchNextPage()}
              disabled={feed.isFetchingNextPage}
              className="h-11 w-full rounded-2xl font-semibold"
            >
              {feed.isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more posts"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label, className }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold transition-all",
        active ? "bg-lemon/20 text-lime-800 dark:text-lime-300" : "text-muted-foreground hover:text-foreground",
        className
      )}
      aria-pressed={active}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function dayPart(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

export { Newspaper, toast };
