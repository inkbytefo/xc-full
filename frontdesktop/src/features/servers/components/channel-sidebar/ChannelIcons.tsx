import { HashIcon, VolumeIcon, VideoIcon, StageIcon } from "../Icons";

export function MegaphoneIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
            />
        </svg>
    );
}

export function HybridIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
            <circle cx="18" cy="6" r="3" strokeWidth={2} />
        </svg>
    );
}

export function DragHandleIcon() {
    return (
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
            <circle cx="2" cy="2" r="1.5" />
            <circle cx="8" cy="2" r="1.5" />
            <circle cx="2" cy="8" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="2" cy="14" r="1.5" />
            <circle cx="8" cy="14" r="1.5" />
        </svg>
    );
}

export function getChannelIcon(type: string, className: string = "w-4 h-4 opacity-70 shrink-0") {
    switch (type) {
        case "announcement":
            return <MegaphoneIcon className={`${className} text-yellow-500/80`} />;
        case "voice":
            return <VolumeIcon className={className} />;
        case "video":
            return <VideoIcon className={className} />;
        case "stage":
            return <StageIcon className={className} />;
        case "hybrid":
            return <HybridIcon className={`${className} text-purple-400/80`} />;
        case "text":
        default:
            return <HashIcon className={className} />;
    }
}
