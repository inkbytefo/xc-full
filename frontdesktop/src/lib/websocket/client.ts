// ============================================================================
// WebSocket Client
// ============================================================================

import type {
    EventType,
    Subscription,
    WebSocketMessage,
} from "./types";

export type WebSocketStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

export type MessageHandler = (message: WebSocketMessage) => void;

interface WebSocketClientOptions {
    url: string;
    onStatusChange?: (status: WebSocketStatus) => void;
    onMessage?: MessageHandler;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
}

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private url: string;
    private status: WebSocketStatus = "disconnected";
    private reconnectAttempts = 0;
    private reconnectTimeout: number | null = null;
    private messageHandlers: Set<MessageHandler> = new Set();
    private subscriptions: Subscription[] = [];

    private onStatusChange?: (status: WebSocketStatus) => void;
    private maxReconnectAttempts: number;

    constructor(options: WebSocketClientOptions) {
        this.url = options.url;
        this.onStatusChange = options.onStatusChange;
        this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;

        if (options.onMessage) {
            this.messageHandlers.add(options.onMessage);
        }
    }

    private setStatus(status: WebSocketStatus) {
        if (this.status !== status) {
            this.status = status;
            this.onStatusChange?.(status);
        }
    }

    connect() {
        if (this.ws?.readyState === WebSocket.OPEN) return;

        this.setStatus("connecting");

        try {
            // Cookies are sent automatically by browser (same-origin or credentials)
            this.ws = new WebSocket(this.url);

            this.ws.onopen = this.handleOpen.bind(this);
            this.ws.onmessage = this.handleMessage.bind(this);
            this.ws.onclose = this.handleClose.bind(this);
            this.ws.onerror = this.handleError.bind(this);
        } catch (error) {
            console.error("WebSocket connection error:", error);
            this.scheduleReconnect();
        }
    }

    disconnect() {
        this.clearReconnectTimeout();
        this.subscriptions = [];
        this.reconnectAttempts = 0;

        if (this.ws) {
            this.ws.onclose = null; // Prevent reconnection
            this.ws.close();
            this.ws = null;
        }

        this.setStatus("disconnected");
    }

    private handleOpen() {
        console.log("WebSocket connected");
        this.setStatus("connected");
        this.reconnectAttempts = 0;

        // Re-subscribe to previous subscriptions
        if (this.subscriptions.length > 0) {
            this.subscribe(this.subscriptions);
        }
    }

    private handleMessage(event: MessageEvent) {
        try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            this.messageHandlers.forEach((handler) => {
                try {
                    handler(message);
                } catch (e) {
                    console.error("Message handler error:", e);
                }
            });
        } catch (e) {
            console.error("Failed to parse WebSocket message:", e);
        }
    }

    private handleClose(event: CloseEvent) {
        console.log("WebSocket closed:", event.code, event.reason);
        this.ws = null;

        if (event.code !== 1000) {
            // Abnormal close, try to reconnect
            this.scheduleReconnect();
        } else {
            this.setStatus("disconnected");
        }
    }

    private handleError(event: Event) {
        console.error("WebSocket error:", event);
    }

    private scheduleReconnect() {
        if (this.reconnectTimeout) return; // Already scheduled

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log("Max reconnection attempts reached");
            this.setStatus("disconnected");
            return;
        }

        this.setStatus("reconnecting");
        this.reconnectAttempts++;

        // Exponential backoff with jitter, minimum 1s, max 30s
        const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;

        console.log(`Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`);

        this.reconnectTimeout = window.setTimeout(() => {
            this.reconnectTimeout = null;
            this.connect();
        }, delay);
    }

    private clearReconnectTimeout() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    // Message sending
    send(type: EventType, data?: unknown) {
        if (this.ws?.readyState !== WebSocket.OPEN) {
            console.warn("WebSocket not connected, cannot send message");
            return;
        }

        const message: WebSocketMessage = {
            type,
            data: data as Record<string, unknown>,
            timestamp: new Date().toISOString(),
        };

        this.ws.send(JSON.stringify(message));
    }

    // Subscriptions
    subscribe(subscriptions: Subscription[]) {
        // Store subscriptions for reconnection
        subscriptions.forEach((sub) => {
            if (!this.subscriptions.some((s) => s.type === sub.type && s.id === sub.id)) {
                this.subscriptions.push(sub);
            }
        });

        this.send("subscribe", { subscriptions });
    }

    unsubscribe(subscriptions: Subscription[]) {
        // Remove from stored subscriptions
        this.subscriptions = this.subscriptions.filter(
            (s) => !subscriptions.some((sub) => sub.type === s.type && sub.id === s.id)
        );

        this.send("unsubscribe", { subscriptions });
    }

    // Typing indicators
    startTyping(conversationId?: string, channelId?: string) {
        this.send("typing_start", { conversationId, channelId });
    }

    stopTyping(conversationId?: string, channelId?: string) {
        this.send("typing_stop", { conversationId, channelId });
    }

    // Message handlers
    addMessageHandler(handler: MessageHandler) {
        this.messageHandlers.add(handler);
    }

    removeMessageHandler(handler: MessageHandler) {
        this.messageHandlers.delete(handler);
    }

    // Status
    getStatus(): WebSocketStatus {
        return this.status;
    }

    isConnected(): boolean {
        return this.status === "connected";
    }
}
