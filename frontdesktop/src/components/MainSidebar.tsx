import { useState, useMemo, useEffect } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NotificationsModal } from "../features/notifications/NotificationsModal";
import { getUnreadCount } from "../features/notifications/notificationsApi";
import { cn } from "../lib/utils";
import { useAuthStore } from "../store/authStore";
import {
  DMIcon,
  ServersNavIcon,
  LiveIcon,
  SettingsIcon,
  NotificationsIcon
} from "./icons";

type NavKey = "feed" | "dm" | "servers" | "live" | "settings" | "notifications" | "profile";

type NavItem = {
  key: NavKey;
  label: string;
  icon: ReactNode;
  path: string;
};

// Extracted Tooltip component (could be moved to separate file if needed)
function SidebarTooltip({ label }: { label: string }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 translate-x-1 opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100 z-50"
    >
      <div className="relative">
        <div className="rounded-md bg-black/90 px-2 py-1 text-xs font-medium text-white shadow-lg whitespace-nowrap">
          {label}
        </div>
        <div className="absolute left-[-6px] top-1/2 h-0 w-0 -translate-y-1/2 border-y-[6px] border-y-transparent border-r-[6px] border-r-black/90" />
      </div>
    </div>
  );
}

function NavIcon({
  item,
  isActive,
  onActivate,
}: {
  item: NavItem;
  isActive: boolean;
  onActivate: (key: NavKey) => void;
}) {
  return (
    <div className="group relative flex h-[48px] w-[48px] items-center justify-center">
      <div
        className={cn(
          "absolute -left-[14px] w-1 rounded-r bg-white transition-all duration-300",
          isActive
            ? "h-10 opacity-100"
            : "h-2 opacity-0 group-hover:h-6 group-hover:opacity-100",
        )}
        aria-hidden="true"
      />
      <button
        type="button"
        aria-label={item.label}
        aria-current={isActive ? "page" : undefined}
        onClick={() => onActivate(item.key)}
        className={cn(
          "relative h-full w-full cursor-pointer select-none transition-all duration-300",
          "grid place-items-center text-zinc-200 hover:text-white",
          isActive ? "rounded-[16px]" : "rounded-[24px] hover:rounded-[16px]",
          isActive
            ? "bg-gradient-to-br from-[var(--velvet-2)] to-[var(--velvet)] shadow-[0_10px_30px_rgba(148,70,91,0.25)]"
            : "bg-stone-800/40 hover:bg-[var(--velvet)]/70",
        )}
      >
        <span className={cn("transition-transform duration-300", isActive && "scale-[1.02]")}>
          {item.icon}
        </span>
      </button>
      <SidebarTooltip label={item.label} />
    </div>
  );
}

/**
 * Determines the active nav key based on the current pathname.
 */
function getActiveKeyFromPath(pathname: string): NavKey {
  if (pathname.startsWith("/feed")) return "feed";
  if (pathname.startsWith("/dms")) return "dm";
  if (pathname.startsWith("/servers")) return "servers";
  if (pathname.startsWith("/live")) return "live";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/profile")) return "profile";
  return "feed";
}

/**
 * Maps nav keys to their corresponding routes.
 */
const NAV_PATHS: Record<NavKey, string> = {
  feed: "/feed",
  dm: "/dms", // Fixed: Matches router path
  servers: "/servers",
  live: "/live",
  notifications: "/notifications",
  settings: "/settings",
  profile: "/profile",
};

