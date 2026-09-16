import { router } from "expo-router";
import { Alert } from "react-native";
import { decideInteractionAuth } from "../../../src/core/auth/authPresence";
import { peekAuthToken } from "../../../src/core/auth/tokenMemory";
import TokenUtils from "../tokenUtils";
import { hasBackendSessionSync } from "../sessionAuth";

export type AuthGateResult = {
  ok: boolean;
};

export type InteractionAuthAction = "like" | "save" | "comment" | "share";

const ACTION_MESSAGES: Record<InteractionAuthAction, string> = {
  like: "Log in to like this and keep it across devices.",
  save: "Log in to save this to your library.",
  comment: "Log in to join the conversation.",
  share: "Log in to share and track engagement.",
};

function currentAuthDecision() {
  return decideInteractionAuth({
    cachedToken: peekAuthToken(),
    sessionHint: hasBackendSessionSync(),
  });
}

export function isAuthenticatedForInteractionSync(): boolean {
  return currentAuthDecision() === "yes";
}

export function isGuestForInteractionSync(): boolean {
  return currentAuthDecision() === "no";
}

export function promptInteractionLogin(options?: {
  action?: InteractionAuthAction;
  title?: string;
  message?: string;
}): void {
  const action = options?.action ?? "like";
  Alert.alert(
    options?.title ?? "Sign in required",
    options?.message ?? ACTION_MESSAGES[action],
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log in",
        onPress: () => {
          try {
            router.push("/auth/login");
          } catch {
            // Router may be unmounted during teardown
          }
        },
      },
    ]
  );
}

/**
 * Guest / expired-session gate for engagement actions.
 * UI must remain unchanged when this returns ok:false (unless silent).
 * Logged-in taps resolve synchronously from memory / MMKV — no SecureStore wait.
 */
export async function ensureAuthenticatedForInteraction(options?: {
  action?: InteractionAuthAction;
  title?: string;
  message?: string;
  /** When true, skip the alert (e.g. analytics-only share recording). */
  silent?: boolean;
}): Promise<AuthGateResult> {
  const decision = currentAuthDecision();
  if (decision === "yes") return { ok: true };
  if (decision === "no") {
    if (!options?.silent) promptInteractionLogin(options);
    return { ok: false };
  }

  try {
    const token = await TokenUtils.getAuthToken();
    if (token && token.trim() && TokenUtils.isValidJWTFormat(token)) {
      return { ok: true };
    }
  } catch {
    // Fall through
  }

  if (options?.silent) {
    return { ok: false };
  }

  promptInteractionLogin(options);
  return { ok: false };
}
