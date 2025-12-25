import { useState } from 'react';
import type { Server, Channel } from '../../../../api/types';
import type { VoiceChannel } from '../../../voice/voiceApi';

// SVG Icons
const HashIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
    </svg>
);

const VolumeIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
);

const ChevronDownIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

interface ChannelSidebarProps {
    server: Server | undefined;
    channels: Channel[];
    selectedChannelId: string | null;
    onChannelSelect: (channelId: string) => void;
    voiceChannels: VoiceChannel[];
    activeVoiceChannelId?: string | null;
    onVoiceChannelJoin: (channel: VoiceChannel) => void;
}

export function ChannelSidebar({
    server,
    channels,
    selectedChannelId,
    onChannelSelect,
    voiceChannels,
    activeVoiceChannelId,
    onVoiceChannelJoin,
}: ChannelSidebarProps) {
    const [channelListOpen, setChannelListOpen] = useState(true);
    const textChannels = channels.filter(c => c.type === 'text');

    return (
        <div style={{
            width: 160,
            background: 'rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid rgba(255,255,255,0.05)'
        }}>
            {/* Server Header */}
            <div style={{
                padding: '12px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.9)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {server?.name || 'Sunucu'}
                </div>
                <ChevronDownIcon className="w-3 h-3 text-zinc-400" />
            </div>

            {/* Channels */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
                {/* Text Channels */}
                {textChannels.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                        <div
                            onClick={() => setChannelListOpen(!channelListOpen)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 8px',
                                fontSize: 11,
                                fontWeight: 600,
                                color: 'rgba(255,255,255,0.4)',
                                textTransform: 'uppercase',
                                cursor: 'pointer'
                            }}
                        >
                            <span style={{
                                display: 'inline-flex',
                                transform: channelListOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                                transition: 'transform 0.15s ease'
                            }}>
                                <ChevronDownIcon className="w-2.5 h-2.5" />
                            </span>
                            Metin Kanalları
                        </div>

                        {channelListOpen && textChannels.map(c => {
                            const isSelected = selectedChannelId === c.id;
                            return (
                                <div
                                    key={c.id}
                                    onClick={() => onChannelSelect(c.id)}
                                    style={{
                                        padding: '6px 10px',
                                        marginBottom: 2,
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        background: isSelected ? 'rgba(255,255,255,0.1)' : 'transparent',
                                        color: isSelected ? 'white' : 'rgba(255,255,255,0.5)',
                                        fontSize: 13,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <HashIcon className="w-4 h-4 opacity-60" />
                                    <span style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {c.name}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Voice Channels */}
                {voiceChannels.length > 0 && (
                    <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 8px',
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'rgba(255,255,255,0.4)',
                            textTransform: 'uppercase'
                        }}>
                            <ChevronDownIcon className="w-2.5 h-2.5" />
                            Ses Kanalları
                        </div>

                        {voiceChannels.map((c) => {
                            const isActive = activeVoiceChannelId === c.id;
                            const limitLabel = c.userLimit > 0 ? `${c.participantCount}/${c.userLimit}` : `${c.participantCount}`;

                            return (
                                <div
                                    key={c.id}
                                    onClick={() => onVoiceChannelJoin(c)}
                                    style={{
                                        padding: '6px 10px',
                                        marginBottom: 2,
                                        borderRadius: 6,
                                        color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
                                        background: isActive ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
                                        fontSize: 13,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <VolumeIcon className="w-4 h-4 opacity-60" />
                                    <span style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        flex: 1,
                                        minWidth: 0,
                                    }}>
                                        {c.name}
                                    </span>
                                    <span style={{
                                        fontSize: 11,
                                        color: isActive ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
                                        flexShrink: 0,
                                    }}>
                                        {limitLabel}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
