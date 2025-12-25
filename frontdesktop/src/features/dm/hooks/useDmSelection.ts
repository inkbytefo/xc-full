// ============================================================================
// useDmSelection - DM Conversation Selection Logic
// ============================================================================
// Handles conversation selection, URL sync, and new conversation creation.

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useConversations, useStartConversation } from "../../../lib/query";
import { useConversationSubscription } from "../../../lib/websocket/hooks";
import { searchUsers, type UserProfile } from "../../profile/userApi";
import { useAuthStore } from "../../../store/authStore";
import type { Conversation } from "../../../api/types";

interface UseDmSelectionReturn {
    // Data
    conversations: Conversation[];
    conversationsLoading: boolean;
    selectedConvoId: string | null;
    selectedConversation: Conversation | undefined;

    // Actions
    selectConversation: (id: string) => void;

    // New conversation
    showNewConvoModal: boolean;
    setShowNewConvoModal: (show: boolean) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    searchResults: UserProfile[];
    searching: boolean;
    startConversation: (userId: string) => Promise<void>;

    // Error
    error: string | null;
    setError: (error: string | null) => void;
}

export function useDmSelection(): UseDmSelectionReturn {
    const { conversationId: urlConvoId } = useParams<{ conversationId?: string }>();
    const navigate = useNavigate();
    const currentUser = useAuthStore((s) => s.user);

    // React Query
    const { data: conversations = [], isLoading: conversationsLoading } = useConversations();
    const startConversationMutation = useStartConversation();

    // Local state
    const [selectedConvoId, setSelectedConvoId] = useState<string | null>(urlConvoId ?? null);
    const [showNewConvoModal, setShowNewConvoModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const searchTimeoutRef = useRef<number | null>(null);

    // Subscribe to selected conversation (WebSocket)
    useConversationSubscription(selectedConvoId);

    // Derived
    const selectedConversation = conversations.find((c) => c.id === selectedConvoId);

    // Auto-select first conversation
    useEffect(() => {
        if (!selectedConvoId && conversations.length > 0 && !conversationsLoading) {
            setSelectedConvoId(conversations[0].id);
        }
    }, [conversations, selectedConvoId, conversationsLoading]);

    // Sync with URL
    useEffect(() => {
        if (urlConvoId && urlConvoId !== selectedConvoId) {
            setSelectedConvoId(urlConvoId);
        }
    }, [urlConvoId]);

    // Search users
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = window.setTimeout(async () => {
            setSearching(true);
            try {
                const results = await searchUsers(searchQuery, 10);
                setSearchResults(results.filter((u) => u.id !== currentUser?.id));
            } catch {
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
    }, [searchQuery, currentUser?.id]);

    // Actions
    const selectConversation = useCallback((id: string) => {
        setSelectedConvoId(id);
        navigate(`/dms/${id}`);
    }, [navigate]);

    const startConversation = useCallback(async (userId: string) => {
        try {
            const conv = await startConversationMutation.mutateAsync(userId);
            setSelectedConvoId(conv.id);
            setShowNewConvoModal(false);
            setSearchQuery("");
            setSearchResults([]);
            navigate(`/dms/${conv.id}`);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Konuşma başlatılamadı");
        }
    }, [startConversationMutation, navigate]);

    return {
        conversations,
        conversationsLoading,
        selectedConvoId,
        selectedConversation,
        selectConversation,
        showNewConvoModal,
        setShowNewConvoModal,
        searchQuery,
        setSearchQuery,
        searchResults,
        searching,
        startConversation,
        error,
        setError,
    };
}
