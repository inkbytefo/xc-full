import { SettingsIcon } from "./Icons";

interface User {
    id: string;
    displayName?: string;
    avatarGradient?: [string, string];
}

interface UserPanelProps {
    user: User | null;
}

export function UserPanel({
    user,
}: UserPanelProps) {
    return (
        <div className="border-t border-white/10">

            {/* User Info */}
            <div className="p-2 bg-[#050505]/80 backdrop-blur-xl">
                <div className="flex items-center gap-2 p-2 rounded-md hover:bg-white/5">
                    <div
                        className="w-8 h-8 rounded-full"
                        style={{
                            backgroundImage:
                                user?.avatarGradient && user.avatarGradient.length === 2
                                    ? `linear-gradient(135deg, ${user.avatarGradient[0]}, ${user.avatarGradient[1]})`
                                    : "linear-gradient(135deg, #333, #666)",
                        }}
                    />
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-100 truncate">
                            {user?.displayName}
                        </div>
                        <div className="text-xs text-green-400">Online</div>
                    </div>
                    <button className="p-1.5 rounded hover:bg-white/10 text-zinc-400">
                        <SettingsIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
