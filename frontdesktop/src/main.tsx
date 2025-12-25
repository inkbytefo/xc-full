import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { AuthInitializer } from "./components/AuthGuard";
import { WebSocketProvider } from "./lib/websocket/WebSocketProvider";
import { QueryProvider } from "./lib/query/QueryProvider";
import { useVoiceStore } from "./store/voiceStore";
import "./index.css";

useVoiceStore.getState().initRuntime("owner");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <AuthInitializer>
        <WebSocketProvider>
          <RouterProvider router={router} />
        </WebSocketProvider>
      </AuthInitializer>
    </QueryProvider>
  </StrictMode>,
);
