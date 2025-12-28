// ============================================================================
// Pink Auth Store - Professional Token Management
// ============================================================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api, HttpError, setAuthLogoutHandler } from "../api/client";
import type { User, AuthResponse } from "../api/types";

// Cookies are now managed by the browser
// interface AuthTokens is removed as it's no longer used

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isInitialized: boolean;  // Track if auth check has completed
    error: string | null;

    // Actions
    login: (handle: string, password: string) => Promise<boolean>;
    register: (data: { handle: string; displayName: string; email: string; password: string }) => Promise<boolean>;
    logout: () => void;
    checkAuth: () => Promise<boolean>;
    clearError: () => void;
    setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: false,
            error: null,

            login: async (handle, password) => {
                set({ isLoading: true, error: null });
                try {
                    // Backend returns { data: AuthResponse }
                    const response = await api.post<{ data: AuthResponse }>("/api/v1/auth/login", { handle, password });
                    const res = response.data;

                    // Cookies are set by backend
                    set({
                        user: res.user,
                        isAuthenticated: true,
                        isLoading: false,
                        isInitialized: true,
                    });

                    return true;
                } catch (e) {
                    set({
                        error: e instanceof Error ? e.message : "Login failed",
                        isLoading: false,
                        isInitialized: true,
                    });
                    return false;
                }
            },

            register: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    // Backend returns { data: AuthResponse }
                    const response = await api.post<{ data: AuthResponse }>("/api/v1/auth/register", data);
                    const res = response.data;

                    // Cookies are set by backend
                    set({
                        user: res.user,
                        isAuthenticated: true,
                        isLoading: false,
                        isInitialized: true,
                    });

                    return true;
                } catch (e) {
                    set({
                        error: e instanceof Error ? e.message : "Registration failed",
                        isLoading: false,
                        isInitialized: true,
                    });
                    return false;
                }
            },

            logout: () => {
                api.post("/api/v1/auth/logout", {}).catch(() => { });
                set({
                    user: null,
                    isAuthenticated: false,
                    isInitialized: true,
                });
            },

            checkAuth: async () => {
                try {
                    // Direct API check, let client interceptor handle 401/Refresh
                    const res = await api.get<{ data: { user: User } }>("/api/v1/me");
                    set({
                        user: res.data.user,
                        isAuthenticated: true,
                        isInitialized: true,
                    });
                    return true;
                } catch (e) {
                    // Reset auth state if explicitly unauthorized
                    // But if it's a network error, keep current state (user might be offline)
                    const isUnauthorized = e instanceof HttpError && e.status === 401;

                    if (isUnauthorized) {
                        set({
                            user: null,
                            isAuthenticated: false,
                            isInitialized: true
                        });
                        return false;
                    }

                    // Otherwise, just mark as initialized to allow entry (or show offline mode)
                    set({ isInitialized: true });
                    return false;
                }
            },

            clearError: () => set({ error: null }),

            setUser: (user) => set({ user }),
        }),
        {
            name: "pink-auth",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                user: state.user,
                // Do not persist isAuthenticated to avoid UI flicker on refresh
                // The source of truth is the cookie check on load
            }),
        }
    )
);

// Register logout handler with API client for 401 errors
setAuthLogoutHandler(() => {
    useAuthStore.getState().logout();
});
