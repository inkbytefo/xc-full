// ============================================================================
// Incoming Call Modal - Shows when receiving a voice/video call
// ============================================================================

import { useCallStore, type CallData } from '../../store/callStore';
import { stopLoopingSound } from '../../lib/soundService';
import './call-modal.css';

interface IncomingCallModalProps {
    call: CallData;
    onAccept: () => void;
    onReject: () => void;
}

export function IncomingCallModal({ call, onAccept, onReject }: IncomingCallModalProps) {
    // Sound is played by useNotificationToasts when call_incoming event is received
    // and stopped by soundService when call is accepted/rejected/ended

    const handleAccept = () => {
        stopLoopingSound();
        onAccept();
    };

    const handleReject = () => {
        stopLoopingSound();
        onReject();
    };

    const callTypeLabel = call.callType === 'video' ? 'Görüntülü Arama' : 'Sesli Arama';
    const callTypeIcon = call.callType === 'video' ? '📹' : '📞';

    return (
        <div className="call-modal-overlay">
            <div className="call-modal incoming">
                <div className="call-modal-content">
                    {/* Caller Avatar */}
                    <div className="call-avatar-container">
                        <div className="call-avatar-ring" />
                        {call.callerAvatar ? (
                            <img
                                src={call.callerAvatar}
                                alt={call.callerName}
                                className="call-avatar"
                            />
                        ) : (
                            <div className="call-avatar call-avatar-placeholder">
                                {call.callerName.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>

                    {/* Caller Info */}
                    <div className="call-info">
                        <h2 className="call-name">{call.callerName}</h2>
                        <p className="call-type">
                            {callTypeIcon} {callTypeLabel}
                        </p>
                        <p className="call-status ringing">Arıyor...</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="call-actions">
                        <button
                            className="call-button reject"
                            onClick={handleReject}
                            title="Reddet"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                        </button>
                        <button
                            className="call-button accept"
                            onClick={handleAccept}
                            title="Kabul Et"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Container component that connects to store
export function IncomingCallContainer() {
    const { incomingCall, callStatus, acceptCall, rejectCall } = useCallStore();

    if (!incomingCall || callStatus !== 'ringing') {
        return null;
    }

    const handleAccept = () => {
        acceptCall(incomingCall.callId);
    };

    const handleReject = () => {
        rejectCall(incomingCall.callId);
    };

    return (
        <IncomingCallModal
            call={incomingCall}
            onAccept={handleAccept}
            onReject={handleReject}
        />
    );
}
