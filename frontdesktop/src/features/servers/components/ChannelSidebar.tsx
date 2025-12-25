import { useState } from "react";
import type { Channel } from "../../../api/types";
import type { VoiceChannel } from "../../voice/voiceApi";
import { HashIcon, ChevronDownIcon, VolumeIcon, VideoIcon, StageIcon } from "./Icons";

interface CategoryState {
    information: boolean;
    text: boolean;
    voice: boolean;
}

interface ChannelSidebarProps {
    infoChannels: Channel[];
    textChannels: Channel[];
    voiceChannels: VoiceChannel[];
    selectedChannel: string | null;
    activeVoiceChannelId: string | null;
    isVoiceConnected: boolean;
    isVoiceConnecting: boolean;
    voiceParticipants: Array<{
        sid: string;
        identity: string;
        isSpeaking: boolean;
        isMuted: boolean;
        isLocal: boolean;
    }>;
    channelsLoading: boolean;
    canManageChannels?: boolean;
    onSelectChannel: (channelId: string) => void;
    onVoiceChannelClick: (channelId: string) => void;
    onAddChannel?: () => void;
    onAddVoiceChannel?: () => void;
    onEditChannel?: (channel: Channel) => void;
    onDeleteChannel?: (channel: Channel) => void;
    onEditVoiceChannel?: (channel: VoiceChannel) => void;
    onDeleteVoiceChannel?: (channel: VoiceChannel) => void;
}

