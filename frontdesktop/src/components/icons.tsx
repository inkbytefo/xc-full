import React from 'react';

export const IconWrapper = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {children}
    </svg>
);

export const ServerIcon = ({ className = "w-6 h-6" }) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></IconWrapper>;
export const FriendsIcon = ({ className = "w-6 h-6" }) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></IconWrapper>;
export const ChatIcon = ({ className = "w-6 h-6" }) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></IconWrapper>;
export const VoiceIcon = ({ className = "w-6 h-6" }) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></IconWrapper>;
export const VideoIcon = ({ className = "w-6 h-6" }) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></IconWrapper>;
export const SettingsIcon = ({ className = "w-5 h-5" }) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></IconWrapper>;
export const CloseIcon = ({ className = "w-5 h-5" }) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></IconWrapper>;
export const MicIcon = ({ className = "w-5 h-5" }) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></IconWrapper>;
export const MicOffIcon = ({ className = "w-5 h-5" }) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></IconWrapper>;
export const HeadphonesIcon = ({ className = "w-5 h-5" }) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 18v-6a9 9 0 0118 0v6" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3v5zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3v5z" /></IconWrapper>;
export const DeafenIcon = ({ className = "w-5 h-5" }) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 18v-6a9 9 0 0118 0v6" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3v5zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3v5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></IconWrapper>;
export const MenuIcon = ({ className = "w-5 h-5" }) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></IconWrapper>;
export const ChevronDownIcon = ({ className = "w-5 h-5" }) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></IconWrapper>;
export const ChevronLeftIcon = ({ className = "w-5 h-5" }) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></IconWrapper>;

// Additional icons for media controls
export const VolumeIcon = ({ className = "w-5 h-5", strokeWidth = 2 }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
);

export const VideoOffIcon = ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
    </svg>
);

export const HeadphonesOffIcon = ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 18v-6a9 9 0 0118 0v6" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3v5zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3v5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
    </svg>
);

export const ScreenShareIcon = ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

export const PhoneOffIcon = ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
    </svg>
);

export const DMIcon = ({ className = "w-5 h-5" }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor">
        <path d="M4 6.8A2.8 2.8 0 0 1 6.8 4h10.4A2.8 2.8 0 0 1 20 6.8v7.7A2.8 2.8 0 0 1 17.2 17H10l-4.5 3v-3H6.8A2.8 2.8 0 0 1 4 14.5V6.8Z" strokeWidth="2" strokeLinejoin="round" />
        <path d="M7.5 9.2h9M7.5 12h6.2" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

export const ServersNavIcon = ({ className = "w-5 h-5" }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor">
        <path d="M7 7.5h10M7 16.5h10" strokeWidth="2" strokeLinecap="round" />
        <path d="M6.2 5h11.6A2.2 2.2 0 0 1 20 7.2v1.6A2.2 2.2 0 0 1 17.8 11H6.2A2.2 2.2 0 0 1 4 8.8V7.2A2.2 2.2 0 0 1 6.2 5Z" strokeWidth="2" strokeLinejoin="round" />
        <path d="M6.2 13h11.6A2.2 2.2 0 0 1 20 15.2v1.6A2.2 2.2 0 0 1 17.8 19H6.2A2.2 2.2 0 0 1 4 16.8v-1.6A2.2 2.2 0 0 1 6.2 13Z" strokeWidth="2" strokeLinejoin="round" />
        <path d="M7.2 8h.01M7.2 16h.01" strokeWidth="3" strokeLinecap="round" />
    </svg>
);

export const LiveIcon = ({ className = "w-5 h-5" }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M7 9.2a3.5 3.5 0 0 0 0 5.6M17 9.2a3.5 3.5 0 0 1 0 5.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M9.5 11a2 2 0 0 0 0 2.9M14.5 11a2 2 0 0 1 0 2.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 8.25v7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 17.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z" fill="currentColor" />
    </svg>
);

export const NotificationsIcon = ({ className = "w-5 h-5" }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 21a2.2 2.2 0 0 0 2.1-1.6H9.9A2.2 2.2 0 0 0 12 21Z" fill="currentColor" />
        <path d="M18 16.5H6c1.1-1.2 1.6-2.5 1.6-4.2V10.7a4.4 4.4 0 0 1 8.8 0v1.6c0 1.7.5 3 1.6 4.2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
);

// Reusable Control Button Component
interface ControlButtonProps {
    active?: boolean;
    danger?: boolean;
    disabled?: boolean;
    onClick?: () => void;
    title?: string;
    size?: "sm" | "md" | "lg";
    children: React.ReactNode;
    className?: string;
}

export function ControlButton({
    active,
    danger,
    disabled,
    onClick,
    title,
    size = "md",
    children,
    className = "",
}: ControlButtonProps) {
    const sizeClasses = {
        sm: "p-2",
        md: "p-3",
        lg: "p-4",
    };

    const iconSizeClasses = {
        sm: "[&>svg]:w-4 [&>svg]:h-4",
        md: "[&>svg]:w-5 [&>svg]:h-5",
        lg: "[&>svg]:w-6 [&>svg]:h-6",
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`
                ${sizeClasses[size]}
                ${iconSizeClasses[size]}
                rounded-xl transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                active:scale-95
                ${danger
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
                    : active
                        ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                        : "bg-white/10 hover:bg-white/20 text-white"
                }
                ${className}
            `}
        >
            {children}
        </button>
    );
}
