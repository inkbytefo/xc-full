export { ServerList } from "./server-list";
export { ChannelSidebar } from "./channel-sidebar";
export { ChatArea } from "./chat-area";
export { VoiceOverlay } from "./voice-overlay";
export { VideoRoomView } from "./video-room";
export { HybridChatArea } from "./hybrid-chat-area";

// Existing components that were NOT refactored yet but need to remain accessible if they exist
export { MembersPanel } from "./MembersPanel";
export { ServerHeader } from "./ServerHeader";
export { UserPanel } from "./UserPanel";
export { ServerProfileView } from "./ServerProfileView";
export { DiscoveryDashboard } from "./DiscoveryDashboard";
export { ControlButton } from "./ControlButton";
export * from "./Icons";

// Modals (assuming they exist based on usage in ServersPage)
// If they don't exist here, they might be imported directly in ServersPage or reside elsewhere.
// I will comment them out if I'm not sure, but better to keep what was there if possible.
// Actually, earlier `index.ts` content I read ONLY had the first block.
// The "diff" showed I *replaced* content, so I lost `MembersPanel` etc. I must restore them.
