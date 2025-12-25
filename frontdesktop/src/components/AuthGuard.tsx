// ============================================================================
// Auth Components - Protected Routes & Auth Provider
// ============================================================================

import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

interface ProtectedRouteProps {
    children: ReactNode;
}

/**
 * ProtectedRoute - Wraps routes that require authentication
 * 
 * - If user is not authenticated and auth is initialized, redirects to /login
 * - If auth is not initialized, shows loading spinner
 * - Preserves the intended destination URL for redirect after login
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isInitialized, isLoading } = useAuthStore();
    const location = useLocation();

    // Show loading while auth state is being initialized
    if (!isInitialized || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050505]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-700 border-t-purple-500" />
                    <p className="text-zinc-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
        // Save the current location to redirect back after login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}

interface PublicRouteProps {
    children: ReactNode;
}

/**
 * PublicRoute - Wraps routes that should only be accessible when NOT authenticated
 * 
 * - If user is authenticated, redirects to /feed (or the intended destination)
 * - Useful for login/register pages
 */
export function PublicRoute({ children }: PublicRouteProps) {
    const { isAuthenticated, isInitialized, isLoading } = useAuthStore();
    const location = useLocation();

    // Show loading while auth state is being initialized
    if (!isInitialized || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050505]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-700 border-t-purple-500" />
                    <p className="text-zinc-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Already authenticated - redirect to intended destination or feed
    if (isAuthenticated) {
        const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/feed";
        return <Navigate to={from} replace />;
    }

    return <>{children}</>;
}

/**
 * AuthInitializer - Initializes auth state on app mount
 * 
 * - Checks if user has a valid session (via cookie)
 * - Sets isInitialized when complete
 */
export function AuthInitializer({ children }: { children: ReactNode }) {
    const { checkAuth, isInitialized } = useAuthStore();

    useEffect(() => {
        // Only check auth if not already initialized
        if (!isInitialized) {
            checkAuth();
        }
    }, [checkAuth, isInitialized]);

    return <>{children}</>;
}
