import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export interface PostDTO {
  id: string;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  audience: string;
  pinned: boolean;
  createdAt: string;
  author: {
    id: string; name: string; avatarUrl: string | null;
    role: string; verified: boolean; department: string | null;
  };
  channel: { id: string; name: string; handle: string; official: boolean } | null;
  group: { id: string; name: string; emoji: string } | null;
  stats: { reactions: number; comments: number };
  reactionBreakdown: Record<string, number>;
  myReaction: string | null;
  topComments: Array<{
    id: string; content: string; createdAt: string;
    author: { id: string; name: string; avatarUrl: string | null; role: string };
  }>;
}

const REACTIONS = ["LIKE", "LOVE", "FIRE", "LAUGH", "CLAP"] as const;

export function transformPost(
  post: Prisma.PostGetPayload<{
    include: {
      author: true;
      likes: { include: { user: true } };
      comments: { include: { author: true }; orderBy: { createdAt: "desc" } };
      channel: true;
      group: true;
    };
  }>,
  meId?: string
): PostDTO {
  const breakdown: Record<string, number> = {};
  for (const r of REACTIONS) breakdown[r] = 0;
  let my: string | null = null;
  for (const like of post.likes) {
    breakdown[like.reaction] = (breakdown[like.reaction] ?? 0) + 1;
    if (meId && like.userId === meId) my = like.reaction;
  }
  const top = post.comments.slice(0, 2).map((c) => ({
    id: c.id, content: c.content, createdAt: c.createdAt.toISOString(),
    author: { id: c.author.id, name: c.author.name, avatarUrl: c.author.avatarUrl, role: c.author.role },
  }));
  return {
    id: post.id,
    content: post.content,
    mediaUrl: post.mediaUrl,
    mediaType: post.mediaType,
    audience: post.audience,
    pinned: post.pinned,
    createdAt: post.createdAt.toISOString(),
    author: {
      id: post.author.id, name: post.author.name, avatarUrl: post.author.avatarUrl,
      role: post.author.role, verified: post.author.verified, department: post.author.department,
    },
    channel: post.channel ? { id: post.channel.id, name: post.channel.name, handle: post.channel.handle, official: post.channel.official } : null,
    group: post.group ? { id: post.group.id, name: post.group.name, emoji: post.group.emoji } : null,
    stats: { reactions: post.likes.length, comments: post.comments.length },
    reactionBreakdown: breakdown,
    myReaction: my,
    topComments: top.reverse(),
  };
}

export const postInclude = {
  author: true,
  likes: { include: { user: true } },
  comments: { include: { author: true }, orderBy: { createdAt: "desc" as const } },
  channel: true,
  group: true,
} satisfies Prisma.PostInclude;

export function trendingScore(p: { likes: unknown[]; comments: unknown[] }): number {
  return (p.likes.length * 2 + p.comments.length) as number;
}
