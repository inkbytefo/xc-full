import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { AuthInitializer } from "./components/AuthGuard";
import { RealtimeNotifications } from "./components/RealtimeNotifications";
import { IncomingCallContainer } from "./components/call/IncomingCallModal";
import { OutgoingCallContainer } from "./components/call/OutgoingCallModal";
import { WebSocketProvider } from "./lib/websocket/WebSocketProvider";
import { QueryProvider } from "./lib/query/QueryProvider";
import { ToastProvider } from "./features/overlay/NotificationToast";
import { useVoiceStore } from "./store/voiceStore";
import "./index.css";

useVoiceStore.getState().initRuntime("owner");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <ToastProvider>
        <AuthInitializer>
          <WebSocketProvider>
            <RealtimeNotifications />
            <IncomingCallContainer />
            <OutgoingCallContainer />
            <RouterProvider router={router} />
          </WebSocketProvider>
        </AuthInitializer>
      </ToastProvider>
    </QueryProvider>
  </StrictMode>,
);
