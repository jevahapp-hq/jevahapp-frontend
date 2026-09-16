import { isValidJwtFormat } from "./jwtFormat";

export type InteractionAuthDecision = "yes" | "no" | "unknown";

/**
 * Sync gate for likes/saves. Prefer a cached JWT, then the MMKV session hint
 * so a logged-in tap never waits on SecureStore.
 */
export function decideInteractionAuth(options: {
  cachedToken: string | null | undefined;
  sessionHint: boolean;
}): InteractionAuthDecision {
  const token = options.cachedToken;
  if (typeof token === "string" && isValidJwtFormat(token)) return "yes";
  if (options.sessionHint) return "yes";
  if (token === undefined) return "unknown";
  return "no";
}
