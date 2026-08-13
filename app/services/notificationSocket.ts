/**
 * Shared notification socket — one connection for badge + notifications list.
 * Avoids forceNew dual connects on Home Header paint.
 */
import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "../utils/api";
import { TokenUtils } from "../utils/tokenUtils";

let sharedSocket: Socket | null = null;
let connectPromise: Promise<Socket | null> | null = null;
let refCount = 0;

export async function acquireNotificationSocket(): Promise<Socket | null> {
  refCount += 1;

  if (sharedSocket?.connected) {
    return sharedSocket;
  }

  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = (async () => {
    try {
      const token = await TokenUtils.getAuthToken();
      if (!token) return null;

      if (sharedSocket) {
        sharedSocket.removeAllListeners();
        sharedSocket.close();
        sharedSocket = null;
      }

      const socket = io(API_BASE_URL, {
        auth: { token, Authorization: `Bearer ${token}` },
        query: { token },
        extraHeaders: { Authorization: `Bearer ${token}` } as any,
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
        forceNew: false,
      });

      sharedSocket = socket;
      return socket;
    } catch (error) {
      if (__DEV__) {
        console.warn("Notification socket failed:", error);
      }
      return null;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
}

export function releaseNotificationSocket(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount > 0) return;
  if (sharedSocket) {
    sharedSocket.removeAllListeners();
    sharedSocket.close();
    sharedSocket = null;
  }
}

export function getSharedNotificationSocket(): Socket | null {
  return sharedSocket;
}
