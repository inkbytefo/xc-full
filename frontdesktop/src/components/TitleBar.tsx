// ============================================================================
// WindowControls - Minimal Frameless Window Controls
// ============================================================================
// Invisible drag region at top + floating window controls

import { getCurrentWindow } from "@tauri-apps/api/window";

export function WindowControls() {
    const appWindow = getCurrentWindow();

    const handleMinimize = () => appWindow.minimize();
    const handleMaximize = () => appWindow.toggleMaximize();
    const handleClose = () => appWindow.close();

    return (
        <>
            {/* Invisible drag region at very top - only covers the top bar area */}
            {/* Uses pointer-events-none to allow clicks through, except for the actual drag area */}
            <div
                className="fixed top-0 left-0 right-0 h-8 z-[9999] flex items-stretch pointer-events-none"
            >
                {/* Left drag area - skips sidebar width (240px = w-60) */}
                <div className="w-60 shrink-0" />

                {/* Center drag area - draggable */}
                <div
                    data-tauri-drag-region
                    className="flex-1 cursor-move pointer-events-auto"
                    style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
                />

                {/* Right side - window controls take their own space */}
                <div className="w-[120px] shrink-0" />
            </div>

            {/* Floating window controls - top right */}
            <div className="fixed top-0 right-0 z-[9999] flex items-center">
                {/* Minimize */}
                <button
                    type="button"
                    onClick={handleMinimize}
                    className="h-8 w-10 flex items-center justify-center text-zinc-500 hover:bg-white/10 hover:text-zinc-200 transition-colors"
                    title="Küçült"
                >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
                        <rect y="5" width="12" height="2" rx="1" fill="currentColor" />
                    </svg>
                </button>

                {/* Maximize */}
                <button
                    type="button"
                    onClick={handleMaximize}
                    className="h-8 w-10 flex items-center justify-center text-zinc-500 hover:bg-white/10 hover:text-zinc-200 transition-colors"
                    title="Büyüt/Küçült"
                >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="1" y="1" width="10" height="10" rx="1.5" />
                    </svg>
                </button>

                {/* Close */}
                <button
                    type="button"
                    onClick={handleClose}
                    className="h-8 w-10 flex items-center justify-center text-zinc-500 hover:bg-red-500 hover:text-white transition-colors"
                    title="Kapat"
                >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 2l8 8M10 2l-8 8" strokeLinecap="round" />
                    </svg>
                </button>
            </div>
        </>
    );
}
