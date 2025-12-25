import type { Server } from "../../../api/types";
import {
    ChevronDownIcon,
    BuildingIcon,
    UsersIcon,
    PlusIcon,
    SettingsIcon,
    LogoutIcon,
} from "./Icons";

// Additional icons for moderator features
function ShieldIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
        </svg>
    );
}

function BanIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
        </svg>
    );
}

function InviteIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
        </svg>
    );
}

function RolesIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
        </svg>
    );
}

function LogsIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
        </svg>
    );
}

interface ServerHeaderProps {
    server: Server;
    isOwner: boolean;
    isModerator?: boolean;
    isAdmin?: boolean;
    showMenu: boolean;
    onToggleMenu: () => void;
    onServerProfile: () => void;
    onMembers: () => void;
    onCreateChannel: () => void;
    onSettings: () => void;
    onLeave: () => void;
    // New moderation callbacks
    onInvitePeople?: () => void;
    onManageRoles?: () => void;
    onModeration?: () => void;
    onAuditLog?: () => void;
    onBannedUsers?: () => void;
}

export function ServerHeader({
    server,
    isOwner,
    isModerator = false,
    isAdmin = false,
    showMenu,
    onToggleMenu,
    onServerProfile,
    onMembers,
    onCreateChannel,
    onSettings,
    onLeave,
    onInvitePeople,
    onManageRoles,
    onModeration,
    onAuditLog,
    onBannedUsers,
}: ServerHeaderProps) {
    const canModerate = isOwner || isAdmin || isModerator;
    const canManageServer = isOwner || isAdmin;

    return (
        <div className="p-3 border-b border-white/10 relative">
            <button
                onClick={onToggleMenu}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                        style={{
                            backgroundImage: `linear-gradient(135deg, ${server.iconGradient?.[0] || "#333"}, ${server.iconGradient?.[1] || "#666"})`,
                        }}
                    >
                        {server.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-semibold text-zinc-100 truncate max-w-[120px]">
                            {server.name}
                        </div>
                        <div className="text-xs text-green-400">Online</div>
                    </div>
                </div>
                <ChevronDownIcon
                    className={`w-4 h-4 text-zinc-400 transition-transform ${showMenu ? "rotate-180" : ""}`}
                />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
                <div className="absolute top-full left-0 right-0 mt-1 mx-2 bg-[#1a1a22] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden max-h-[70vh] overflow-y-auto">
                    {/* General Section */}
                    <div className="py-1">
                        <MenuItem icon={<BuildingIcon />} onClick={onServerProfile}>
                            Sunucu Profili
                        </MenuItem>
                        <MenuItem icon={<UsersIcon />} onClick={onMembers}>
                            Üyeler
                        </MenuItem>
                        {onInvitePeople && (
                            <MenuItem icon={<InviteIcon />} onClick={onInvitePeople} highlight>
                                Kişileri Davet Et
                            </MenuItem>
                        )}
                    </div>

                    {/* Moderation Section - For Moderators, Admins, Owners */}
                    {canModerate && (
                        <>
                            <div className="border-t border-white/5" />
                            <div className="py-1">
                                <div className="px-3 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                    Moderasyon
                                </div>
                                {onModeration && (
                                    <MenuItem icon={<ShieldIcon />} onClick={onModeration}>
                                        Moderasyon Paneli
                                    </MenuItem>
                                )}
                                {onBannedUsers && (
                                    <MenuItem icon={<BanIcon />} onClick={onBannedUsers}>
                                        Yasaklı Kullanıcılar
                                    </MenuItem>
                                )}
                            </div>
                        </>
                    )}

                    {/* Management Section - For Admins and Owners */}
                    {canManageServer && (
                        <>
                            <div className="border-t border-white/5" />
                            <div className="py-1">
                                <div className="px-3 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                    Yönetim
                                </div>
                                <MenuItem icon={<PlusIcon />} onClick={onCreateChannel}>
                                    Kanal Oluştur
                                </MenuItem>
                                {onManageRoles && (
                                    <MenuItem icon={<RolesIcon />} onClick={onManageRoles}>
                                        Rol Yönetimi
                                    </MenuItem>
                                )}
                                {onAuditLog && (
                                    <MenuItem icon={<LogsIcon />} onClick={onAuditLog}>
                                        Denetim Günlüğü
                                    </MenuItem>
                                )}
                                <MenuItem icon={<SettingsIcon />} onClick={onSettings}>
                                    Sunucu Ayarları
                                </MenuItem>
                            </div>
                        </>
                    )}

                    {/* Leave Section */}
                    <div className="border-t border-white/5" />
                    <div className="py-1">
                        <MenuItem icon={<LogoutIcon />} onClick={onLeave} danger>
                            Sunucudan Ayrıl
                        </MenuItem>
                    </div>
                </div>
            )}
        </div>
    );
}

// Sub-component
interface MenuItemProps {
    icon: React.ReactNode;
    children: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
    highlight?: boolean;
}

function MenuItem({ icon, children, onClick, danger, highlight }: MenuItemProps) {
    return (
        <button
            onClick={onClick}
            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-3 transition-colors ${danger
                    ? "text-red-400 hover:bg-red-500/10"
                    : highlight
                        ? "text-indigo-400 hover:bg-indigo-500/10"
                        : "text-zinc-300 hover:bg-white/5"
                }`}
        >
            <span className={danger ? "" : highlight ? "text-indigo-400" : "text-zinc-400"}>
                {icon}
            </span>
            {children}
        </button>
    );
}
