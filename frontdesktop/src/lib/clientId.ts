/**
 * Generate a unique client-side ID for optimistic updates.
 * Uses crypto.randomUUID() when available, falls back to custom generation.
 */
export function newClientId(): string {
    const cryptoLike = globalThis.crypto;
    if (cryptoLike && "randomUUID" in cryptoLike && typeof cryptoLike.randomUUID === "function") {
        return cryptoLike.randomUUID();
    }
    return `cid_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}
