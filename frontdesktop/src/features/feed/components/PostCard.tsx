import type { ReactNode } from "react";
import type { Post } from "../../../api/types";
import { UserPopover } from "../../../components/UserPopover";

function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function formatCompactNumber(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}K`;
  return `${(value / 1_000_000).toFixed(value < 10_000_000 ? 1 : 0)}M`;
}

function formatRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diffMs = Date.now() - t;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}dk`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}sa`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}g`;
  return new Date(iso).toLocaleDateString();
}

function IconReply() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M8.5 10.5h7M8.5 13.5h4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M5 6.8A2.8 2.8 0 0 1 7.8 4h8.4A2.8 2.8 0 0 1 19 6.8v6.2A2.8 2.8 0 0 1 16.2 15.8H10l-4.5 3v-3H7.8A2.8 2.8 0 0 1 5 13V6.8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconRepost() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M7 7h10l-2.4-2.4M17 17H7l2.4 2.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 7v4M17 17v-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconHeart({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12 20s-7-4.4-9.2-9.2C1.2 7.1 3.4 4.5 6.3 4.5c1.8 0 3.2 1 3.7 1.7.5-.7 1.9-1.7 3.7-1.7 2.9 0 5.1 2.6 3.5 6.3C19 15.6 12 20 12 20Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBookmark({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M7 4.8A2.8 2.8 0 0 1 9.8 2h4.4A2.8 2.8 0 0 1 17 4.8V22l-5-3-5 3V4.8Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ActionButton({
  label,
  count,
  onClick,
  active,
  tone,
  icon,
  disabled,
}: {
  label: string;
  count: number;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  tone: "neutral" | "velvet" | "green";
  icon: ReactNode;
}) {
  const toneClass =
    tone === "velvet"
      ? active
        ? "text-[var(--velvet-2)]"
        : "hover:text-[var(--velvet-2)]"
      : tone === "green"
        ? active
          ? "text-emerald-300"
          : "hover:text-emerald-300"
        : active
          ? "text-zinc-100"
          : "hover:text-zinc-100";

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs text-zinc-400 transition",
        "hover:bg-white/5",
        toneClass,
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {icon}
      <span className="tabular-nums">{formatCompactNumber(count)}</span>
    </button>
  );
}

export function PostCard({
  post,
  onLike,
  onRepost,
  onBookmark,
  busyAction,
}: {
  post: Post;
  onLike: () => void;
  onRepost: () => void;
  onBookmark: () => void;
  busyAction: "like" | "repost" | "bookmark" | null;
}) {
  const time = formatRelativeTime(post.createdAt);

  // Handle author - may be undefined in some cases
  const author = post.author ?? {
    id: post.authorId,
    handle: "unknown",
    displayName: "Unknown User",
    avatarGradient: ["#333", "#666"] as [string, string],
    isVerified: false,
  };

  const gradientA = author.avatarGradient[0];
  const gradientB = author.avatarGradient[1];

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm transition-all hover:border-purple-500/30 hover:bg-black/40 hover:shadow-[0_0_30px_rgba(147,51,234,0.1)]">
      <div className="flex items-start gap-3">
        <UserPopover
          userId={author.id}
          user={{
            id: author.id,
            handle: author.handle,
            displayName: author.displayName,
            avatarGradient: author.avatarGradient,
            isVerified: author.isVerified,
          }}
        >
          <div
            className="h-10 w-10 shrink-0 rounded-full ring-1 ring-white/10 cursor-pointer hover:ring-2 hover:ring-purple-500/50 transition-all"
            style={{ backgroundImage: `linear-gradient(135deg, ${gradientA}, ${gradientB})` }}
          />
        </UserPopover>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold text-zinc-100">
                  {author.displayName}
                </span>
                <span className="truncate text-xs text-zinc-500">@{author.handle}</span>
                {author.isVerified && (
                  <span className="shrink-0 text-blue-400" title="Doğrulanmış">✓</span>
                )}
              </div>
            </div>
            <div className="shrink-0 text-xs text-zinc-500">{time}</div>
          </div>

          {/* Content */}
          <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-200">
            {post.content.split(/((?:#|@)\w+)/g).map((part, i) => {
              if (part.startsWith("#")) {
                return (
                  <span key={i} className="text-pink-400 font-medium cursor-pointer hover:underline">
                    {part}
                  </span>
                );
              }
              if (part.startsWith("@")) {
                return (
                  <span key={i} className="text-purple-400 font-medium cursor-pointer hover:underline">
                    {part}
                  </span>
                );
              }
              return part;
            })}
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <ActionButton
                label="Yanıtla"
                count={post.replyCount}
                tone="neutral"
                icon={<IconReply />}
              />
              <ActionButton
                label="Repost"
                count={post.repostCount}
                onClick={onRepost}
                active={post.isReposted}
                disabled={busyAction === "repost"}
                tone="green"
                icon={<IconRepost />}
              />
              <ActionButton
                label="Beğen"
                count={post.likeCount}
                onClick={onLike}
                active={post.isLiked}
                disabled={busyAction === "like"}
                tone="velvet"
                icon={<IconHeart filled={post.isLiked} />}
              />
            </div>

            <ActionButton
              label="Kaydet"
              count={0}
              onClick={onBookmark}
              active={post.isBookmarked}
              disabled={busyAction === "bookmark"}
              tone="neutral"
              icon={<IconBookmark filled={post.isBookmarked} />}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
