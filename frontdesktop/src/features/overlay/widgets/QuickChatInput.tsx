// ============================================================================
// Quick Chat Input - Floating input for ghost mode messaging
// ============================================================================

import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface QuickChatInputProps {
    onSend: (message: string) => void;
    onCancel: () => void;
    recipientName?: string;
    placeholder?: string;
}

export function QuickChatInput({
    onSend,
    onCancel,
    recipientName = 'kullanıcı',
    placeholder
}: QuickChatInputProps) {
    const [message, setMessage] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
    }, []);

    // Handle key events
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && message.trim()) {
            e.preventDefault();
            onSend(message.trim());
            setMessage('');
            // Exit quick chat mode
            invoke('exit_quick_chat').catch(console.error);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
            invoke('exit_quick_chat').catch(console.error);
        }
    };

    const handleSendClick = () => {
        if (message.trim()) {
            onSend(message.trim());
            setMessage('');
            invoke('exit_quick_chat').catch(console.error);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 32,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'min(600px, 90vw)',
                zIndex: 9999,
                animation: 'quickChatSlideUp 0.2s ease-out',
                pointerEvents: 'auto',
            }}
        >
            <style>{`
                @keyframes quickChatSlideUp {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
            `}</style>

            <div
                style={{
                    background: 'rgba(20, 20, 25, 0.95)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 16,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(255, 255, 255, 0.03)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14 }}>💬</span>
                        <span style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: 'rgba(255, 255, 255, 0.9)'
                        }}>
                            Hızlı Mesaj
                        </span>
                        <span style={{
                            fontSize: 12,
                            color: 'rgba(255, 255, 255, 0.5)'
                        }}>
                            → @{recipientName}
                        </span>
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 11,
                        color: 'rgba(255, 255, 255, 0.4)'
                    }}>
                        <kbd style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 10,
                        }}>Enter</kbd>
                        <span>gönder</span>
                        <kbd style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 10,
                        }}>Esc</kbd>
                        <span>iptal</span>
                    </div>
                </div>

                {/* Input Area */}
                <div style={{ display: 'flex', alignItems: 'center', padding: 12, gap: 12 }}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder || `@${recipientName} kişisine mesaj yaz...`}
                        style={{
                            flex: 1,
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 10,
                            padding: '12px 16px',
                            fontSize: 14,
                            color: 'white',
                            outline: 'none',
                            transition: 'border-color 0.15s ease, background 0.15s ease',
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(148, 70, 91, 0.5)';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        }}
                    />
                    <button
                        onClick={handleSendClick}
                        disabled={!message.trim()}
                        style={{
                            background: message.trim()
                                ? 'linear-gradient(135deg, #94465b 0%, #6b3a4d 100%)'
                                : 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            borderRadius: 10,
                            padding: '12px 20px',
                            color: message.trim() ? 'white' : 'rgba(255, 255, 255, 0.4)',
                            fontWeight: 500,
                            fontSize: 14,
                            cursor: message.trim() ? 'pointer' : 'not-allowed',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        <span>Gönder</span>
                        <span style={{ fontSize: 16 }}>⏎</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
