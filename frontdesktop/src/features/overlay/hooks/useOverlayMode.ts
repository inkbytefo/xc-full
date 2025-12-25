import { useState, useEffect } from 'react';

export function useOverlayMode() {
    const [pinnedView, setPinnedView] = useState(false);

    useEffect(() => {
        // @ts-expect-error - set by Rust overlay.rs
        if (typeof window.__XC_PINNED_VIEW !== 'undefined') {
            // @ts-expect-error - set by Rust overlay.rs
            setPinnedView(window.__XC_PINNED_VIEW === true);
        }

        const handlePinnedViewChange = () => {
            // @ts-expect-error - set by Rust overlay.rs
            setPinnedView(window.__XC_PINNED_VIEW === true);
        };

        window.addEventListener('overlayPinnedViewChanged', handlePinnedViewChange);

        return () => {
            window.removeEventListener('overlayPinnedViewChanged', handlePinnedViewChange);
        };
    }, []);

    return { pinnedView };
}
