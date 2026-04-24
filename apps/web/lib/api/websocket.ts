/**
 * WebSocket Connection Manager
 *
 * Handles:
 * - Socket connection/disconnection
 * - Event listeners setup
 * - Automatic reconnection
 * - Event dispatching to handlers
 */

import { io, Socket } from "socket.io-client";
import {
  RealtimeEventType,
  RealtimeEventPayload,
} from "@/lib/types/realtimeEvents";

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 3000;

// Connection state tracking
let connectionCallbacks: ((connected: boolean) => void)[] = [];

interface WebSocketConfig {
  userId: string;
  groupId: string;
}

function getWebSocketUrl(): string {
  // Server-side rendering — return placeholder
  if (typeof window === "undefined") {
    console.log(process.env.NEXT_PUBLIC_WS_URL, "http://localhost:3000")
    return process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3000";
  }

  // Browser — derive from current domain dynamically
  const protocol = window.location.protocol === "https:" ? "https:" : "http:";
  const host = window.location.host; // e.g. acme.xfinance.com or localhost:3001

  if (process.env.NEXT_PUBLIC_ENV === "development" || host.includes("localhost")) {
    // Local dev or Docker — API is on different port
    return process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3000";
  }

  // Production — API is on same domain, Nginx routes /cache/ to backend
  return `${protocol}//${host}`;
}

/**
 * Initialize WebSocket connection
 * Call this once when user is authenticated (in SessionProvider)
 * Uses cookie-based auth (withCredentials: true) + query params for user context
 */
export function initializeWebSocket(config: WebSocketConfig): Socket {
  if (socket?.connected) {
    return socket;
  }

  const wsUrl = `${getWebSocketUrl()}/cache`;

  socket = io(wsUrl, {
    query: {
      userId: config.userId,
      groupId: config.groupId,
    },
    withCredentials: true, // Send cookies with WebSocket handshake
    reconnection: true,
    reconnectionDelay: RECONNECT_DELAY_MS,
    reconnectionDelayMax: RECONNECT_DELAY_MS * 2,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    reconnectAttempts = 0;
    // Notify all listeners that socket connected
    connectionCallbacks.forEach((callback) => callback(true));
  });

  socket.on("disconnect", (reason: string) => {
    // Notify all listeners that socket disconnected
    connectionCallbacks.forEach((callback) => callback(false));
  });

  socket.on("connect_error", (error: any) => {
    reconnectAttempts++;
  });

  // Setup all event listeners
  setupEventListeners(socket);

  return socket;
}

/**
 * Setup all event listeners
 * When backend publishes an event via Redis pubsub, it's received here
 */
function setupEventListeners(socket: Socket) {
  socket.on(
    "whoami-invalidated",
    (data: RealtimeEventPayload["whoami-invalidated"]) => {
      window.dispatchEvent(
        new CustomEvent("realtime-event", {
          detail: { type: "whoami-invalidated", payload: data },
        }),
      );
    },
  );

  socket.on(
    "permissions-changed",
    (data: RealtimeEventPayload["permissions-changed"]) => {
      window.dispatchEvent(
        new CustomEvent("realtime-event", {
          detail: { type: "permissions-changed", payload: data },
        }),
      );
    },
  );

  socket.on(
    "menus-invalidated",
    (data: RealtimeEventPayload["menus-invalidated"]) => {
      window.dispatchEvent(
        new CustomEvent("realtime-event", {
          detail: { type: "menus-invalidated", payload: data },
        }),
      );
    },
  );

  socket.on("entity-added", (data: RealtimeEventPayload["entity-added"]) => {
    window.dispatchEvent(
      new CustomEvent("realtime-event", {
        detail: { type: "entity-added", payload: data },
      }),
    );
  });

  socket.on(
    "entity-removed",
    (data: RealtimeEventPayload["entity-removed"]) => {
      window.dispatchEvent(
        new CustomEvent("realtime-event", {
          detail: { type: "entity-removed", payload: data },
        }),
      );
    },
  );

  socket.on(
    "entity-updated",
    (data: RealtimeEventPayload["entity-updated"]) => {
      window.dispatchEvent(
        new CustomEvent("realtime-event", {
          detail: { type: "entity-updated", payload: data },
        }),
      );
    },
  );

  socket.on(
    "user-role-changed",
    (data: RealtimeEventPayload["user-role-changed"]) => {
      window.dispatchEvent(
        new CustomEvent("realtime-event", {
          detail: { type: "user-role-changed", payload: data },
        }),
      );
    },
  );

  socket.on(
    "subscription-changed",
    (data: RealtimeEventPayload["subscription-changed"]) => {
      window.dispatchEvent(
        new CustomEvent("realtime-event", {
          detail: { type: "subscription-changed", payload: data },
        }),
      );
    },
  );

  socket.on("role-changed", (data: RealtimeEventPayload["role-changed"]) => {
    window.dispatchEvent(
      new CustomEvent("realtime-event", {
        detail: { type: "role-changed", payload: data },
      }),
    );
  });

  socket.on(
    "subscription-expired",
    (data: RealtimeEventPayload["subscription-expired"]) => {
      window.dispatchEvent(
        new CustomEvent("realtime-event", {
          detail: { type: "subscription-expired", payload: data },
        }),
      );
    },
  );

  socket.on(
    "customization-changed",
    (data: RealtimeEventPayload["customization-changed"]) => {
      window.dispatchEvent(
        new CustomEvent("realtime-event", {
          detail: { type: "customization-changed", payload: data },
        }),
      );
    },
  );
}

/**
 * Disconnect WebSocket
 * Call this on logout
 */
export function disconnectWebSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get current socket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Check if socket is connected
 */
export function isWebSocketConnected(): boolean {
  return socket?.connected ?? false;
}

/**
 * Subscribe to connection state changes
 * Returns a function to unsubscribe
 */
export function onWebSocketConnectionChange(
  callback: (connected: boolean) => void,
): () => void {
  connectionCallbacks.push(callback);

  // Return unsubscribe function
  return () => {
    connectionCallbacks = connectionCallbacks.filter((cb) => cb !== callback);
  };
}
