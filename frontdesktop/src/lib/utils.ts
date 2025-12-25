/**
 * Global utility functions shared across the application.
 * Consolidates duplicate utilities from DM and Server modules.
 */

/**
 * Merge class names, filtering out falsy values.
 */
export function cn(...values: Array<string | false | null | undefined>): string {
    return values.filter(Boolean).join(" ");
}

/**
 * Format ISO datetime string to localized time (HH:mm).
 */
export function formatTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

/**
 * Check if scroll container is near top (for infinite scroll).
 */
export function isNearTop(el: HTMLElement): boolean {
    return el.scrollTop <= 60;
}

/**
 * Get distance from scroll bottom.
 */
export function distanceFromBottom(el: HTMLElement): number {
    return el.scrollHeight - el.scrollTop - el.clientHeight;
}
