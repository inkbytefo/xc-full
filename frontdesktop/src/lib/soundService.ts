// ============================================================================
// Sound Service - Centralized notification sound management
// ============================================================================

import { useUIStore } from '../store/uiStore';

export type SoundType =
    // Call sounds
    | 'ringtone'
    | 'outgoing_call'
    | 'call_connect'
    | 'call_end'
    | 'call_rejected'
    // Message sounds
    | 'message_dm'
    | 'message_channel'
    // Notification sounds
    | 'notification'
    | 'stream_live'
    | 'error'
    | 'success'
    // Voice sounds
    | 'voice_join'
    | 'voice_leave'
    | 'voice_connect'
    | 'voice_disconnect'
    | 'mute'
    | 'unmute'
    | 'deafen';

// Sound file paths
const SOUND_PATHS: Record<SoundType, string> = {
    ringtone: '/sounds/ringtone.mp3',
    outgoing_call: '/sounds/outgoing_call.mp3',
    call_connect: '/sounds/call_connect.mp3',
    call_end: '/sounds/call_end.mp3',
    call_rejected: '/sounds/call_rejected.mp3',
    message_dm: '/sounds/message_dm.mp3',
    message_channel: '/sounds/message_channel.mp3',
    notification: '/sounds/notification.mp3',
    stream_live: '/sounds/stream_live.mp3',
    error: '/sounds/error.mp3',
    success: '/sounds/success.mp3',
    voice_join: '/sounds/voice_join.mp3',
    voice_leave: '/sounds/voice_leave.mp3',
    voice_connect: '/sounds/voice_connect.mp3',
    voice_disconnect: '/sounds/voice_disconnect.mp3',
    mute: '/sounds/mute.mp3',
    unmute: '/sounds/unmute.mp3',
    deafen: '/sounds/deafen.mp3',
};

// Looping sounds that need to be stopped manually
const LOOPING_SOUNDS: SoundType[] = ['ringtone', 'outgoing_call'];

// Audio instance cache for reuse
const audioCache: Map<SoundType, HTMLAudioElement> = new Map();

// Currently playing looping audio
let currentLoopingAudio: HTMLAudioElement | null = null;
let currentLoopingType: SoundType | null = null;

/**
 * Get the current notification volume from user settings (0.0 to 1.0)
 */
function getNotificationVolume(): number {
    const volume = useUIStore.getState().notificationVolume;
    return volume / 100; // Convert 0-100 to 0.0-1.0
}

/**
 * Play a notification sound
 * @param type - The type of sound to play
 * @param volumeOverride - Optional volume override (0.0 to 1.0), defaults to user setting
 * @returns The audio element (for stopping looping sounds)
 */
export function playSound(type: SoundType, volumeOverride?: number): HTMLAudioElement | null {
    try {
        // Get volume from settings or use override
        const volume = volumeOverride ?? getNotificationVolume();

        // Don't play if volume is 0
        if (volume <= 0) {
            return null;
        }

        // Get or create audio element
        let audio = audioCache.get(type);

        if (!audio) {
            audio = new Audio(SOUND_PATHS[type]);
            audioCache.set(type, audio);
        }

        // Configure audio
        audio.volume = Math.max(0, Math.min(1, volume));
        audio.loop = LOOPING_SOUNDS.includes(type);
        audio.currentTime = 0;

        // If this is a looping sound, stop any current one first
        if (audio.loop) {
            stopLoopingSound();
            currentLoopingAudio = audio;
            currentLoopingType = type;
        }

        // Play the sound
        audio.play().catch((err) => {
            // Audio play might be blocked by browser autoplay policy
            console.warn(`Could not play sound ${type}:`, err);
        });

        return audio;
    } catch (err) {
        console.error(`Error playing sound ${type}:`, err);
        return null;
    }
}

/**
 * Stop the currently playing looping sound (ringtone, outgoing_call)
 */
export function stopLoopingSound(): void {
    if (currentLoopingAudio) {
        currentLoopingAudio.pause();
        currentLoopingAudio.currentTime = 0;
        currentLoopingAudio = null;
        currentLoopingType = null;
    }
}

/**
 * Stop a specific sound type if it's currently playing
 */
export function stopSound(type: SoundType): void {
    // If it's the current looping sound, stop it
    if (currentLoopingType === type) {
        stopLoopingSound();
        return;
    }

    // Otherwise, try to stop from cache
    const audio = audioCache.get(type);
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
}

/**
 * Preload sounds for better performance
 */
export function preloadSounds(): void {
    const prioritySounds: SoundType[] = [
        'ringtone',
        'message_dm',
        'notification',
        'voice_connect',
    ];

    prioritySounds.forEach((type) => {
        if (!audioCache.has(type)) {
            const audio = new Audio(SOUND_PATHS[type]);
            audio.preload = 'auto';
            audioCache.set(type, audio);
        }
    });
}

/**
 * Set global volume for all future sounds
 * Note: This doesn't affect currently playing sounds
 */
let globalVolume = 0.5;

export function setGlobalVolume(volume: number): void {
    globalVolume = Math.max(0, Math.min(1, volume));
}

export function getGlobalVolume(): number {
    return globalVolume;
}

// Re-export convenience functions
export const sounds = {
    play: playSound,
    stop: stopSound,
    stopLooping: stopLoopingSound,
    preload: preloadSounds,
    setVolume: setGlobalVolume,
    getVolume: getGlobalVolume,
};

export default sounds;
