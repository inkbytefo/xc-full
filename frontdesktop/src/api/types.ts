// ============================================================================
// XCORD API Types - Backend DTO Compatible (Minimal)
// ============================================================================

export type ID = string;

// === Auth ===
export interface User {
  id: string;
  handle: string;
  displayName: string;
  email?: string;
  avatarGradient: [string, string];
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  isVerified: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

// === Posts ===
export type Visibility = "public" | "friends" | "server";

export interface Post {
  id: string;
  authorId: string;
  content: string;
  visibility: "public" | "friends" | "server";
  serverId?: string;
  likeCount: number;
  repostCount: number;
  replyCount: number;
  isLiked: boolean;
  isReposted: boolean;
  isBookmarked: boolean;
  author?: {
    id: string;
    handle: string;
    displayName: string;
    avatarGradient: [string, string];
    isVerified: boolean;
  };
  createdAt: string;
}

// === Servers ===
export type MemberRole = "owner" | "admin" | "moderator" | "member";

export interface Server {
  id: string;
  handle?: string;
  name: string;
  description?: string;
  iconGradient: [string, string];
  memberCount: number;
  ownerId: string;
  isPublic: boolean;
  tag?: string;  // Server tag (1-9 chars) for role display on profiles
  myRole?: MemberRole;
  createdAt?: string;
}

export interface Channel {
  id: string;
  serverId: string;
  name: string;
  description?: string;
  type: "text" | "voice" | "video" | "announcement" | "category" | "stage" | "hybrid";
  position: number;
  isPrivate?: boolean;
  parentId?: string; // Category ID for hierarchy
  // Voice/Video capabilities
  userLimit?: number;      // 0 = unlimited
  bitrate?: number;        // Audio bitrate in kbps
  livekitRoom?: string;    // LiveKit room name
  participantCount?: number; // Current participants in voice channel
  createdAt?: string;
}

// ============================================================================
// CHANNEL TYPE HELPERS
// ============================================================================

export type ChannelType = Channel["type"];

/** Check if a channel type supports voice/video features */
export function isVoiceEnabled(type: ChannelType): boolean {
  return ["voice", "video", "stage", "hybrid"].includes(type);
}

/** Check if a channel type supports text messages */
export function isTextEnabled(type: ChannelType): boolean {
  return ["text", "announcement", "hybrid"].includes(type);
}

/** Check if a channel is voice-enabled */
export function isVoiceChannel(channel: Channel): boolean {
  return isVoiceEnabled(channel.type);
}

export interface ChannelMessage {
  id: string;
  channelId: string;
  serverId: string;
  authorId: string;
  content: string;
  isEdited?: boolean;
  isPinned?: boolean;
  replyToId?: string;
  createdAt: string;
  author?: {
    id: string;
    handle: string;
    displayName: string;
    avatarGradient: [string, string];
  };
}

// === Roles (RBAC 2.0) ===
export interface Role {
  id: string;
  name: string;
  color: string;
  position: number;
  permissions: number; // Bitwise flags
  isDefault: boolean;
}

// Permission flags (mirrors backend)
export const Permissions = {
  ADMINISTRATOR: 1 << 0,
  MANAGE_SERVER: 1 << 1,
  MANAGE_ROLES: 1 << 2,
  MANAGE_CHANNELS: 1 << 3,
  KICK_MEMBERS: 1 << 4,
  BAN_MEMBERS: 1 << 5,
  VIEW_CHANNEL: 1 << 10,
  SEND_MESSAGES: 1 << 11,
  MANAGE_MESSAGES: 1 << 12,
  CONNECT: 1 << 20,
  SPEAK: 1 << 21,
} as const;

export interface ServerMember {
  id: string;
  userId: string;
  role: string; // Display role name (highest role or "member")
  roleIds?: string[];
  joinedAt: string;
  user?: {
    id: string;
    handle: string;
    displayName: string;
    avatarGradient: [string, string];
  };
}

export interface Ban {
  id: string;
  userId: string;
  bannedBy: string;
  reason: string;
  createdAt: string;
}

// === DM ===
export interface Conversation {
  id: string;
  otherUser?: {
    id: string;
    handle: string;
    displayName: string;
    avatarGradient: [string, string];
    isOnline: boolean;
  };
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
  };
  unreadCount: number;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isEdited?: boolean;
  createdAt: string;
  sender?: {
    id: string;
    handle: string;
    displayName: string;
    avatarGradient: [string, string];
  };
}

// === Notifications ===
export interface Notification {
  id: string;
  type: string;
  targetType?: string;
  targetId?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actor?: {
    id: string;
    handle: string;
    displayName: string;
    avatarGradient: [string, string];
  };
}

// === Live ===
export interface Stream {
  id: string;
  userId: string;
  title: string;
  description?: string;
  categoryId?: string;
  status: "offline" | "live";
  viewerCount: number;
  isNsfw?: boolean;
  streamKey?: string; // Only present for owner
  startedAt?: string;
  createdAt: string;
  streamer?: {
    id: string;
    handle: string;
    displayName: string;
    avatarGradient: [string, string];
    isVerified?: boolean;
  };
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  streamCount?: number;
}

export interface StreamChatMessage {
  id: string;
  streamId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    handle: string;
    displayName: string;
    avatarGradient: [string, string];
  };
}

export interface Recording {
  id: string;
  streamId: string;
  userId: string;
  filePath: string;
  duration: string;
  thumbnailUrl?: string;
  createdAt: string;
}

export interface StreamAnalytics {
  currentViewers: number;
  totalViews: number; // Placeholder for now
  followersGained: number; // Placeholder
  duration: string;
}

// === API Response ===
export interface ListResponse<T> {
  data: T[];
  nextCursor?: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
