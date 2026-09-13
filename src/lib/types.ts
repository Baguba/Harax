// Shared client-side DTO types (mirror of API responses)

export type Role = "STUDENT" | "LECTURER" | "ADMIN" | "SUPERADMIN";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  coverUrl: string | null;
  department: string | null;
  year: string | null;
  bio: string | null;
  verified: boolean;
  provider: string;
  createdAt: string;
}

export interface MiniAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: Role | string;
  verified?: boolean;
  department?: string | null;
}

export interface PostDTO {
  id: string;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  audience: string;
  pinned: boolean;
  createdAt: string;
  author: MiniAuthor;
  channel: { id: string; name: string; handle: string; official: boolean } | null;
  group: { id: string; name: string; emoji: string } | null;
  stats: { reactions: number; comments: number };
  reactionBreakdown: Record<string, number>;
  myReaction: string | null;
  topComments: Array<{ id: string; content: string; createdAt: string; author: MiniAuthor }>;
}

export interface CommentDTO {
  id: string;
  content: string;
  createdAt: string;
  author: MiniAuthor;
}

export type Reaction = "LIKE" | "LOVE" | "FIRE" | "LAUGH" | "CLAP";

export interface EventDTO {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  coverUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
  organizer: MiniAuthor;
  stats: { going: number; interested: number; total: number };
  myRsvp: "GOING" | "INTERESTED" | null;
  attendees: Array<{ id: string; name: string; avatarUrl: string | null; status: string }>;
}

export interface GroupDTO {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  isPublic: boolean;
  createdAt: string;
  owner: MiniAuthor;
  memberCount: number;
  postCount: number;
  isMember: boolean;
}

export interface GroupDetailDTO extends GroupDTO {
  myRole: string | null;
  members: Array<{ id: string; name: string; avatarUrl: string | null; role: string; department: string | null; groupRole: string; joinedAt: string }>;
}

export interface ChannelDTO {
  id: string;
  name: string;
  handle: string;
  description: string | null;
  official: boolean;
  avatarUrl: string | null;
  createdAt: string;
  owner: MiniAuthor;
  subscriberCount: number;
  postCount: number;
  lastPostAt: string | null;
  isSubscribed: boolean;
}

export interface ChannelDetailDTO extends Omit<ChannelDTO, "postCount" | "lastPostAt"> {
  postCount: number;
  canBroadcast: boolean;
  posts: Array<{
    id: string;
    content: string;
    mediaUrl: string | null;
    mediaType: string | null;
    pinned: boolean;
    createdAt: string;
    author: MiniAuthor;
    stats: { reactions: number; comments: number };
    myReaction: string | null;
  }>;
}

export interface SideRoomDTO {
  id: string;
  key: string;
  name: string;
  emoji: string;
  description: string | null;
  messageCount: number;
  lastMessage: { content: string; anonName: string | null; createdAt: string } | null;
  lastHourActive: boolean;
}

export interface ChatMessageDTO {
  id: string;
  roomId: string;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  anonName: string | null;
  createdAt: string;
  sender: MiniAuthor | null;
}

export interface NotificationDTO {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface SearchResults {
  users: Array<{ id: string; name: string; avatarUrl: string | null; role: string; department: string | null; verified: boolean }>;
  groups: Array<{ id: string; name: string; emoji: string; isPublic: boolean; memberCount: number }>;
  channels: Array<{ id: string; name: string; handle: string; official: boolean; avatarUrl: string | null; subscriberCount: number }>;
  events: Array<{ id: string; title: string; startsAt: string; category: string; coverUrl: string | null; location: string }>;
}

export interface ProfileDTO {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  role: Role;
  department: string | null;
  year: string | null;
  bio: string | null;
  verified: boolean;
  provider: string;
  createdAt: string;
  stats: { posts: number; comments: number; reactionsReceived: number; groups: number; events: number };
  isMe: boolean;
  posts: PostDTO[];
  groups: Array<{ id: string; name: string; emoji: string; isPublic: boolean; groupRole: string }>;
  upcomingEvents: Array<{ id: string; title: string; startsAt: string; category: string; coverUrl: string; status: string }>;
  channels: Array<{ id: string; name: string; handle: string; official: boolean; avatarUrl: string | null; _count?: { subscribers: number } }>;
}

export interface AdminStats {
  stats: {
    users: number; posts: number; events: number; groups: number;
    channels: number; messages: number; openReports: number; activeSessions: number;
    roleDist: Record<string, number>;
  };
  activity: Array<{ date: string; label: string; posts: number; messages: number }>;
  users: Array<{
    id: string; name: string; email: string; role: string; department: string | null;
    avatarUrl: string | null; verified: boolean; banned: boolean; provider: string;
    createdAt: string; counts: { posts: number; comments: number; groups: number };
  }>;
  topPosts: Array<{
    id: string; content: string; createdAt: string;
    author: { name: string; role: string; avatarUrl: string | null };
    stats: { reactions: number; comments: number };
  }>;
}

export interface ReportDTO {
  id: string;
  targetType: string;
  reason: string;
  status: string;
  createdAt: string;
  reporter: MiniAuthor;
  target: { id: string; name?: string; content?: string; avatarUrl?: string | null } | null;
}