export function MainSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const user = useAuthStore((s) => s.user);

  // Fetch unread count on mount and periodically
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const count = await getUnreadCount();
        setUnreadCount(count);
      } catch {
        // Ignore errors
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Reset unread count when modal opens
  useEffect(() => {
    if (isNotificationsOpen) {
      setUnreadCount(0);
    }
  }, [isNotificationsOpen]);

  const active = useMemo(() => getActiveKeyFromPath(location.pathname), [location.pathname]);

  const topItems = useMemo<NavItem[]>(
    () => [
      { key: "dm", label: "DM", icon: <DMIcon />, path: "/dms" },
      { key: "servers", label: "Servers", icon: <ServersNavIcon />, path: "/servers" },
      { key: "live", label: "Live", icon: <LiveIcon />, path: "/live" },
    ],
    [],
  );

  const handleNavChange = (key: NavKey) => {
    if (key === "notifications") {
      setIsNotificationsOpen(true);
    } else {
      navigate(NAV_PATHS[key]);
    }
  };

  // Helper for profile initials
  const getInitials = (displayName?: string) => {
    if (!displayName) return "??";
    return displayName.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <nav
        aria-label="Ana navigasyon"
        className="fixed left-0 top-0 z-20 flex h-screen w-[72px] flex-col items-center border-r border-white/5 bg-[#050505]/45 py-3 backdrop-blur-md"
      >
        <div className="flex w-full flex-col items-center gap-3">
          <div className="group relative flex h-[48px] w-[48px] items-center justify-center">
            <div
              className={cn(
                "absolute -left-[14px] w-1 rounded-r bg-white transition-all duration-300",
                active === "feed" ? "h-10 opacity-100" : "h-2 opacity-0 group-hover:h-6 group-hover:opacity-100",
              )}
              aria-hidden="true"
            />
            <button
              type="button"
              aria-label="Ana Sayfa"
              aria-current={active === "feed" ? "page" : undefined}
              onClick={() => navigate("/feed")}
              className={cn(
                "relative h-[44px] w-[44px] cursor-pointer select-none transition-all duration-300",
                "grid place-items-center text-zinc-200 hover:text-white",
                active === "feed" ? "rounded-[16px]" : "rounded-[24px] hover:rounded-[16px]",
                active === "feed"
                  ? "bg-gradient-to-br from-[var(--velvet-2)] to-[var(--velvet)] shadow-[0_10px_30px_rgba(148,70,91,0.25)]"
                  : "bg-white/5 hover:bg-[var(--velvet)]/70",
                "shadow-[0_12px_30px_rgba(0,0,0,0.35)]",
              )}
            >
              <div className="text-sm font-semibold tracking-wide text-white">Pink</div>
            </button>
            <SidebarTooltip label="Ana Sayfa" />
          </div>
          <div className="h-px w-10 bg-white/10" />
          {topItems.map((item) => (
            <NavIcon
              key={item.key}
              item={item}
              isActive={active === item.key}
              onActivate={handleNavChange}
            />
          ))}
        </div>

        <div className="flex w-full flex-1 flex-col items-center justify-end gap-3 pb-2">
          <div className="h-px w-10 bg-white/10" />

          {/* Notifications Button */}
          <div className="group relative flex h-[48px] w-[48px] items-center justify-center">
            <button
              type="button"
              aria-label="Bildirimler"
              onClick={() => setIsNotificationsOpen(true)}
              className="relative h-full w-full cursor-pointer select-none transition-all duration-300 grid place-items-center text-zinc-200 hover:text-white rounded-[24px] hover:rounded-[16px] bg-stone-800/40 hover:bg-[var(--velvet)]/70"
            >
              <NotificationsIcon />
              {unreadCount > 0 && (
                <div className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </div>
              )}
            </button>
            <SidebarTooltip label="Bildirimler" />
          </div>

          {/* Settings */}
          <NavIcon
            item={{ key: "settings", label: "Ayarlar", icon: <SettingsIcon className="w-5 h-5" />, path: "/settings" }}
            isActive={active === "settings"}
            onActivate={handleNavChange}
          />

          {/* Profile */}
          <div className="group relative flex h-[48px] w-[48px] items-center justify-center">
            <div
              className={cn(
                "absolute -left-[14px] w-1 rounded-r bg-white transition-all duration-300",
                active === "profile"
                  ? "h-10 opacity-100"
                  : "h-2 opacity-0 group-hover:h-6 group-hover:opacity-100",
              )}
              aria-hidden="true"
            />
            <button
              type="button"
              aria-label="Profil"
              aria-current={active === "profile" ? "page" : undefined}
              onClick={() => navigate("/profile")}
              className={cn(
                "relative h-[44px] w-[44px] cursor-pointer select-none transition-all duration-300",
                "grid place-items-center text-zinc-200 hover:text-white",
                active === "profile" ? "rounded-[16px]" : "rounded-full hover:rounded-[16px]",
                active === "profile"
                  ? "bg-gradient-to-br from-[var(--velvet-2)] to-[var(--velvet)] shadow-[0_10px_30px_rgba(148,70,91,0.25)]"
                  : "bg-gradient-to-br from-white/15 to-white/5",
                "ring-1 ring-white/10 shadow-[0_12px_30px_rgba(0,0,0,0.35)]",
              )}
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full rounded-[inherit] object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center rounded-[inherit]"
                  style={{
                    backgroundImage: user?.avatarGradient
                      ? `linear-gradient(135deg, ${user.avatarGradient[0]}, ${user.avatarGradient[1]})`
                      : undefined
                  }}
                >
                  <span className="text-[13px] font-semibold text-white/90">
                    {getInitials(user?.displayName)}
                  </span>
                </div>
              )}
            </button>
            <SidebarTooltip label="Profil" />
          </div>
        </div>
      </nav>

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </>
  );
}
