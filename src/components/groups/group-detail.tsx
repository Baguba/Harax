"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { api, apiQ, timeAgo } from "@/lib/client-api";
import type { GroupDetailDTO, PostDTO } from "@/lib/types";
import { useAppStore } from "@/store/app-store";
import { useChat } from "@/hooks/use-chat";
import { UserAvatar } from "@/components/common/user-avatar";
import { RoleBadge } from "@/components/common/role-badge";
import { PostCard } from "@/components/feed/post-card";
import { PostComposer } from "@/components/feed/post-composer";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ChevronLeft, Users, Send, Loader2, ImagePlus, Plus, UserPlus, LogOut, Crown, Wifi, WifiOff, MessagesSquare, Newspaper,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function GroupDetail({ groupId }: { groupId: string }) {
  const user = useAppStore((s) => s.user);
  const goBack = useAppStore((s) => s.goBack);
  const setView = useAppStore((s) => s.setView);
  const qc = useQueryClient();
  const [tab, setTab] = useState<"chat" | "posts">("chat");
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => apiQ<{ group: GroupDetailDTO }>(`/api/groups/${groupId}`),
  });

  const group = data?.group;
  const chat = useChat("GROUP", group ? groupId : null);

  const join = async () => {
    if (!group) return;
    const res = await api(`/api/groups/${groupId}/members`, { body: {} });
    if (!res.ok) return toast.error(res.error);
    qc.invalidateQueries({ queryKey: ["group", groupId] });
    toast.success(`Joined ${group.name}! ${group.emoji}`);
  };

  const leave = async () => {
    const res = await api(`/api/groups/${groupId}/members`, { method: "DELETE" });
    if (!res.ok) return toast.error(res.error);
    qc.invalidateQueries({ queryKey: ["group", groupId] });
    toast("You left the group 👋");
    goBack();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <EmptyState
        emoji="🚪"
        title="Group not found"
        description="It may have been deleted, or it's private and you need an invite."
        action={<Button onClick={goBack} className="rounded-2xl">Back to groups</Button>}
      />
    );
  }

  const isAdminOfGroup = group.myRole === "ADMIN" || group.owner.id === user?.id;
  const canChat = group.isMember || group.owner.id === user?.id;

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card">
        <div className="relative flex items-center gap-3.5 p-4 sm:p-5">
          <button onClick={goBack} className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted lg:hidden" aria-label="Back">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary text-3xl">
            {group.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl font-bold">{group.name}</h1>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> {group.memberCount} members
              {chat.connected && canChat && (
                <>
                  <span className="text-lime-600">·</span>
                  <Wifi className="h-3 w-3 text-lime-600" />
                  <span className="font-semibold text-lime-700 dark:text-lime-400">{chat.online} online</span>
                </>
              )}
              {!chat.connected && canChat && <WifiOff className="ml-1 h-3 w-3 text-muted-foreground" />}
            </p>
          </div>
          <div className="flex gap-1.5">
            {isAdminOfGroup && (
              <Button onClick={() => setAddOpen(true)} size="icon" className="h-10 w-10 rounded-2xl" aria-label="Add member">
                <UserPlus className="h-5 w-5" />
              </Button>
            )}
            {canChat ? (
              <Button onClick={leave} size="icon" variant="outline" className="h-10 w-10 rounded-2xl" aria-label="Leave group">
                <LogOut className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={join} className="h-10 rounded-2xl font-bold">
                <Plus className="h-4 w-4" /> Join
              </Button>
            )}
          </div>
        </div>
        {group.description && (
          <p className="border-t border-border/50 px-5 py-2.5 text-xs leading-relaxed text-muted-foreground">{group.description}</p>
        )}
      </div>

      {!canChat && !group.isPublic ? (
        <EmptyState emoji="🔒" title="Private group" description="Ask a group admin to add you by email." />
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as "chat" | "posts")}>
          <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1">
            <TabsTrigger value="chat" className="rounded-xl font-semibold gap-1.5"><MessagesSquare className="h-4 w-4" /> Chat</TabsTrigger>
            <TabsTrigger value="posts" className="rounded-xl font-semibold gap-1.5"><Newspaper className="h-4 w-4" /> Posts</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-4">
            <ChatRoom
              chat={chat}
              canChat={canChat}
              title={group.name}
              joinCta={group.isPublic ? { label: `Join ${group.name} to chat`, action: join } : undefined}
            />
          </TabsContent>

          <TabsContent value="posts" className="mt-4 space-y-4">
            {canChat && (
              <PostComposer
                key={`group-composer-${groupId}`}
                groupId={groupId}
              />
            )}
            <GroupPosts groupId={groupId} />
          </TabsContent>
        </Tabs>
      )}

      {/* members preview */}
      <section className="rounded-3xl border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold">
          <Users className="h-4 w-4 text-lime-600" /> Members
          <span className="text-xs font-normal text-muted-foreground">{group.memberCount}</span>
        </h3>
        <div className="space-y-1">
          {group.members.slice(0, 8).map((m) => (
            <button
              key={m.id}
              onClick={() => setView({ name: "profile", id: m.id })}
              className="flex w-full items-center gap-2.5 rounded-2xl px-2 py-1.5 text-left transition-colors hover:bg-muted"
            >
              <UserAvatar user={m} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold">{m.name}</span>
                <span className="block truncate text-[10px] text-muted-foreground">{m.department ?? m.role}</span>
              </span>
              {m.groupRole === "ADMIN" && <Crown className="h-3.5 w-3.5 text-amber-500" aria-label="Group admin" />}
              <RoleBadge role={m.role} />
            </button>
          ))}
          {group.members.length > 8 && (
            <p className="pt-1 text-center text-[10px] text-muted-foreground">+{group.members.length - 8} more members</p>
          )}
        </div>
      </section>

      <AddMemberDialog open={addOpen} onOpenChange={setAddOpen} groupId={groupId} groupName={group.name} />
    </div>
  );
}

