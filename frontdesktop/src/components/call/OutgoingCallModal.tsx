// ============================================================================
// Outgoing Call Modal - Shows when initiating a call
// ============================================================================

import { useEffect } from 'react';
import { useCallStore, type CallData } from '../../store/callStore';
import { playSound, stopLoopingSound } from '../../lib/soundService';
import './call-modal.css';

interface OutgoingCallModalProps {
    call: CallData;
    onCancel: () => void;
}

export function OutgoingCallModal({ call, onCancel }: OutgoingCallModalProps) {
    const callTypeLabel = call.callType === 'video' ? 'Görüntülü Arama' : 'Sesli Arama';
    const callTypeIcon = call.callType === 'video' ? '📹' : '📞';

    // Play outgoing call sound on mount
    useEffect(() => {
        playSound('outgoing_call');
        return () => {
            stopLoopingSound();
        };
    }, []);

    const handleCancel = () => {
        stopLoopingSound();
        onCancel();
    };

    return (
        <div className="call-modal-overlay">
            <div className="call-modal outgoing">
                <div className="call-modal-content">
                    {/* Callee Avatar */}
                    <div className="call-avatar-container">
                        <div className="call-avatar-pulse" />
                        <div className="call-avatar call-avatar-placeholder">
                            {(call.calleeName || 'U').charAt(0).toUpperCase()}
                        </div>
                    </div>

                    {/* Callee Info */}
                    <div className="call-info">
                        <h2 className="call-name">{call.calleeName || 'Kullanıcı'}</h2>
                        <p className="call-type">
                            {callTypeIcon} {callTypeLabel}
                        </p>
                        <p className="call-status calling">Aranıyor...</p>
                    </div>

                    {/* Cancel Button */}
                    <div className="call-actions">
                        <button
                            className="call-button cancel"
                            onClick={handleCancel}
                            title="İptal"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Container component that connects to store
export function OutgoingCallContainer() {
    const { outgoingCall, callStatus, cancelCall } = useCallStore();

    if (!outgoingCall || callStatus !== 'calling') {
        return null;
    }

    const handleCancel = () => {
        cancelCall(outgoingCall.callId);
    };

    return (
        <OutgoingCallModal
            call={outgoingCall}
            onCancel={handleCancel}
        />
    );
}
