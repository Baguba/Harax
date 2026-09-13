"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { CommentDTO } from "@/lib/types";
import { UserAvatar } from "@/components/common/user-avatar";
import { RoleBadge } from "@/components/common/role-badge";
import { timeAgo } from "@/lib/client-api";
import { useAppStore } from "@/store/app-store";
import { Skeleton } from "@/components/ui/skeleton";

export function CommentThread({ comments, loading, postId }: { comments: CommentDTO[]; loading: boolean; postId: string }) {
  const setView = useAppStore((s) => s.setView);

  if (loading) {
    return (
      <div className="space-y-3 px-4 py-4" data-post={postId}>
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-2.5">
            <Skeleton className="h-7 w-7 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-2.5 w-24 rounded-full" />
              <Skeleton className="h-3.5 w-4/5 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1 px-4 py-3">
      <AnimatePresence initial={false}>
        {comments.map((c) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-2.5 rounded-2xl px-2 py-1.5 transition-colors hover:bg-muted/60"
          >
            <UserAvatar user={c.author} size="sm" onClick={() => setView({ name: "profile", id: c.author.id })} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold leading-tight">
                {c.author.name}
                <RoleBadge role={c.author.role} />
                <span className="font-normal text-muted-foreground">{timeAgo(c.createdAt)}</span>
              </p>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed">{c.content}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {comments.length === 0 && (
        <p className="py-2 text-center text-xs text-muted-foreground">No comments yet — start the conversation 💬</p>
      )}
    </div>
  );
}
