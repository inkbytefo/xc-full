import type { ReactNode } from "react";

function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export type ProfileChip = {
  label: string;
  variant?: "default" | "accent" | "success" | "warning";
};

export type ProfileTab = {
  key: string;
  label: string;
  count?: number;
};

export type ProfileViewModel = {
  displayName: string;
  handle?: string;
  bio?: string;
  location?: string;
  website?: string;
  joinDate?: string;
  avatarText: string;
  avatarGradient: [string, string];
  avatarUrl?: string;
  coverGradient: [string, string];
  coverUrl?: string;
  isVerified?: boolean;
  isOnline?: boolean;
  followingCount?: number;
  followersCount?: number;
};

export type ProfileAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "outline";
  icon?: ReactNode;
};

/**
 * Twitter/X style profile header component
 * Features: Wide cover (3:1), overlapping avatar, bio, stats, action buttons
 */
export function TwitterProfileHeader(props: {
  profile: ProfileViewModel;
  actions?: ProfileAction[];
  tabs?: ProfileTab[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  onAvatarClick?: () => void;
  onCoverClick?: () => void;
}) {
  const { profile, actions, tabs, activeTab, onTabChange, onAvatarClick, onCoverClick } = props;

  const coverStyle = profile.coverUrl
    ? { backgroundImage: `url(${profile.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: `linear-gradient(135deg, ${profile.coverGradient[0]}cc, ${profile.coverGradient[1]}66)` };

  const avatarStyle = profile.avatarUrl
    ? { backgroundImage: `url(${profile.avatarUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: `linear-gradient(135deg, ${profile.avatarGradient[0]}, ${profile.avatarGradient[1]})` };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      {/* Cover Photo - 3:1 aspect ratio like Twitter */}
      <button
        type="button"
        onClick={onCoverClick}
        className="relative block w-full"
        style={{ aspectRatio: "3/1" }}
      >
        <div className="absolute inset-0" style={coverStyle} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      </button>

      {/* Profile Info Section */}
      <div className="relative px-4 pb-4">
        {/* Avatar - overlaps cover */}
        <div className="-mt-16 flex items-end justify-between sm:-mt-20">
          <button
            type="button"
            onClick={onAvatarClick}
            className="group relative"
          >
            <div
              className="grid h-24 w-24 place-items-center rounded-full border-4 border-[#050505] text-2xl font-bold text-white shadow-xl transition-transform group-hover:scale-105 sm:h-32 sm:w-32 sm:text-3xl"
              style={avatarStyle}
            >
              {!profile.avatarUrl && profile.avatarText}
            </div>
            {/* Online indicator */}
            {profile.isOnline !== undefined && (
              <div
                className={cn(
                  "absolute bottom-1 right-1 h-5 w-5 rounded-full border-4 border-[#050505] sm:h-6 sm:w-6",
                  profile.isOnline ? "bg-emerald-400" : "bg-zinc-600",
                )}
              />
            )}
          </button>

          {/* Action buttons */}
          {actions && actions.length > 0 && (
            <div className="flex gap-2 pt-4">
              {actions.map((action, i) => (
                <button
                  key={`${action.label}-${i}`}
                  type="button"
                  onClick={action.onClick}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all",
                    action.variant === "primary"
                      ? "bg-white text-black hover:bg-white/90"
                      : action.variant === "outline"
                        ? "border border-zinc-600 text-zinc-100 hover:border-zinc-500 hover:bg-white/5"
                        : "border border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10",
                  )}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Name and handle */}
        <div className="mt-3">
          <div className="flex items-center gap-1">
            <h1 className="text-xl font-bold text-zinc-100">{profile.displayName}</h1>
            {profile.isVerified && (
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-blue-400" fill="currentColor">
                <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
              </svg>
            )}
          </div>
          {profile.handle && (
            <div className="text-sm text-zinc-500">@{profile.handle}</div>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-200">{profile.bio}</p>
        )}

        {/* Meta info row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
          {profile.location && (
            <span className="flex items-center gap-1">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              {profile.location}
            </span>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-400 hover:underline"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
              </svg>
              {profile.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          {profile.joinDate && (
            <span className="flex items-center gap-1">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" />
              </svg>
              {profile.joinDate} tarihinde katıldı
            </span>
          )}
        </div>

        {/* Following/Followers stats */}
        {(profile.followingCount !== undefined || profile.followersCount !== undefined) && (
          <div className="mt-3 flex gap-4">
            {profile.followingCount !== undefined && (
              <button type="button" className="group text-sm hover:underline">
                <span className="font-bold text-zinc-100">{profile.followingCount.toLocaleString("tr-TR")}</span>
                <span className="ml-1 text-zinc-500 group-hover:text-zinc-400">Takip</span>
              </button>
            )}
            {profile.followersCount !== undefined && (
              <button type="button" className="group text-sm hover:underline">
                <span className="font-bold text-zinc-100">{profile.followersCount.toLocaleString("tr-TR")}</span>
                <span className="ml-1 text-zinc-500 group-hover:text-zinc-400">Takipçi</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      {tabs && tabs.length > 0 && (
        <div className="flex border-t border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange?.(tab.key)}
              className={cn(
                "relative flex-1 py-4 text-center text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "text-zinc-100"
                  : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300",
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1 text-xs text-zinc-600">({tab.count})</span>
              )}
              {/* Active indicator */}
              {activeTab === tab.key && (
                <div className="absolute inset-x-1/4 bottom-0 h-1 rounded-full bg-blue-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Content section with Twitter-like styling
 */
export function ProfileContentSection(props: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-white/10 px-4 py-3", props.className)}>
      {props.children}
    </div>
  );
}

/**
 * Empty state for profile sections
 */
export function ProfileEmptyState(props: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-8 py-16 text-center">
      <h3 className="text-xl font-bold text-zinc-100">{props.title}</h3>
      {props.description && (
        <p className="mt-2 text-sm text-zinc-500">{props.description}</p>
      )}
      {props.action && <div className="mt-4">{props.action}</div>}
    </div>
  );
}

/**
 * User list item for following/followers
 */
export function ProfileUserItem(props: {
  user: {
    displayName: string;
    handle: string;
    avatarGradient: [string, string];
    bio?: string;
    isVerified?: boolean;
  };
  action?: ReactNode;
  onClick?: () => void;
}) {
  const { user, action, onClick } = props;

  return (
    <div className="flex items-start gap-3 border-b border-white/10 px-4 py-3 transition-colors hover:bg-white/[0.02]">
      <button
        type="button"
        onClick={onClick}
        className="shrink-0"
      >
        <div
          className="grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${user.avatarGradient[0]}, ${user.avatarGradient[1]})` }}
        >
          {user.displayName.slice(0, 1).toUpperCase()}
        </div>
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <button type="button" onClick={onClick} className="min-w-0 text-left">
            <div className="flex items-center gap-1">
              <span className="truncate font-bold text-zinc-100 hover:underline">{user.displayName}</span>
              {user.isVerified && (
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-blue-400" fill="currentColor">
                  <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
                </svg>
              )}
            </div>
            <div className="text-sm text-zinc-500">@{user.handle}</div>
          </button>
          {action}
        </div>
        {user.bio && (
          <p className="mt-1 text-sm text-zinc-300">{user.bio}</p>
        )}
      </div>
    </div>
  );
}

// Legacy exports for backward compatibility
export type { ProfileViewModel as LegacyProfileViewModel };

export function ProfileLayout(props: {
  profile: ProfileViewModel;
  headerActions?: ReactNode;
  main: ReactNode;
  aside?: ReactNode;
}) {
  const cover = `linear-gradient(135deg, ${props.profile.coverGradient[0]}aa, ${props.profile.coverGradient[1]}55)`;
  const avatar = `linear-gradient(135deg, ${props.profile.avatarGradient[0]}, ${props.profile.avatarGradient[1]})`;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        <div className="relative h-32 w-full" style={{ background: cover }}>
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#050505]/60 to-transparent" />
        </div>

        <div className="-mt-12 px-6 pb-5">
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div
                className="grid h-20 w-20 shrink-0 place-items-center rounded-full text-lg font-bold text-white ring-4 ring-[#050505] shadow-xl"
                style={{ background: avatar }}
              >
                {props.profile.avatarText}
              </div>
              <div className="min-w-0 pb-1">
                <div className="truncate text-lg font-semibold text-zinc-100">
                  {props.profile.displayName}
                </div>
                {props.profile.handle && (
                  <div className="mt-1 truncate text-sm text-zinc-500">@{props.profile.handle}</div>
                )}
              </div>
            </div>
            {props.headerActions}
          </div>
        </div>
      </section>

      <div className={cn("grid gap-4", props.aside ? "lg:grid-cols-[1fr_320px]" : "grid-cols-1")}>
        <div className="min-w-0">{props.main}</div>
        {props.aside && <div className="min-w-0">{props.aside}</div>}
      </div>
    </div>
  );
}

// Re-export components used by other pages
export { TwitterProfileHeader as ProfileHeader };

// Helper components that may be needed
export function ProfileSection(props: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {props.icon && (
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-400">
              {props.icon}
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">{props.title}</h3>
            {props.subtitle && <p className="mt-0.5 text-xs text-zinc-500">{props.subtitle}</p>}
          </div>
        </div>
        {props.action}
      </div>
      <div className="mt-4">{props.children}</div>
    </section>
  );
}

export function ProfileStatCard(props: {
  label: string;
  value: string | number;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{props.label}</div>
        {props.icon && <span className="text-zinc-500">{props.icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-bold text-zinc-100">
        {typeof props.value === "number" ? props.value.toLocaleString("tr-TR") : props.value}
      </div>
    </div>
  );
}

export function UserCard(props: {
  user: {
    id: string;
    displayName: string;
    handle: string;
    avatarGradient: [string, string];
    isOnline?: boolean;
  };
  action?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <ProfileUserItem
      user={{
        displayName: props.user.displayName,
        handle: props.user.handle,
        avatarGradient: props.user.avatarGradient,
      }}
      action={props.action}
      onClick={props.onClick}
    />
  );
}
