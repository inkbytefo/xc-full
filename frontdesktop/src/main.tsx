import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { AuthInitializer } from "./components/AuthGuard";
import { RealtimeNotifications } from "./components/RealtimeNotifications";
import { WebSocketProvider } from "./lib/websocket/WebSocketProvider";
import { QueryProvider } from "./lib/query/QueryProvider";
import { ToastProvider } from "./features/overlay/NotificationToast";

// New media session components
import {
  IncomingCallModal,
  ActiveSessionOverlay,
  PiPContainer,
  useIncomingCallTimeout,
} from "./features/media-session";

import "./index.css";

// Global call timeout cleanup component
function MediaSessionManager() {
  useIncomingCallTimeout();
  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <ToastProvider>
        <AuthInitializer>
          <WebSocketProvider>
            <RealtimeNotifications />
            {/* New unified media session UI */}
            <MediaSessionManager />
            <IncomingCallModal />
            <ActiveSessionOverlay />
            <PiPContainer />
            <RouterProvider router={router} />
          </WebSocketProvider>
        </AuthInitializer>
      </ToastProvider>
    </QueryProvider>
  </StrictMode>,
);
