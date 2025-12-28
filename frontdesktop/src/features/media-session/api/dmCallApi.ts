// ============================================================================
// DM Call API - For Direct Message Calls
// ============================================================================

import { api } from "../../../api/client";

export interface CallToken {
    token: string;
    roomName: string;
    callId: string;
}

// Get LiveKit token for an active DM call
export async function getCallToken(callId: string): Promise<CallToken> {
    const res = await api.post<{ data: CallToken }>(
        `/api/v1/calls/${callId}/token`
    );
    return res.data;
}
