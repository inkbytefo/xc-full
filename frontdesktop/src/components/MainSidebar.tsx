import { useState, useMemo, useEffect } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NotificationsModal } from "../features/notifications/NotificationsModal";
import { getUnreadCount } from "../features/notifications/notificationsApi";

type NavKey = "feed" | "dm" | "servers" | "live" | "settings" | "notifications" | "profile";

type NavItem = {
  key: NavKey;
  label: string;
  icon: ReactNode;
  path: string;
};

function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function IconDM() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M4 6.8A2.8 2.8 0 0 1 6.8 4h10.4A2.8 2.8 0 0 1 20 6.8v7.7A2.8 2.8 0 0 1 17.2 17H10l-4.5 3v-3H6.8A2.8 2.8 0 0 1 4 14.5V6.8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 9.2h9M7.5 12h6.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconServers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M7 7.5h10M7 16.5h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6.2 5h11.6A2.2 2.2 0 0 1 20 7.2v1.6A2.2 2.2 0 0 1 17.8 11H6.2A2.2 2.2 0 0 1 4 8.8V7.2A2.2 2.2 0 0 1 6.2 5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M6.2 13h11.6A2.2 2.2 0 0 1 20 15.2v1.6A2.2 2.2 0 0 1 17.8 19H6.2A2.2 2.2 0 0 1 4 16.8v-1.6A2.2 2.2 0 0 1 6.2 13Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M7.2 8h.01M7.2 16h.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconLive() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M7 9.2a3.5 3.5 0 0 0 0 5.6M17 9.2a3.5 3.5 0 0 1 0 5.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9.5 11a2 2 0 0 0 0 2.9M14.5 11a2 2 0 0 1 0 2.9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 8.25v7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 17.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19 12a7.1 7.1 0 0 0-.08-1l2.05-1.58-2-3.46-2.49.78a7.2 7.2 0 0 0-1.72-1L14 3h-4l-.76 2.74a7.2 7.2 0 0 0-1.72 1l-2.49-.78-2 3.46L5.08 11A7.1 7.1 0 0 0 5 12c0 .34.02.68.08 1l-2.05 1.58 2 3.46 2.49-.78c.53.4 1.1.74 1.72 1L10 21h4l.76-2.74c.62-.26 1.19-.6 1.72-1l2.49.78 2-3.46L18.92 13c.06-.32.08-.66.08-1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconNotifications() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 21a2.2 2.2 0 0 0 2.1-1.6H9.9A2.2 2.2 0 0 0 12 21Z"
        fill="currentColor"
      />
      <path
        d="M18 16.5H6c1.1-1.2 1.6-2.5 1.6-4.2V10.7a4.4 4.4 0 0 1 8.8 0v1.6c0 1.7.5 3 1.6 4.2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Tooltip({ label }: { label: string }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 translate-x-1 opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100"
    >
      <div className="relative">
        <div className="rounded-md bg-black/90 px-2 py-1 text-xs font-medium text-white shadow-lg">
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
      <Tooltip label={item.label} />
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
  dm: "/dms",
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
      { key: "dm", label: "DM", icon: <IconDM />, path: "/dm" },
      { key: "servers", label: "Servers", icon: <IconServers />, path: "/servers" },
      { key: "live", label: "Live", icon: <IconLive />, path: "/live" },
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

  return (
    <>
      <nav
        aria-label="Ana navigasyon"
        className="fixed left-0 top-0 z-20 flex h-screen w-[72px] flex-col items-center border-r border-white/5 bg-[#050505]/60 py-3 backdrop-blur-md"
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
              <div className="text-sm font-semibold tracking-wide text-white">XC</div>
            </button>
            <Tooltip label="Ana Sayfa" />
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
              <IconNotifications />
              {unreadCount > 0 && (
                <div className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </div>
              )}
            </button>
            <Tooltip label="Bildirimler" />
          </div>

          {/* Settings */}
          <NavIcon
            item={{ key: "settings", label: "Ayarlar", icon: <IconSettings />, path: "/settings" }}
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
              <div className="text-[13px] font-semibold text-white/90">TP</div>
            </button>
            <Tooltip label="Profil" />
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