export function ChannelSidebar({
    infoChannels,
    textChannels,
    voiceChannels,
    selectedChannel,
    activeVoiceChannelId,
    isVoiceConnected,
    isVoiceConnecting,
    voiceParticipants,
    channelsLoading,
    canManageChannels = false,
    onSelectChannel,
    onVoiceChannelClick,
    onAddChannel,
    onAddVoiceChannel,
    onEditChannel,
    onDeleteChannel,
    onEditVoiceChannel,
    onDeleteVoiceChannel,
}: ChannelSidebarProps) {
    const [categoryStates, setCategoryStates] = useState<CategoryState>({
        information: true,
        text: true,
        voice: true,
    });

    const toggleCategory = (key: keyof CategoryState) => {
        setCategoryStates((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    if (channelsLoading) {
        return (
            <div className="flex justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-2">
            {/* Information Category */}
            {infoChannels.length > 0 && (
                <ChannelCategory
                    title="Information"
                    isOpen={categoryStates.information}
                    onToggle={() => toggleCategory("information")}
                >
                    {infoChannels.map((channel) => (
                        <TextChannelItem
                            key={channel.id}
                            channel={channel}
                            isSelected={selectedChannel === channel.id}
                            onClick={() => onSelectChannel(channel.id)}
                        />
                    ))}
                </ChannelCategory>
            )}

            {/* Text Channels Category */}
            <ChannelCategory
                title="Text Channels"
                isOpen={categoryStates.text}
                onToggle={() => toggleCategory("text")}
                showAddButton={canManageChannels}
                onAdd={onAddChannel}
            >
                {textChannels.map((channel) => (
                    <TextChannelItem
                        key={channel.id}
                        channel={channel}
                        isSelected={selectedChannel === channel.id}
                        canManage={canManageChannels}
                        onClick={() => onSelectChannel(channel.id)}
                        onEdit={() => onEditChannel?.(channel)}
                        onDelete={() => onDeleteChannel?.(channel)}
                    />
                ))}
            </ChannelCategory>

            {/* Voice Rooms Category */}
            <ChannelCategory
                title="Voice Rooms"
                isOpen={categoryStates.voice}
                onToggle={() => toggleCategory("voice")}
                showAddButton={canManageChannels}
                onAdd={onAddVoiceChannel}
            >
                {voiceChannels.map((channel) => {
                    const isActiveVoice = activeVoiceChannelId === channel.id && isVoiceConnected;
                    const isConnecting = activeVoiceChannelId === channel.id && isVoiceConnecting;

                    return (
                        <VoiceChannelItem
                            key={channel.id}
                            channel={channel}
                            isActive={isActiveVoice}
                            isConnecting={isConnecting}
                            participants={isActiveVoice ? voiceParticipants : []}
                            canManage={canManageChannels}
                            onClick={() => onVoiceChannelClick(channel.id)}
                            onEdit={() => onEditVoiceChannel?.(channel)}
                            onDelete={() => onDeleteVoiceChannel?.(channel)}
                        />
                    );
                })}
            </ChannelCategory>
        </div>
    );
}

// Sub-components

interface ChannelCategoryProps {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    showAddButton?: boolean;
    onAdd?: () => void;
}

function ChannelCategory({ title, isOpen, onToggle, children, showAddButton, onAdd }: ChannelCategoryProps) {
    return (
        <div className="mb-2">
            <div className="w-full flex items-center gap-1 px-1 py-1">
                <button
                    onClick={onToggle}
                    className="flex items-center gap-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors"
                >
                    <ChevronDownIcon
                        className={`w-3 h-3 transition-transform ${isOpen ? "" : "-rotate-90"}`}
                    />
                    {title}
                </button>
                {showAddButton && onAdd && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onAdd();
                        }}
                        className="ml-auto text-zinc-600 hover:text-zinc-300 hover:bg-white/10 rounded p-0.5 transition-colors"
                        title={`${title} ekle`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                )}
            </div>
            {isOpen && children}
        </div>
    );
}

interface TextChannelItemProps {
    channel: Channel;
    isSelected: boolean;
    canManage?: boolean;
    onClick: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

function TextChannelItem({ channel, isSelected, canManage, onClick, onEdit, onDelete }: TextChannelItemProps) {
    return (
        <div
            className={`w-full px-2 py-1.5 rounded-md flex items-center gap-2 group transition-colors ${isSelected
                ? "bg-white/10 text-zinc-100"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
        >
            <button
                onClick={onClick}
                className="flex-1 flex items-center gap-2 text-left"
            >
                <HashIcon className="w-4 h-4 opacity-70 shrink-0" />
                <span className="truncate text-sm">{channel.name}</span>
            </button>
            {canManage && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                        className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300"
                        title="Düzenle"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                        className="p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400"
                        title="Sil"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}

interface VoiceChannelItemProps {
    channel: VoiceChannel;
    isActive: boolean;
    isConnecting: boolean;
    participants: Array<{
        sid: string;
        identity: string;
        isSpeaking: boolean;
        isMuted: boolean;
        isLocal: boolean;
    }>;
    canManage?: boolean;
    onClick: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

function VoiceChannelItem({
    channel,
    isActive,
    isConnecting,
    participants,
    canManage,
    onClick,
    onEdit,
    onDelete,
}: VoiceChannelItemProps) {
    return (
        <div>
            <div
                className={`w-full px-2 py-1.5 rounded-md flex items-center gap-2 group transition-colors ${isActive
                    ? "bg-green-500/20 text-green-400"
                    : isConnecting
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                    }`}
            >
                <button
                    onClick={onClick}
                    className="flex-1 flex items-center gap-2 text-left"
                >
                    {/* Icon based on channel type */}
                    {channel.type === "video" ? (
                        <VideoIcon className="w-4 h-4 opacity-70 shrink-0" />
                    ) : channel.type === "stage" ? (
                        <StageIcon className="w-4 h-4 opacity-70 shrink-0" />
                    ) : (
                        <VolumeIcon className="w-4 h-4 opacity-70 shrink-0" />
                    )}
                    <span className="truncate text-sm flex-1">{channel.name}</span>
                    {isConnecting && (
                        <div className="h-3 w-3 animate-spin rounded-full border border-yellow-400 border-t-transparent" />
                    )}
                    {channel.participantCount > 0 && !isActive && (
                        <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded">
                            {channel.participantCount}
                        </span>
                    )}
                </button>
                {canManage && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                            className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300"
                            title="Düzenle"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                            className="p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400"
                            title="Sil"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Show participants when in this channel */}
            {
                isActive && participants.length > 0 && (
                    <div className="ml-6 mt-1 space-y-0.5">
                        {participants.map((p) => (
                            <div key={p.sid} className="flex items-center gap-2 px-2 py-1 text-xs">
                                <div
                                    className={`w-2 h-2 rounded-full ${p.isSpeaking ? "bg-green-500 animate-pulse" : "bg-zinc-600"
                                        }`}
                                />
                                <span className={p.isMuted ? "text-zinc-500" : "text-zinc-300"}>
                                    {p.identity}
                                    {p.isLocal && " (Sen)"}
                                </span>
                                {p.isMuted && (
                                    <svg
                                        className="w-3 h-3 text-red-400 ml-auto"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                                        />
                                    </svg>
                                )}
                            </div>
                        ))}
                    </div>
                )
            }
        </div >
    );
}
