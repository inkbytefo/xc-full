import { useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { invoke } from '@tauri-apps/api/core';
import { useGameDetection } from '../hooks/useGameDetection';
import { useVoiceStore } from '../../../store/voiceStore';
import { useWidgetStore } from '../stores/widgetStore';
import {
    ServerIcon,
    FriendsIcon,
    ChatIcon,
    VideoIcon,
    SettingsIcon,
    CloseIcon,
    MicIcon,
    MicOffIcon,
    HeadphonesIcon,
    DeafenIcon
} from '../../../components/icons';

interface ActionBarProps {
    onSettingsClick?: () => void;
}

export function ActionBar({ onSettingsClick }: ActionBarProps) {
    const { runningGame } = useGameDetection();
    const { isMuted, isDeafened, toggleMute, toggleDeafen } = useVoiceStore();
    const { widgets, toggleWidget } = useWidgetStore();

    // UI State
    const [currentTime, setCurrentTime] = useState(new Date());
    const [position, setPosition] = useState({
        x: (window.innerWidth / 2) - 380,
        y: 20
    });
    const [isDragging, setIsDragging] = useState(false);

    // Update clock every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleMinimize = async () => {
        await invoke('toggle_overlay');
    };

    const isWidgetOpen = (id: string) => widgets[id]?.isOpen ?? false;

    // Helper for Control Buttons
    const ControlBtn = ({ id, icon: Icon, label }: {
        id: string;
        icon: (props: { className?: string }) => React.ReactElement;
        label: string;
    }) => {
        const isActive = isWidgetOpen(id);

        return (
            <button
                type="button"
                onClick={() => toggleWidget(id)}
                aria-pressed={isActive}
                className={[
                    'group relative flex flex-col items-center justify-center',
                    'h-[54px] w-[64px] rounded-[16px]',
                    'transition-all duration-200 ease-out',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
                    isActive
                        ? 'bg-emerald-500/12 text-emerald-200 border border-emerald-400/25 shadow-[0_10px_28px_rgba(16,185,129,0.12)]'
                        : 'bg-white/[0.02] text-zinc-300 border border-white/5 hover:bg-white/[0.05] hover:text-white hover:border-white/10'
                ].join(' ')}
                title={label}
            >
                <Icon className={['h-5 w-5 transition-transform duration-200', isActive ? 'scale-[1.06]' : 'group-hover:scale-[1.08]'].join(' ')} />
                <span className={['mt-1 text-[10px] font-semibold tracking-wide', isActive ? 'text-emerald-200/90' : 'text-zinc-400 group-hover:text-zinc-200'].join(' ')}>
                    {label}
                </span>
                {isActive && (
                    <div className="absolute -bottom-1 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.55)]" />
                )}
            </button>
        );
    };

    return (
        <Rnd
            position={position}
            onDragStart={() => setIsDragging(true)}
            onDragStop={(_, d) => {
                setIsDragging(false);
                setPosition({ x: d.x, y: d.y });
            }}
            dragHandleClassName="dock-handle"
            bounds=".overlay-app"
            enableResizing={false}
            style={{ zIndex: 9999, transition: isDragging ? 'none' : 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
            <div className={`
                relative flex items-center gap-2 h-[70px] w-[760px] p-2 rounded-[22px]
                bg-[linear-gradient(180deg,rgba(22,22,26,0.88),rgba(10,10,12,0.72))]
                backdrop-blur-[52px] border border-white/10 shadow-[0_18px_70px_rgba(0,0,0,0.74)]
                transition-all duration-300 ease-out
                ${isDragging ? 'scale-[0.985] border-white/20 shadow-[0_14px_50px_rgba(0,0,0,0.70)]' : 'hover:border-white/15'}
            `}>

                {/* SECTION 1: BRANDING & TIME */}
                <div className="dock-handle flex items-center gap-4 px-4 h-[54px] rounded-[18px] bg-white/[0.03] border border-white/[0.08] cursor-grab active:cursor-grabbing">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[14px] bg-[radial-gradient(circle_at_30%_20%,rgba(52,211,153,0.35),transparent_55%),linear-gradient(180deg,rgba(16,185,129,0.40),rgba(16,185,129,0.14))] border border-emerald-300/20 flex items-center justify-center shadow-[0_10px_30px_rgba(16,185,129,0.12)]">
                            <span className="text-[11px] font-black text-white leading-none tracking-tight">Pink</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-extrabold text-zinc-100 tracking-tight leading-none tabular-nums">
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[10px] font-semibold text-zinc-500 tracking-wide leading-none mt-1 max-w-[220px] truncate">
                                {runningGame ?? 'Dashboard'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* STYLISH DIVIDER */}
                <div className="w-px h-9 bg-gradient-to-b from-transparent via-white/[0.12] to-transparent mx-1" />

                {/* SECTION 2: CONTENT WIDGETS */}
                <div className="flex items-center gap-1.5 p-1 rounded-[18px] bg-white/[0.02] border border-white/[0.08]">
                    <ControlBtn id="server" icon={ServerIcon} label="Sunucu" />
                    <ControlBtn id="friends" icon={FriendsIcon} label="Kişiler" />
                    <ControlBtn id="dmList" icon={ChatIcon} label="Sohbet" />
                    <ControlBtn id="video" icon={VideoIcon} label="Video" />
                </div>

                {/* SECTION 3: SYSTEM UTILS */}
                <div className="flex items-center gap-2 p-1 rounded-[18px] bg-white/[0.02] border border-white/[0.08] ml-1">
                    <div className="flex items-center gap-1.5 bg-black/30 p-1.5 rounded-[14px] border border-white/[0.08]">
                        <button
                            type="button"
                            onClick={toggleMute}
                            aria-pressed={isMuted}
                            className={[
                                'w-10 h-10 rounded-[12px] flex items-center justify-center transition-all duration-200',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
                                isMuted
                                    ? 'text-rose-300 bg-rose-500/12 border border-rose-400/20 shadow-[0_10px_22px_rgba(244,63,94,0.12)]'
                                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                            ].join(' ')}
                            title="Mikrofon"
                        >
                            {isMuted ? <MicOffIcon className="w-5 h-5" /> : <MicIcon className="w-5 h-5" />}
                        </button>
                        <button
                            type="button"
                            onClick={toggleDeafen}
                            aria-pressed={isDeafened}
                            className={[
                                'w-10 h-10 rounded-[12px] flex items-center justify-center transition-all duration-200',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
                                isDeafened
                                    ? 'text-rose-300 bg-rose-500/12 border border-rose-400/20 shadow-[0_10px_22px_rgba(244,63,94,0.12)]'
                                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                            ].join(' ')}
                            title="Kulaklık"
                        >
                            {isDeafened ? <DeafenIcon className="w-5 h-5" /> : <HeadphonesIcon className="w-5 h-5" />}
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={onSettingsClick}
                        className="group relative flex items-center justify-center w-11 h-11 rounded-[16px] transition-all duration-200 text-zinc-300 bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.05] hover:text-white hover:border-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                        title="Overlay Ayarları"
                    >
                        <SettingsIcon className="w-5 h-5 transition-transform duration-200 group-hover:rotate-45" />
                    </button>
                </div>

                {/* SECTION 4: CLOSE */}
                <div className="ml-2 pr-2">
                    <button
                        type="button"
                        onClick={handleMinimize}
                        className="w-11 h-11 rounded-[16px] flex items-center justify-center text-zinc-400 bg-white/[0.01] border border-white/0 hover:text-rose-300 hover:bg-rose-500/10 hover:border-rose-400/20 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                        title="Oyuna Dön"
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* PREMIUM GLOW HIGHLIGHT */}
                <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/[0.18] to-transparent pointer-events-none" />
                <div className="absolute inset-0 rounded-[22px] pointer-events-none shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" />
            </div>
        </Rnd>
    );
}