/* ── real-time chat room (shared with sidechat) ─────────── */
export function ChatRoom({
  chat,
  canChat,
  title,
  anonymous = false,
  joinCta,
}: {
  chat: ReturnType<typeof useChat>;
  canChat: boolean;
  title: string;
  anonymous?: boolean;
  joinCta?: { label: string; action: () => void };
}) {
  const user = useAppStore((s) => s.user);
  const [text, setText] = useState("");
  const [media, setMedia] = useState<{ url: string; mediaType: string } | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingSent = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.messages.length, chat.typing]);

  const send = async () => {
    if (!text.trim() && !media) return;
    if (sending) return;
    setSending(true);
    const res = await chat.send(text.trim(), media ?? undefined);
    setSending(false);
    if (!res.ok) {
      toast.error(res.error ?? "Message didn't send — try again.");
      return;
    }
    setText("");
    setMedia(null);
    chat.setTypingState(false);
    typingSent.current = false;
  };

  const onType = (v: string) => {
    setText(v);
    if (!typingSent.current && v.length > 0) {
      chat.setTypingState(true);
      typingSent.current = true;
      setTimeout(() => (typingSent.current = false), 2500);
    }
    if (v.length === 0) chat.setTypingState(false);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const { uploadFile } = await import("@/lib/client-api");
    const res = await uploadFile(file);
    if (!res.ok) return toast.error(res.error);
    setMedia({ url: res.url, mediaType: res.mediaType });
  };

  return (
    <div className="flex h-[62svh] min-h-[420px] flex-col overflow-hidden rounded-3xl border bg-card">
      {/* messages */}
      <div className="relative flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4 nice-scrollbar">
        {chat.messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="text-4xl">💬</span>
            <p className="text-sm font-semibold">No messages yet</p>
            <p className="max-w-xs text-xs text-muted-foreground">Be the first to break the ice in {title}.</p>
          </div>
        )}
        {chat.messages.map((m) => {
          const mine = !anonymous && m.sender?.id === user?.id;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className={cn("flex w-full gap-2", mine ? "justify-end" : "justify-start")}
            >
              {!mine && (
                <UserAvatar user={anonymous ? { name: m.anonName ?? "Anon", avatarUrl: null } : { name: m.sender?.name ?? "?", avatarUrl: m.sender?.avatarUrl ?? null }} size="sm" />
              )}
              <div className={cn("max-w-[78%] px-3.5 py-2.5 shadow-sm", mine ? "chat-me" : "chat-them")}>
                {!mine && (
                  <p className={cn("mb-0.5 text-[10px] font-bold uppercase tracking-wide", anonymous ? "text-lime-700 dark:text-lime-400" : "text-lime-800 dark:text-lime-300")}>
                    {anonymous ? m.anonName : m.sender?.name}
                    {!anonymous && m.sender?.role && <span className="ml-1 font-normal normal-case text-muted-foreground">· {String(m.sender.role).toLowerCase()}</span>}
                  </p>
                )}
                {m.content && <p className="break-words text-sm leading-relaxed">{m.content}</p>}
                {m.mediaUrl && m.mediaType === "image" && (
                  <img src={m.mediaUrl} alt="shared" loading="lazy" className="mt-1.5 max-h-52 rounded-xl object-cover" />
                )}
                {m.mediaUrl && m.mediaType === "video" && (
                  <video src={m.mediaUrl} controls className="mt-1.5 max-h-52 rounded-xl" />
                )}
                <p className={cn("mt-1 text-right text-[9px]", mine ? "text-ink/60" : "text-muted-foreground")}>
                  {new Date(m.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </motion.div>
          );
        })}

        {/* typing indicator */}
        <AnimatePresence>
          {chat.typing?.typing && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
              <span className="chat-them flex items-center gap-1 rounded-2xl px-3.5 py-3">
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground">{chat.typing.who} is typing…</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      <div className="border-t border-border/60 bg-card p-3">
        {chat.authError && (
          <p className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            {chat.authError}
          </p>
        )}
        {!canChat && joinCta ? (
          <Button onClick={joinCta.action} className="h-11 w-full rounded-2xl font-bold">
            <UserPlus className="h-4 w-4" /> {joinCta.label}
          </Button>
        ) : (
          <>
          {media && (
          <div className="relative mb-2 inline-flex rounded-xl border p-1">
            {media.mediaType === "image" ? (
              <img src={media.url} alt="to send" className="h-16 rounded-lg" />
            ) : (
              <video src={media.url} className="h-16 rounded-lg" />
            )}
            <button onClick={() => setMedia(null)} className="absolute -right-1.5 -top-1.5 rounded-full bg-ink p-0.5 text-white" aria-label="Remove attachment">
              ×
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={!canChat}
            className="rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-lime-600"
            aria-label="Attach image"
          >
            <ImagePlus className="h-5 w-5" />
          </button>
          <textarea
            value={text}
            onChange={(e) => onType(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            disabled={!canChat}
            rows={1}
            maxLength={1000}
            placeholder={canChat ? `Message ${title}…` : "Join the room to chat"}
            className="max-h-28 min-h-[42px] flex-1 resize-none rounded-2xl border border-border/70 bg-muted/40 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-lemon/60 focus:bg-card disabled:opacity-60"
            aria-label={`Message ${title}`}
          />
          <Button onClick={send} disabled={!canChat || sending || (!text.trim() && !media)} size="icon" className="h-11 w-11 rounded-2xl" aria-label="Send message">
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} aria-hidden="true" />
      </div>
    </div>
  );
}

/* ── group posts ─────────────────────────────────────────── */
function GroupPosts({ groupId }: { groupId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["group-posts", groupId],
    queryFn: () => apiQ<{ posts: PostDTO[] }>(`/api/posts?scope=group&groupId=${groupId}`),
  });

  if (isLoading) return <Skeleton className="h-48 rounded-3xl" />;
  const posts = data?.posts ?? [];
  if (posts.length === 0) {
    return <EmptyState emoji="📭" title="No posts in this group yet" description="Announcements, polls or study material — post something for the squad." />;
  }
  return (
    <div className="space-y-4">
      {posts.map((p) => <PostCard key={p.id} post={p} />)}
    </div>
  );
}

/* ── add member dialog ──────────────────────────────────── */
function AddMemberDialog({ open, onOpenChange, groupId, groupName }: { open: boolean; onOpenChange: (v: boolean) => void; groupId: string; groupName: string }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const add = async () => {
    if (!email.includes("@")) return toast.error("Enter a valid email.");
    setLoading(true);
    const res = await api<{ added: { name: string } }>(`/api/groups/${groupId}/members`, {
      body: { addEmail: email.trim().toLowerCase() },
    });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    qc.invalidateQueries({ queryKey: ["group", groupId] });
    setEmail("");
    onOpenChange(false);
    toast.success(`${res.data.added.name} added to ${groupName}! 🎉`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold">Add a member 👥</DialogTitle>
          <DialogDescription>
            Telegram-style: add any Harax account by email. They'll get a notification instantly.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="student@haramaya.edu.et"
            className="rounded-xl"
          />
          <p className="text-[11px] text-muted-foreground">
            Try: <button onClick={() => setEmail("dawit.mengistu@gmail.com")} className="font-semibold text-lime-700 hover:underline dark:text-lime-400">dawit.mengistu@gmail.com</button>
          </p>
          <Button onClick={add} disabled={loading} className="h-11 w-full rounded-2xl font-bold">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Add to group
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
