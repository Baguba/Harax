"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { api, timeAgo } from "@/lib/client-api";
import { useAppStore } from "@/store/app-store";
import type { PostDTO, CommentDTO, Reaction } from "@/lib/types";
import { REACTION_META } from "@/lib/validation-constants";
import { UserAvatar } from "@/components/common/user-avatar";
import { RoleBadge, VerifiedBadge } from "@/components/common/role-badge";
import { MediaLightbox } from "@/components/common/media-lightbox";
import { CommentThread } from "@/components/feed/comment-thread";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pin, Trash2, Flag, MessageCircle, Send, Loader2, Megaphone, Pin as PinIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const REACTIONS: Reaction[] = ["LIKE", "LOVE", "FIRE", "LAUGH", "CLAP"];

export function PostCard({ post }: { post: PostDTO }) {
  const { user, setView } = useAppStore();
  const qc = useQueryClient();
  const [reactions, setReactions] = useState({
    total: post.stats.reactions,
    breakdown: post.reactionBreakdown,
    mine: post.myReaction as Reaction | null,
  });
  const [comments, setComments] = useState<{
    open: boolean;
    count: post.stats.comments;
    list: CommentDTO[];
    loading: boolean;
  }>({ open: false, count: post.stats.comments, list: [], loading: false });
  const [showReactions, setShowReactions] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);

  const react = async (r: Reaction) => {
    setShowReactions(false);
    const removing = reactions.mine === r;
    setReactions((prev) => {
      const breakdown = { ...prev.breakdown };
      if (prev.mine) breakdown[prev.mine] = Math.max(0, (breakdown[prev.mine] ?? 0) - 1);
      if (!removing) breakdown[r] = (breakdown[r] ?? 0) + 1;
      return {
        total: prev.total + (removing ? -1 : prev.mine ? 0 : 1),
        breakdown,
        mine: removing ? null : r,
      };
    });
    const res = await api<{ reactions: number; breakdown: Record<string, number>; myReaction: Reaction | null }>(
      `/api/posts/${post.id}/react`,
      { body: { reaction: r, remove: removing } }
    );
    if (res.ok) {
      setReactions({ total: res.data.reactions, breakdown: res.data.breakdown, mine: res.data.myReaction });
    }
  };

  const loadComments = async () => {
    if (comments.open) return setComments((c) => ({ ...c, open: false }));
    if (comments.list.length > 0) return setComments((c) => ({ ...c, open: true }));
    setComments((c) => ({ ...c, open: true, loading: true }));
    const res = await api<{ comments: CommentDTO[] }>(`/api/posts/${post.id}/comments`);
    if (res.ok) setComments({ open: true, count: res.data.comments.length, list: res.data.comments, loading: false });
    else setComments((c) => ({ ...c, loading: false }));
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setSending(true);
    const res = await api<{ comment: CommentDTO }>(`/api/posts/${post.id}/comments`, {
      body: { content: commentText.trim() },
    });
    setSending(false);
    if (!res.ok) return toast.error(res.error);
    setCommentText("");
    setComments((c) => ({ ...c, list: [...c.list, res.data.comment], count: c.count + 1 }));
  };

  const deletePost = async () => {
    const res = await api(`/api/posts/${post.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error(res.error);
    qc.invalidateQueries({ queryKey: ["feed"] });
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Post deleted");
  };

  const report = async () => {
    const res = await api("/api/reports", {
      body: { targetType: "POST", targetId: post.id, reason: "Reported from feed" },
    });
    if (!res.ok) return toast.error(res.error);
    toast.success("Reported — moderators will review 🛡");
  };

  const pin = async () => {
    const res = await api<{ post: PostDTO }>(`/api/posts/${post.id}`, {
      method: "PATCH",
      body: { pinned: !post.pinned },
    });
    if (!res.ok) return toast.error(res.error);
    qc.invalidateQueries({ queryKey: ["feed"] });
    toast.success(res.data.post.pinned ? "Post pinned 📌" : "Post unpinned");
  };

  const canDelete = user && (user.id === post.author.id || user.role === "ADMIN" || user.role === "SUPERADMIN");
  const canPin = user && (user.role === "ADMIN" || user.role === "SUPERADMIN") && !post.group && !post.channel;

  const topReactions = Object.entries(reactions.breakdown)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "overflow-hidden rounded-3xl border bg-card shadow-sm transition-shadow hover:shadow-md",
        post.pinned && "border-lemon/50 bg-lemon/[0.03]"
      )}
    >
      {/* header */}
      <header className="flex items-center gap-3 px-4 pt-4">
        <UserAvatar user={post.author} size="lg" onClick={() => setView({ name: "profile", id: post.author.id })} />
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setView({ name: "profile", id: post.author.id })}>
          <p className="flex items-center gap-1.5 truncate text-sm font-bold leading-tight">
            {post.author.name}
            {post.author.verified && <VerifiedBadge />}
            <RoleBadge role={post.author.role} />
          </p>
          <p className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
            {post.channel && (
              <>
                <Megaphone className="h-3 w-3 text-lime-600" />
                <span className="font-semibold text-lime-700 dark:text-lime-400">{post.channel.name}</span>
                <span>·</span>
              </>
            )}
            {post.group && (
              <>
                <span>{post.group.emoji}</span>
                <span className="font-semibold">{post.group.name}</span>
                <span>·</span>
              </>
            )}
            <span>{timeAgo(post.createdAt)}</span>
            {post.pinned && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-0.5 font-semibold text-lime-700 dark:text-lime-400">
                  <PinIcon className="h-3 w-3" /> pinned
                </span>
              </>
            )}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted" aria-label="Post options">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl">
            {canPin && <DropdownMenuItem onClick={pin}><Pin className="h-4 w-4" />{post.pinned ? "Unpin post" : "Pin to top"}</DropdownMenuItem>}
            <DropdownMenuItem onClick={report}><Flag className="h-4 w-4" />Report post</DropdownMenuItem>
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={deletePost} className="text-red-600 focus:text-red-600">
                  <Trash2 className="h-4 w-4" />Delete post
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* content */}
      <div className="px-4 pb-3 pt-3">
        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{post.content}</p>
      </div>

      {/* media */}
      {post.mediaUrl && (
        <div className="px-4 pb-3">
          {post.mediaType === "video" ? (
            <video src={post.mediaUrl} controls playsInline className="max-h-[480px] w-full rounded-2xl bg-ink object-contain" />
          ) : (
            <button
              onClick={() => setLightbox(post.mediaUrl!)}
              className="block w-full overflow-hidden rounded-2xl"
              aria-label="View image"
            >
              <img
                src={post.mediaUrl}
                alt="Post media"
                loading="lazy"
                className="max-h-[480px] w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
              />
            </button>
          )}
        </div>
      )}

      {/* reaction summary */}
      {(reactions.total > 0 || comments.count > 0) && (
        <div className="mx-4 flex items-center gap-2 border-t border-border/60 py-2 text-[11px] text-muted-foreground">
          {topReactions.length > 0 && (
            <span className="flex -space-x-1" aria-label={`Total ${reactions.total} reactions`}>
              {topReactions.map(([r]) => (
                <span key={r} className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px]">
                  {REACTION_META[r]?.emoji}
                </span>
              ))}
            </span>
          )}
          {reactions.total > 0 && <span className="font-semibold">{reactions.total}</span>}
          {comments.count > 0 && (
            <button onClick={loadComments} className="ml-auto font-semibold hover:text-foreground hover:underline">
              {comments.count} {comments.count === 1 ? "comment" : "comments"}
            </button>
          )}
        </div>
      )}

      {/* action bar */}
      <div className="flex items-center gap-1 border-t border-border/60 px-2.5 py-1.5">
        <div className="relative flex-1" onMouseEnter={() => user && setShowReactions(true)} onMouseLeave={() => setShowReactions(false)}>
          <ReactionButton
            mine={reactions.mine}
            onClick={() => user ? (reactions.mine ? react(reactions.mine) : react("LIKE")) : toast.info("Sign in to react")}
          />
          <AnimatePresence>
            {showReactions && user && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                className="absolute bottom-[110%] left-0 z-10 flex gap-1 rounded-2xl border bg-popover p-1.5 shadow-xl"
                role="menu"
              >
                {REACTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => react(r)}
                    className={cn(
                      "rounded-xl px-2 py-1 text-xl transition-transform hover:scale-125 active:scale-95",
                      reactions.mine === r && "bg-muted"
                    )}
                    aria-label={`React ${REACTION_META[r].label}`}
                  >
                    {REACTION_META[r].emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={loadComments}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted",
            comments.open && "text-lime-700 dark:text-lime-400"
          )}
          aria-expanded={comments.open}
        >
          <MessageCircle className="h-4 w-4" /> Comment
        </button>
      </div>

      {/* comments */}
      <AnimatePresence initial={false}>
        {comments.open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/50 bg-muted/30"
          >
            <CommentThread
              comments={comments.list}
              loading={comments.loading}
              postId={post.id}
            />
            {user && (
              <div className="flex items-end gap-2 px-4 py-3">
                <UserAvatar user={user} size="sm" />
                <div className="relative flex-1">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                    maxLength={600}
                    placeholder="Add a comment…"
                    className="min-h-[40px] resize-none rounded-2xl bg-card pr-10 text-sm"
                    rows={1}
                  />
                  <button
                    onClick={submitComment}
                    disabled={sending || !commentText.trim()}
                    className="absolute bottom-2 right-2.5 rounded-lg p-1 text-muted-foreground transition-colors hover:text-lime-600 disabled:opacity-40"
                    aria-label="Send comment"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <MediaLightbox src={lightbox} onClose={() => setLightbox(null)} />
    </motion.article>
  );
}

function ReactionButton({ mine, onClick }: { mine: Reaction | null; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold transition-all hover:bg-muted active:scale-95",
        mine && "text-lime-700 dark:text-lime-400"
      )}
      aria-label={mine ? `Reacted ${REACTION_META[mine].label} — click to remove` : "React to post"}
    >
      <span className="text-base leading-none">
        {mine ? (
          <motion.span key={mine} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }} className="inline-block">
            {REACTION_META[mine].emoji}
          </motion.span>
        ) : (
          <motion.span whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.85 }} className="inline-block">
            {REACTION_META.LIKE.emoji}
          </motion.span>
        )}
      </span>
      {mine ? REACTION_META[mine].label : "React"}
    </button>
  );
}

export function PostSkeleton() {
  return (
    <div className="rounded-3xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="shimmer h-11 w-11 rounded-full" />
        <div className="space-y-2">
          <div className="shimmer h-3.5 w-32 rounded-full" />
          <div className="shimmer h-2.5 w-20 rounded-full" />
        </div>
      </div>
      <div className="shimmer mt-4 h-4 w-full rounded-full" />
      <div className="shimmer mt-2 h-4 w-4/5 rounded-full" />
      <div className="shimmer mt-4 h-52 w-full rounded-2xl" />
    </div>
  );
}

export { Button };
