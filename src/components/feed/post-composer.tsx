"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/common/user-avatar";
import { api, uploadFile } from "@/lib/client-api";
import { useAppStore } from "@/store/app-store";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Video, Loader2, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PostDTO } from "@/lib/types";

const QUICK_EMOJIS = ["🌱", "😂", "🔥", "💚", "☕", "🎓", "⚽", "✨", "🙏", "🎉"];

export function PostComposer({ onPosted, autoFocus, groupId, channelId, compactPlaceholder }: { onPosted?: () => void; autoFocus?: boolean; groupId?: string; channelId?: string; compactPlaceholder?: string }) {
  const user = useAppStore((s) => s.user);
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<{ url: string; mediaType: string; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const pickFile = (accept: string, isVideo: boolean) => {
    const input = isVideo ? videoRef.current : fileRef.current;
    if (!input) return;
    input.accept = accept;
    input.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const res = await uploadFile(file);
    setUploading(false);
    if (!res.ok) return toast.error(res.error);
    setMedia({ url: res.url, mediaType: res.mediaType, preview: URL.createObjectURL(file) });
    toast.success(res.mediaType === "video" ? "Video attached 🎬" : "Photo attached 🖼");
  };

  const submit = async () => {
    if (!content.trim() && !media) return toast.error("Say something first!");
    if (posting) return;
    setPosting(true);
    const res = await api<{ post: PostDTO }>("/api/posts", {
      body: {
        content: content.trim(),
        mediaUrl: media?.url,
        mediaType: media?.mediaType,
        groupId: groupId || undefined,
        channelId: channelId || undefined,
      },
    });
    setPosting(false);
    if (!res.ok) return toast.error(res.error);
    setContent("");
    setMedia(null);
    qc.invalidateQueries({ queryKey: ["feed"] });
    if (groupId) qc.invalidateQueries({ queryKey: ["group-posts", groupId] });
    if (channelId) qc.invalidateQueries({ queryKey: ["channel", channelId] });
    toast.success(groupId ? "Posted to the group" : channelId ? "Broadcast published 📣" : "Posted to the campus feed");
    onPosted?.();
  };

  return (
    <div className="game-card rounded-3xl p-4">
      <div className="flex gap-3">
        <UserAvatar user={user} size="lg" />
        <div className="min-w-0 flex-1">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus={autoFocus}
            maxLength={2000}
            placeholder={compactPlaceholder ?? (groupId ? "Post for the group…" : channelId ? "Write a broadcast…" : "What's good on campus today?")}
            className="min-h-[64px] resize-none rounded-2xl border-0 bg-muted/60 px-4 py-3 text-[15px] leading-relaxed placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-lemon/70"
          />

          {/* emoji quick bar */}
          <div className="no-scrollbar mt-1 flex gap-1 overflow-x-auto pb-1">
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setContent((c) => c + e)}
                className="shrink-0 rounded-lg px-1.5 py-0.5 text-base transition-transform hover:scale-125 active:scale-95"
                aria-label={`Add ${e}`}
              >
                {e}
              </button>
            ))}
          </div>

          {/* media preview */}
          {media && (
            <div className="relative mt-2 overflow-hidden rounded-2xl border">
              {media.mediaType === "video" ? (
                <video src={media.preview} controls className="max-h-72 w-full bg-ink object-contain" />
              ) : (
                <img src={media.preview} alt="Upload preview" className="max-h-72 w-full object-cover" />
              )}
              <button
                onClick={() => setMedia(null)}
                className="absolute right-2 top-2 rounded-full bg-ink/70 p-1.5 text-white transition hover:bg-ink"
                aria-label="Remove media"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => pickFile("image/*", false)}
              disabled={uploading || !!media}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-lime-700 dark:hover:text-lime-400 disabled:opacity-50"
            >
              <ImagePlus className="h-4 w-4" /> Photo
            </button>
            <button
              onClick={() => pickFile("video/mp4,video/webm,video/quicktime", true)}
              disabled={uploading || !!media}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-lime-700 dark:hover:text-lime-400 disabled:opacity-50"
            >
              <Video className="h-4 w-4" /> Short video
            </button>
            <span className="ml-auto text-[10px] font-bold text-muted-foreground">{content.length}/2000</span>
            <Button
              onClick={submit}
              disabled={posting || uploading || (!content.trim() && !media)}
              className="h-10 w-full rounded-2xl px-5 text-game-caps sm:w-auto"
            >
              {posting || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Post it
            </Button>
          </div>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} aria-hidden="true" />
      <input ref={videoRef} type="file" hidden onChange={onFile} aria-hidden="true" />

      {uploading && (
        <div className={cn("mt-2 flex items-center gap-2 text-xs text-muted-foreground")}>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-lemon" />
          Uploading your moment…
        </div>
      )}
    </div>
  );
}
