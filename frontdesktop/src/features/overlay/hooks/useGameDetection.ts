import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function useGameDetection() {
    const [runningGame, setRunningGame] = useState<string | null>(null);

    useEffect(() => {
        const checkGame = async () => {
            try {
                const game = await invoke<string | null>('detect_running_game');
                setRunningGame(game);
            } catch (error) {
                console.error('Failed to detect game:', error);
            }
        };

        // Check immediately
        checkGame();

        // Then poll every 5 seconds
        const interval = setInterval(checkGame, 5000);

        return () => clearInterval(interval);
    }, []);

    return { runningGame };
}
