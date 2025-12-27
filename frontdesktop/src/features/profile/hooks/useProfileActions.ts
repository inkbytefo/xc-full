// ============================================================================
// useProfileActions Hook - Combined Profile Action Logic
// ============================================================================
// Provides follow/unfollow and DM actions for profile pages.
// Uses existing hooks from lib/query for follow operations.

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToggleFollow } from '../../../lib/query';
import { startConversation } from '../../dm/dmApi';

// ============================================================================
// useProfileActions - Combined Actions Hook
// ============================================================================

interface UseProfileActionsOptions {
    userId: string | null | undefined;
    initialIsFollowing?: boolean;
}

interface UseProfileActionsReturn {
    // Follow state
    isFollowing: boolean;
    setIsFollowing: (value: boolean) => void;
    followLoading: boolean;
    handleToggleFollow: () => Promise<void>;

    // DM state
    dmLoading: boolean;
    handleDM: () => Promise<void>;

    // Error
    error: string | null;
    setError: (error: string | null) => void;
}

export function useProfileActions(options: UseProfileActionsOptions): UseProfileActionsReturn {
    const { userId, initialIsFollowing = false } = options;
    const navigate = useNavigate();

    // Follow state
    const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
    const { toggle, isLoading: followLoading } = useToggleFollow();

    // DM state
    const [dmLoading, setDmLoading] = useState(false);

    // Error state
    const [error, setError] = useState<string | null>(null);

    // Handle follow toggle
    const handleToggleFollow = useCallback(async () => {
        if (!userId || followLoading) return;

        try {
            await toggle(userId, isFollowing);
            setIsFollowing(!isFollowing);
        } catch (err) {
            console.error('Follow action failed:', err);
            setError(err instanceof Error ? err.message : 'Takip işlemi başarısız');
        }
    }, [userId, isFollowing, followLoading, toggle]);

    // Handle DM
    const handleDM = useCallback(async () => {
        if (!userId || dmLoading) return;

        setDmLoading(true);
        try {
            const conv = await startConversation(userId);
            navigate(`/dms/${conv.id}`);
        } catch (err) {
            console.error('Failed to start conversation:', err);
            setError(err instanceof Error ? err.message : 'Mesaj gönderilemedi');
        } finally {
            setDmLoading(false);
        }
    }, [userId, dmLoading, navigate]);

    return {
        isFollowing,
        setIsFollowing,
        followLoading,
        handleToggleFollow,
        dmLoading,
        handleDM,
        error,
        setError,
    };
}
