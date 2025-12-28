import { useEffect, useRef, useState } from "react";
import { fetchChatHistory } from "../liveApi";
import type { StreamChatMessage } from "../../../api/types";

interface StreamChatProps {
    streamId: string;
}

export function StreamChat({ streamId }: StreamChatProps) {
    const [messages, setMessages] = useState<StreamChatMessage[]>([]);
    const [inputText, setInputText] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    // Token is fetched dynamically now via connect()

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Initial load
    useEffect(() => {
        fetchChatHistory(streamId).then((res) => {
            // Reverse if backend returns newest first, but usually history is oldest first?
            // Assuming existing backend returns list. We'll append.
            setMessages(res.data || []);
        });
    }, [streamId]);

    // WebSocket connection
    useEffect(() => {
        let ws: WebSocket | null = null;

        // Fetch token first
        const connect = async () => {
            try {
                const token = await import("../liveApi").then(m => m.getWebsocketToken());

                const wsUrl = `ws://localhost:8080/ws?token=${token}`; // Use env var in prod
                ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onopen = () => {
                    // Subscribe to stream chat
                    ws?.send(JSON.stringify({
                        type: "subscribe",
                        data: {
                            subscriptions: [{ type: "stream", id: streamId }]
                        }
                    }));
                };

                ws.onmessage = (event) => {
                    try {
                        const msg = JSON.parse(event.data);
                        if (msg.type === "stream_chat_message") {
                            // msg.data contains { streamId, message: StreamChatMessage }
                            const chatMsg = msg.data.message as StreamChatMessage;
                            setMessages((prev) => [...prev, chatMsg]);
                        }
                    } catch (e) {
                        console.error("WS Parse error", e);
                    }
                };
            } catch (err) {
                console.error("Failed to get WS token", err);
            }
        };

        connect();

        return () => {
            if (ws) ws.close();
        };
    }, [streamId]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !wsRef.current) return;

        try {
            wsRef.current.send(JSON.stringify({
                type: "stream_chat_message",
                data: {
                    streamId: streamId,
                    content: inputText
                }
            }));
            setInputText("");
        } catch (err) {
            console.error("Failed to send", err);
        }
    };

    return (
        <div className="flex flex-col h-full bg-black/20 backdrop-blur-md rounded-xl border border-white/10">
            <div className="p-4 border-b border-white/10">
                <h3 className="text-white font-bold">Stream Chat</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
                {messages.map((msg) => (
                    <div key={msg.id} className="flex gap-3">
                        <div
                            className="w-8 h-8 rounded-full shrink-0"
                            style={{ backgroundImage: `linear-gradient(135deg, ${msg.user.avatarGradient[0]}, ${msg.user.avatarGradient[1]})` }}
                        />
                        <div className="min-w-0">
                            <div className="flex items-baseline gap-2">
                                <span className="text-sm font-bold text-zinc-300">{msg.user.displayName}</span>
                                <span className="text-xs text-zinc-500">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-zinc-200 text-sm break-words">{msg.content}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-white/10">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Send a message..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
            </form>
        </div>
    );
}
