// ============================================================================
// Chat View - Reusable Chat Component for Overlay Widgets
// ============================================================================

import { Message } from '../../../api/types';
import { FormEvent, useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

// SVG Icons
const SendIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
);

const EmojiIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

interface ChatViewProps {
    messages: Message[];
    currentUser?: { id: string; displayName: string };
    onSendMessage: (content: string) => Promise<void>;
    placeholder?: string;
    loading?: boolean;
    emptyMessage?: string;
    quickChatMode?: boolean;
    onQuickChatComplete?: () => void;
}

export interface ChatViewHandle {
    focusInput: () => void;
}

export const ChatView = forwardRef<ChatViewHandle, ChatViewProps>(({
    messages,
    onSendMessage,
    placeholder = "Mesaj gönder...",
    loading = false,
    emptyMessage = "Mesaj yok",
    quickChatMode = false,
    onQuickChatComplete
}, ref) => {
    const [inputValue, setInputValue] = useState("");
    const [sending, setSending] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Expose focusInput method to parent
    useImperativeHandle(ref, () => ({
        focusInput: () => {
            inputRef.current?.focus();
        }
    }));

    // Auto-focus when quick chat mode is enabled
    useEffect(() => {
        if (quickChatMode) {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [quickChatMode]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || sending) return;

        const content = inputValue;
        const wasQuickChatMode = quickChatMode;

        setInputValue("");
        setSending(true);

        // If in quick chat mode, exit first (before sending)
        if (wasQuickChatMode) {
            try {
                await invoke('exit_quick_chat');
            } catch (err) {
                console.error('Failed to exit quick chat:', err);
            }
            onQuickChatComplete?.();
        }

        try {
            await onSendMessage(content);
        } catch (err) {
            console.error('Failed to send message:', err);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // In quick chat mode, Escape exits
        if (quickChatMode && e.key === 'Escape') {
            e.preventDefault();
            invoke('exit_quick_chat').catch(console.error);
            onQuickChatComplete?.();
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Messages Area */}
            <div
                className="chat-messages"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    flex: 1,
                    overflowY: 'auto',
                    paddingRight: '4px'
                }}
            >
                {loading && (
                    <div style={{ textAlign: 'center', opacity: 0.5, padding: '20px' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '4px',
                            marginBottom: '8px'
                        }}>
                            <span style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: '#a78bfa',
                                animation: 'pulse 1s infinite'
                            }} />
                            <span style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: '#a78bfa',
                                animation: 'pulse 1s infinite 0.2s'
                            }} />
                            <span style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: '#a78bfa',
                                animation: 'pulse 1s infinite 0.4s'
                            }} />
                        </div>
                        Yükleniyor...
                    </div>
                )}

                {!loading && messages.length === 0 && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        opacity: 0.5
                    }}>
                        <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            background: 'rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 12
                        }}>
                            💬
                        </div>
                        <div style={{ fontSize: 13 }}>{emptyMessage}</div>
                    </div>
                )}

                {!loading && messages.map(m => (
                    <div
                        key={m.id}
                        className="message-item"
                        style={{
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'flex-start',
                            padding: '8px 4px',
                            borderRadius: 8,
                            transition: 'background 0.15s ease'
                        }}
                    >
                        {/* Avatar */}
                        <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: m.sender?.avatarGradient
                                ? `linear-gradient(135deg, ${m.sender.avatarGradient[0]} 0%, ${m.sender.avatarGradient[1]} 100%)`
                                : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#fff',
                            flexShrink: 0
                        }}>
                            {m.sender?.displayName?.substring(0, 1)?.toUpperCase() || '?'}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: '#c4b5fd'
                                }}>
                                    {m.sender?.displayName || 'Unknown'}
                                </span>
                                <span style={{
                                    fontSize: 10,
                                    color: 'rgba(255,255,255,0.3)'
                                }}>
                                    {new Date(m.createdAt).toLocaleTimeString('tr-TR', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                            <div style={{
                                fontSize: 13,
                                color: 'rgba(255,255,255,0.85)',
                                lineHeight: '1.5',
                                marginTop: 2,
                                wordBreak: 'break-word'
                            }}>
                                {m.content}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <form
                onSubmit={handleSubmit}
                style={{
                    marginTop: 12,
                    background: quickChatMode ? 'rgba(148,70,91,0.2)' : 'rgba(0,0,0,0.3)',
                    borderRadius: 12,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    border: quickChatMode ? '1px solid rgba(148,70,91,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    transition: 'all 0.2s ease'
                }}
            >
                <button
                    type="button"
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.4)',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    title="Emoji"
                >
                    <EmojiIcon className="w-5 h-5" />
                </button>

                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={quickChatMode ? "Hızlı mesaj yaz, Enter ile gönder..." : placeholder}
                    disabled={sending}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'white',
                        flex: 1,
                        fontSize: 13,
                        opacity: sending ? 0.5 : 1
                    }}
                />

                {quickChatMode && (
                    <div style={{
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                    }}>
                        <kbd style={{
                            background: 'rgba(255,255,255,0.1)',
                            padding: '2px 4px',
                            borderRadius: 3,
                            fontSize: 9
                        }}>Esc</kbd>
                        <span>iptal</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={!inputValue.trim() || sending}
                    style={{
                        background: inputValue.trim() ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' : 'rgba(255,255,255,0.1)',
                        border: 'none',
                        color: inputValue.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                        cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                        padding: 8,
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                    }}
                    title="Gönder"
                >
                    <SendIcon className="w-4 h-4" />
                </button>
            </form>
        </div>
    );
});

ChatView.displayName = 'ChatView';

