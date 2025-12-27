// ============================================================================
// Volume Slider Component
// ============================================================================

import { useUIStore } from '../../../store/uiStore';
import { playSound } from '../../../lib/soundService';

interface VolumeSliderProps {
    showTestButton?: boolean;
}

export function VolumeSlider({ showTestButton = true }: VolumeSliderProps) {
    const notificationVolume = useUIStore((s) => s.notificationVolume);
    const setNotificationVolume = useUIStore((s) => s.setNotificationVolume);

    const handleTestSound = () => {
        playSound('notification');
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                {/* Mute Icon */}
                <button
                    onClick={() => setNotificationVolume(0)}
                    className="text-zinc-400 hover:text-white transition-colors"
                    title="Sessize Al"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                </button>

                {/* Slider */}
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={notificationVolume}
                    onChange={(e) => setNotificationVolume(Number(e.target.value))}
                    className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-4
                        [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-purple-500
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:transition-transform
                        [&::-webkit-slider-thumb]:hover:scale-110
                        [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(168,85,247,0.5)]
                    "
                />

                {/* Max Volume Icon */}
                <button
                    onClick={() => setNotificationVolume(100)}
                    className="text-zinc-400 hover:text-white transition-colors"
                    title="Maksimum Ses"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                </button>

                {/* Volume Percentage */}
                <span className="text-white font-mono w-12 text-right tabular-nums">
                    {notificationVolume}%
                </span>
            </div>

            {showTestButton && (
                <button
                    onClick={handleTestSound}
                    className="px-4 py-2 rounded-lg bg-purple-600/20 text-purple-400 
                        hover:bg-purple-600/30 hover:text-purple-300
                        transition-all duration-200 text-sm
                        flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    Test Sesi Çal
                </button>
            )}
        </div>
    );
}
