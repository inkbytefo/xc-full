import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { Suspense, lazy } from "react";
import { BackgroundLayer } from "./components/BackgroundLayer";
import { MainSidebar } from "./components/MainSidebar";
import { WindowControls } from "./components/TitleBar";
import { ProtectedRoute, PublicRoute } from "./components/AuthGuard";
import { GlobalVoiceSessionModal } from "./features/voice/components/GlobalVoiceSessionModal";
import { PageLoader } from "./components/PageLoader";

// Lazy load pages
const LoginPage = lazy(() => import("./features/auth/LoginPage").then(module => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("./features/auth/RegisterPage").then(module => ({ default: module.RegisterPage })));
const DmPage = lazy(() => import("./features/dm/DmPage").then(module => ({ default: module.DmPage })));
const FeedPage = lazy(() => import("./features/feed/FeedPage").then(module => ({ default: module.FeedPage })));
const LivePage = lazy(() => import("./features/live/LivePage").then(module => ({ default: module.LivePage })));
const NotificationsPage = lazy(() => import("./features/notifications/NotificationsPage").then(module => ({ default: module.NotificationsPage })));
const ProfilePage = lazy(() => import("./features/profile/ProfilePage").then(module => ({ default: module.ProfilePage })));
const ServersPage = lazy(() => import("./features/servers/ServersPage").then(module => ({ default: module.ServersPage })));
const ServerProfilePage = lazy(() => import("./features/servers/ServerProfilePage").then(module => ({ default: module.ServerProfilePage })));
const SettingsPage = lazy(() => import("./features/settings/SettingsPage").then(module => ({ default: module.SettingsPage })));

/**
 * Root layout that wraps protected routes.
 * Provides the main sidebar (72px) and background canvas.
 */
function RootLayout() {
    return (
        <div className="h-screen overflow-hidden bg-transparent">
            <WindowControls />
            <BackgroundLayer />
            <MainSidebar />
            <main className="relative z-10 h-full pl-[72px] overflow-hidden bg-canvas-visible">
                <Suspense fallback={<PageLoader />}>
                    <Outlet />
                </Suspense>
            </main>
            <GlobalVoiceSessionModal />
        </div>
    );
}

/**
 * Application router configuration.
 * 
 * Route structure:
 * - /login       -> Login page (public only)
 * - /register    -> Register page (public only)
 * - /            -> redirects to /feed (protected)
 * - /feed        -> Feed page (protected)
 * - /dms         -> Direct messages (protected)
 * - /servers     -> Server discovery (protected)
 * - /live        -> Live streams (protected)
 * - /notifications -> Notifications (protected)
 * - /settings    -> Settings (protected)
 * - /profile     -> User profile (protected)
 */
export const router = createBrowserRouter([
    // Public routes - only accessible when NOT authenticated
    {
        path: "/login",
        element: (
            <PublicRoute>
                <div className="h-screen overflow-hidden">
                    <WindowControls />
                    <Suspense fallback={<PageLoader />}>
                        <LoginPage />
                    </Suspense>
                </div>
            </PublicRoute>
        ),
    },
    {
        path: "/register",
        element: (
            <PublicRoute>
                <div className="h-screen overflow-hidden">
                    <WindowControls />
                    <Suspense fallback={<PageLoader />}>
                        <RegisterPage />
                    </Suspense>
                </div>
            </PublicRoute>
        ),
    },
    // Protected routes with layout
    {
        path: "/",
        element: (
            <ProtectedRoute>
                <RootLayout />
            </ProtectedRoute>
        ),
        children: [
            {
                index: true,
                element: <Navigate to="/feed" replace />,
            },
            {
                path: "feed",
                element: <FeedPage />,
            },
            {
                path: "dms",
                element: <DmPage />,
            },
            {
                path: "dms/:conversationId",
                element: <DmPage />,
            },
            {
                path: "servers",
                element: <ServersPage />,
            },
            {
                path: "s/:handle",
                element: <ServersPage />,
            },
            {
                path: "servers/:serverId",
                element: <ServersPage />,
            },
            {
                path: "servers/:serverId/channels/:channelId",
                element: <ServersPage />,
            },
            {
                path: "servers/:serverId/profile",
                element: <ServerProfilePage />,
            },
            {
                path: "live",
                element: <LivePage />,
            },
            {
                path: "live/:streamId",
                element: <LivePage />,
            },
            {
                path: "notifications",
                element: <NotificationsPage />,
            },
            {
                path: "settings",
                element: <SettingsPage />,
            },
            {
                path: "u/:handle",
                element: <ProfilePage />,
            },
            {
                path: "profile",
                element: <ProfilePage />,
            },
            {
                path: "profile/:userId",
                element: <ProfilePage />,
            },
            {
                path: "*",
                element: <Navigate to="/feed" replace />,
            },
        ],
    },
]);

