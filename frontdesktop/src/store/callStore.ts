// ============================================================================
// Call Store - Voice/Video Call State Management
// ============================================================================

import { create } from "zustand";
import { api } from "../api/client";

export interface CallData {
    callId: string;
    callerId: string;
    callerName: string;
    callerAvatar?: string;
    calleeId: string;
    calleeName?: string;
    callType: "voice" | "video";
    roomName?: string;
}

export type CallStatus =
    | "idle"
    | "initiating"
    | "ringing"
    | "calling"
    | "accepted"
    | "rejected"
    | "ended"
    | "missed";

interface CallState {
    // Current call state
    incomingCall: CallData | null;
    outgoingCall: CallData | null;
    callStatus: CallStatus;

    // Actions
    initiateCall: (calleeId: string, callType: "voice" | "video") => Promise<void>;
    acceptCall: (callId: string) => Promise<void>;
    rejectCall: (callId: string) => Promise<void>;
    endCall: (callId: string) => Promise<void>;
    cancelCall: (callId: string) => Promise<void>;

    // WebSocket event handlers
    handleCallIncoming: (data: CallData) => void;
    handleCallAccepted: (data: CallData) => void;
    handleCallRejected: (data: CallData) => void;
    handleCallEnded: (data: CallData) => void;
    handleCallMissed: (data: CallData) => void;

    // Clear state
    clearCall: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
    incomingCall: null,
    outgoingCall: null,
    callStatus: "idle",

    // Initiate a call to another user
    initiateCall: async (calleeId: string, callType: "voice" | "video") => {
        try {
            set({ callStatus: "initiating" });

            const response = await api.post<{ data: { callId: string; roomName: string } }>(
                "/api/v1/calls/initiate",
                { calleeId, callType }
            );

            set({
                outgoingCall: {
                    callId: response.data.callId,
                    callerId: "", // Will be set by the caller
                    callerName: "",
                    calleeId,
                    callType,
                    roomName: response.data.roomName,
                },
                callStatus: "calling",
            });
        } catch (error) {
            console.error("Failed to initiate call:", error);
            set({ callStatus: "idle", outgoingCall: null });
            throw error;
        }
    },

    // Accept an incoming call
    acceptCall: async (callId: string) => {
        try {
            const response = await api.post<{ data: { callId: string; roomName: string } }>(
                `/api/v1/calls/${callId}/accept`
            );

            const { incomingCall } = get();
            if (incomingCall) {
                const updatedCall = {
                    ...incomingCall,
                    roomName: response.data.roomName,
                };
                set({
                    callStatus: "accepted",
                    incomingCall: updatedCall,
                });

                // Connect to LiveKit room for voice
                // Import voiceStore dynamically to avoid circular deps
                const { useVoiceStore } = await import('./voiceStore');
                const voiceStore = useVoiceStore.getState();

                // Create a virtual voice channel for the call
                const callChannel = {
                    id: callId,
                    name: `Arama - ${incomingCall.callerName}`,
                    type: (incomingCall.callType === 'video' ? 'video' : 'voice') as 'voice' | 'video',
                    serverId: '',
                    position: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                // Use the connect method from voiceStore
                await voiceStore.connect(callChannel);
            }
        } catch (error) {
            console.error("Failed to accept call:", error);
            throw error;
        }
    },

    // Reject an incoming call
    rejectCall: async (callId: string) => {
        try {
            await api.post(`/api/v1/calls/${callId}/reject`);
            set({ callStatus: "rejected", incomingCall: null });

            // Reset after a moment
            setTimeout(() => {
                set({ callStatus: "idle" });
            }, 1000);
        } catch (error) {
            console.error("Failed to reject call:", error);
            throw error;
        }
    },

    // End an active call
    endCall: async (callId: string) => {
        try {
            await api.post(`/api/v1/calls/${callId}/end`);
            set({
                callStatus: "ended",
                incomingCall: null,
                outgoingCall: null,
            });

            // Reset after a moment
            setTimeout(() => {
                set({ callStatus: "idle" });
            }, 1000);
        } catch (error) {
            console.error("Failed to end call:", error);
            throw error;
        }
    },

    // Cancel an outgoing call
    cancelCall: async (callId: string) => {
        try {
            await api.post(`/api/v1/calls/${callId}/cancel`);
            set({
                callStatus: "ended",
                outgoingCall: null,
            });

            // Reset after a moment
            setTimeout(() => {
                set({ callStatus: "idle" });
            }, 1000);
        } catch (error) {
            console.error("Failed to cancel call:", error);
            throw error;
        }
    },

    // WebSocket: Incoming call received
    handleCallIncoming: (data: CallData) => {
        set({
            incomingCall: data,
            callStatus: "ringing",
        });
    },

    // WebSocket: Call was accepted by callee
    handleCallAccepted: (data: CallData) => {
        set({
            outgoingCall: data,
            callStatus: "accepted",
        });
    },

    // WebSocket: Call was rejected by callee
    handleCallRejected: (_data: CallData) => {
        set({
            callStatus: "rejected",
            outgoingCall: null,
        });

        // Reset after showing message
        setTimeout(() => {
            set({ callStatus: "idle" });
        }, 3000);
    },

    // WebSocket: Call was ended by other party
    handleCallEnded: (_data: CallData) => {
        set({
            callStatus: "ended",
            incomingCall: null,
            outgoingCall: null,
        });

        // Reset after showing message
        setTimeout(() => {
            set({ callStatus: "idle" });
        }, 1000);
    },

    // WebSocket: Call was missed (timeout)
    handleCallMissed: (data: CallData) => {
        // If we were calling, show "no answer"
        const { outgoingCall } = get();
        if (outgoingCall?.callId === data.callId) {
            set({
                callStatus: "missed",
                outgoingCall: null,
            });
        }

        // Reset after showing message
        setTimeout(() => {
            set({ callStatus: "idle", incomingCall: null });
        }, 3000);
    },

    // Clear all call state
    clearCall: () => {
        set({
            incomingCall: null,
            outgoingCall: null,
            callStatus: "idle",
        });
    },
}));
