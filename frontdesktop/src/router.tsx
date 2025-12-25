import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { BackgroundLayer } from "./components/BackgroundLayer";
import { MainSidebar } from "./components/MainSidebar";
import { ProtectedRoute, PublicRoute } from "./components/AuthGuard";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { DmPage } from "./features/dm/DmPage";
import { FeedPage } from "./features/feed/FeedPage";
import { LivePage } from "./features/live/LivePage";
import { NotificationsPage } from "./features/notifications/NotificationsPage";
import { ProfilePage } from "./features/profile/ProfilePage";
import { ServersPage } from "./features/servers/ServersPage";
import { ServerProfilePage } from "./features/servers/ServerProfilePage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { GlobalVoiceSessionModal } from "./features/voice/components/GlobalVoiceSessionModal";

/**
 * Root layout that wraps protected routes.
 * Provides the main sidebar (72px) and background canvas.
 */
function RootLayout() {
    return (
        <div className="min-h-screen bg-transparent">
            <BackgroundLayer />
            <MainSidebar />
            <main className="relative z-10 min-h-screen pl-[72px]">
                <Outlet />
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
                <LoginPage />
            </PublicRoute>
        ),
    },
    {
        path: "/register",
        element: (
            <PublicRoute>
                <RegisterPage />
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
