import { useState, useEffect } from 'react';

/**
 * Hook to manage Overlay Ghost Mode state
 * Listens for 'ghostModeChanged' event dispatched by Rust backend
 */
export function useOverlayMode() {
    const [ghostMode, setGhostMode] = useState(false);
    const [manageMode, setManageMode] = useState(false);

    useEffect(() => {
        // Initial check (optional, if we could query Rust synchronously, but usually event-based is fine)
        // @ts-expect-error - set by Rust overlay.rs
        if (typeof window.__XC_GHOST_MODE !== 'undefined') {
            // @ts-expect-error - set by Rust overlay.rs
            setGhostMode(window.__XC_GHOST_MODE === true);
        }
        // @ts-expect-error - set by Rust overlay.rs
        if (typeof window.__XC_MANAGE_MODE !== 'undefined') {
            // @ts-expect-error - set by Rust overlay.rs
            setManageMode(window.__XC_MANAGE_MODE === true);
        }

        const handleGhostModeChange = () => {
            // @ts-expect-error - set by Rust overlay.rs
            setGhostMode(window.__XC_GHOST_MODE === true);
        };

        const handleManageModeChange = () => {
            // @ts-expect-error - set by Rust overlay.rs
            setManageMode(window.__XC_MANAGE_MODE === true);
        };

        window.addEventListener('ghostModeChanged', handleGhostModeChange);
        window.addEventListener('manageModeChanged', handleManageModeChange);

        return () => {
            window.removeEventListener('ghostModeChanged', handleGhostModeChange);
            window.removeEventListener('manageModeChanged', handleManageModeChange);
        };
    }, []);

    return { ghostMode, manageMode };
}
