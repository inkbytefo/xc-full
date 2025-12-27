
// ... (imports remain same except removing unused)
import {
    DiscoveryDashboard,
    ServerProfileView,
    VideoRoomView,
    VoiceOverlay,
    ChatArea,
    HybridChatArea,
    VolumeIcon,
    VideoIcon
} from "../components";
import { Channel } from "../../../api/types"; // Removed Server, ChannelMessage

interface ServerContentAreaProps {
    serverData: any;
    error: string | null;
    voiceStore: any;

    // UI States
    showServerProfile: boolean;
    setShowServerProfile: (show: boolean) => void;
    isViewingVoiceRoom: boolean;
    setIsViewingVoiceRoom: (view: boolean) => void;

    // Data
    chatMessages: any;
    voiceChatMessages: any;
    voiceChatChannel: Channel | null;
    canSendInChannel: boolean;
    members: any[];
    isOwner: boolean;
    isModerator: boolean;
    isAdmin: boolean;

    // Actions
    handleJoinServer: (serverId: string) => Promise<void>; // Changed to Promise<void>
    handleSelectServer: (serverId: string) => void;
    onSettings: () => void;
}

export function ServerContentArea({
    serverData,
    error,
    voiceStore,
    showServerProfile,
    setShowServerProfile,
    isViewingVoiceRoom,
    setIsViewingVoiceRoom,
    chatMessages,
    voiceChatMessages,
    voiceChatChannel,
    canSendInChannel,
    members,
    isOwner,
    isModerator,
    isAdmin,
    handleJoinServer,
    handleSelectServer,
    onSettings
}: ServerContentAreaProps) {

    // Helpers
    const isVoiceActive = voiceStore.activeChannel &&
        serverData.currentServer &&
        voiceStore.activeChannel.serverId === serverData.currentServer.id;

    return (
        <div className="flex-1 flex flex-col">
            {error && (
                <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {!serverData.selectedServer ? (
                /* Discovery Dashboard */
                <DiscoveryDashboard
                    onJoinServer={handleJoinServer}
                    onSelectServer={handleSelectServer}
                />
            ) : showServerProfile && serverData.currentServer ? (
                /* Server Profile View */
                <ServerProfileView
                    server={serverData.currentServer}
                    members={members}
                    isOwner={isOwner}
                    isModerator={isModerator || isAdmin}
                    onClose={() => setShowServerProfile(false)}
                    onSettings={() => {
                        setShowServerProfile(false);
                        onSettings();
                    }}
                />
            ) : isViewingVoiceRoom && isVoiceActive ? (
                <div className="flex-1 flex min-h-0">
                    <div className="flex-1 min-h-0 flex flex-col">
                        {voiceStore.activeChannel.type === "video" ? (
                            <VideoRoomView
                                channel={voiceStore.activeChannel}
                                participants={voiceStore.participants}
                                localParticipant={voiceStore.localParticipant}
                                isMuted={voiceStore.isMuted}
                                isCameraOn={voiceStore.isCameraOn}
                                isScreenSharing={voiceStore.isScreenSharing}
                                onToggleMute={voiceStore.toggleMute}
                                onToggleCamera={voiceStore.toggleCamera}
                                onToggleScreenShare={voiceStore.toggleScreenShare}
                                onDisconnect={() => {
                                    voiceStore.disconnect();
                                    setIsViewingVoiceRoom(false);
                                }}
                            />
                        ) : (
                            <div className="flex-1 flex flex-col relative pb-[76px] bg-[#0a0a0f]">
                                <div className="h-12 px-4 flex items-center justify-between border-b border-white/10 shrink-0 bg-[#0a0a0f]/80 backdrop-blur-xl">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <VolumeIcon className="w-5 h-5 text-green-400" />
                                        <span className="font-semibold text-zinc-100 truncate">
                                            {voiceStore.activeChannel.name}
                                        </span>
                                    </div>
                                    <div className="text-sm text-zinc-500">
                                        {voiceStore.participants.length} katılımcı
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6">
                                    {voiceStore.participants.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                                            <div className="w-16 h-16 mb-4 rounded-xl bg-white/5 flex items-center justify-center">
                                                <VolumeIcon className="w-8 h-8 opacity-60" strokeWidth={1.5} />
                                            </div>
                                            <p className="text-lg font-medium text-zinc-300">Sesli oda boş</p>
                                            <p className="text-sm mt-1">İlk katılımcı siz olun!</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {voiceStore.participants.map((p: any) => (
                                                <div
                                                    key={p.sid}
                                                    className={`rounded-2xl border border-white/10 bg-white/5 p-4 transition-shadow ${p.isSpeaking
                                                        ? "shadow-[0_0_0_2px_rgba(34,197,94,0.35)]"
                                                        : ""
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-bold ${p.isSpeaking
                                                                ? "bg-green-500/20 text-green-300"
                                                                : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                                                                }`}
                                                        >
                                                            {p.identity[0]?.toUpperCase() || "?"}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-sm font-semibold text-zinc-100 truncate">
                                                                {p.identity}
                                                                {p.isLocal && " (Sen)"}
                                                            </div>
                                                            <div className={`text-xs ${p.isSpeaking ? "text-green-400" : "text-zinc-500"}`}>
                                                                {p.isSpeaking ? "Konuşuyor" : "Dinliyor"}
                                                            </div>
                                                        </div>
                                                        {p.isMuted && (
                                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" title="Sessizde" />
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <VoiceOverlay
                                    channel={voiceStore.activeChannel}
                                    participants={voiceStore.participants.map((p: any) => ({
                                        sid: p.sid,
                                        identity: p.identity,
                                        isSpeaking: p.isSpeaking,
                                        isMuted: p.isMuted,
                                        isLocal: p.isLocal,
                                    }))}
                                    isMuted={voiceStore.isMuted}
                                    isDeafened={voiceStore.isDeafened}
                                    isCameraOn={voiceStore.isCameraOn}
                                    isScreenSharing={voiceStore.isScreenSharing}
                                    onToggleMute={() => {
                                        void voiceStore.toggleMute();
                                    }}
                                    onToggleDeafen={voiceStore.toggleDeafen}
                                    onToggleCamera={() => {
                                        void voiceStore.toggleCamera();
                                    }}
                                    onToggleScreenShare={() => {
                                        void voiceStore.toggleScreenShare();
                                    }}
                                    onDisconnect={() => {
                                        voiceStore.disconnect();
                                        setIsViewingVoiceRoom(false);
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {voiceChatChannel && (
                        <div className="w-[380px] min-w-[320px] max-w-[420px] border-l border-white/10 bg-[#0a0a0f]/70 backdrop-blur-xl flex flex-col min-h-0">
                            <div className="flex-1 flex flex-col relative min-h-0">
                                <ChatArea
                                    channel={voiceChatChannel}
                                    messages={voiceChatMessages.messages}
                                    messagesLoading={voiceChatMessages.messagesLoading}
                                    sending={voiceChatMessages.sending}
                                    messageText={voiceChatMessages.messageText}
                                    messagesEndRef={voiceChatMessages.messagesEndRef}
                                    onMessageChange={voiceChatMessages.setMessageText}
                                    onSend={voiceChatMessages.handleSend}
                                    onEditMessage={voiceChatMessages.handleEdit}
                                    onDeleteMessage={voiceChatMessages.handleDelete}
                                    onTyping={voiceChatMessages.handleTyping}
                                    typingUsers={voiceChatMessages.typingUsers}
                                    variant="panel"
                                    headerIcon={
                                        voiceStore.activeChannel.type === "video" ? (
                                            <VideoIcon className="w-5 h-5 text-red-400" />
                                        ) : (
                                            <VolumeIcon className="w-5 h-5 text-green-400" />
                                        )
                                    }
                                    headerBadge={
                                        voiceStore.activeChannel.type === "video" ? (
                                            <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 text-xs font-medium">
                                                LIVE
                                            </span>
                                        ) : null
                                    }
                                />
                            </div>
                        </div>
                    )}
                </div>
            ) : serverData.currentChannel ? (
                <div
                    className={`flex-1 flex flex-col relative ${serverData.currentServer &&
                        voiceStore.activeChannel &&
                        voiceStore.activeChannel.serverId === serverData.currentServer.id &&
                        (voiceStore.isConnected || voiceStore.isConnecting) &&
                        serverData.currentChannel?.type !== "hybrid"
                        ? "pb-[76px]"
                        : ""
                        }`}
                >
                    {serverData.currentChannel.type === "hybrid" ? (
                        <HybridChatArea
                            channel={serverData.currentChannel}
                            messages={chatMessages.messages}
                            messagesLoading={chatMessages.messagesLoading}
                            sending={chatMessages.sending}
                            messageText={chatMessages.messageText}
                            messagesEndRef={chatMessages.messagesEndRef}
                            onMessageChange={chatMessages.setMessageText}
                            onSend={chatMessages.handleSend}
                            onEditMessage={chatMessages.handleEdit}
                            onDeleteMessage={chatMessages.handleDelete}
                            onTyping={chatMessages.handleTyping}
                            typingUsers={chatMessages.typingUsers}
                            canSend={canSendInChannel}
                        />
                    ) : (
                        <ChatArea
                            channel={serverData.currentChannel}
                            messages={chatMessages.messages}
                            messagesLoading={chatMessages.messagesLoading}
                            sending={chatMessages.sending}
                            messageText={chatMessages.messageText}
                            messagesEndRef={chatMessages.messagesEndRef}
                            onMessageChange={chatMessages.setMessageText}
                            onSend={chatMessages.handleSend}
                            onEditMessage={chatMessages.handleEdit}
                            onDeleteMessage={chatMessages.handleDelete}
                            onTyping={chatMessages.handleTyping}
                            typingUsers={chatMessages.typingUsers}
                            canSend={canSendInChannel}
                        />
                    )}

                    {/* Miniature Voice Overlay (when browsing other channels) */}
                    {isVoiceActive && (voiceStore.isConnected || voiceStore.isConnecting) && (
                        <VoiceOverlay
                            channel={voiceStore.activeChannel}
                            participants={voiceStore.participants.map((p: any) => ({
                                sid: p.sid,
                                identity: p.identity,
                                isSpeaking: p.isSpeaking,
                                isMuted: p.isMuted,
                                isLocal: p.isLocal,
                            }))}
                            isMuted={voiceStore.isMuted}
                            isDeafened={voiceStore.isDeafened}
                            isCameraOn={voiceStore.isCameraOn}
                            isScreenSharing={voiceStore.isScreenSharing}
                            onToggleMute={() => {
                                void voiceStore.toggleMute();
                            }}
                            onToggleDeafen={voiceStore.toggleDeafen}
                            onToggleCamera={() => {
                                void voiceStore.toggleCamera();
                            }}
                            onToggleScreenShare={() => {
                                void voiceStore.toggleScreenShare();
                            }}
                            onDisconnect={() => {
                                voiceStore.disconnect();
                                setIsViewingVoiceRoom(false);
                            }}
                        />
                    )}
                </div>
            ) : (
                /* No Channel Selected */
                <div className="flex-1 flex items-center justify-center text-zinc-500">
                    <div className="text-center">
                        <div className="text-6xl mb-4">💬</div>
                        <p className="text-lg">Bir kanal seçin</p>
                        <p className="text-sm mt-1">veya yeni bir kanal oluşturun</p>
                    </div>
                </div>
            )}
        </div>
    );
}

// Add missing props to interface
// I noticed I accessed `members` in the code but defined it as [] or missed in Props interface.
// I should add `members: any[]` and `isOwner`, `isModerator`, `isAdmin` to props.
