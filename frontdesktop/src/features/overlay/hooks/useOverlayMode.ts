import { useState, useEffect } from 'react';

export function useOverlayMode() {
    const [pinnedView, setPinnedView] = useState(false);

    useEffect(() => {
        // @ts-expect-error - set by Rust overlay.rs
        if (typeof window.__PINK_PINNED_VIEW !== 'undefined') {
            // @ts-expect-error - set by Rust overlay.rs
            setPinnedView(window.__PINK_PINNED_VIEW === true);
        }

        const handlePinnedViewChange = () => {
            // @ts-expect-error - set by Rust overlay.rs
            setPinnedView(window.__PINK_PINNED_VIEW === true);
        };

        const handleFocus = () => {
            // @ts-expect-error - set by Rust overlay.rs
            window.__PINK_PINNED_VIEW = false;
            setPinnedView(false);
        };

        window.addEventListener('overlayPinnedViewChanged', handlePinnedViewChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('overlayPinnedViewChanged', handlePinnedViewChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    return { pinnedView };
}
