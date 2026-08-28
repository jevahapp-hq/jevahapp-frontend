/**
 * Routes where the Now Playing bar must not appear.
 *
 * Extracted from the visibility hook so the rules are readable and testable in
 * isolation, rather than being a 50-line block inside a `useMemo`.
 */

/** Auth and first-run flows own the whole screen. */
const BLOCKED_SEGMENTS = [
  "auth",
  "login",
  "signup",
  "sign-in",
  "sign-up",
  "onboarding",
  "welcome",
];

const BLOCKED_PATH_PREFIXES = [
  "/auth",
  "/login",
  "/signup",
  "/sign-in",
  "/sign-up",
  "/onboarding",
  "/welcome",
  // Upload has its own bottom chrome and its own media pickers.
  "/categories/upload",
];

/** Reading surfaces: the bar competes with the text and the TTS controls. */
const READING_SEGMENTS = ["bible", "biblescreen", "bibleonboarding", "reader"];

export function isRouteHostileToMiniPlayer(
  pathname: string | null,
  rawSegments: readonly string[]
): boolean {
  const segments = rawSegments.map((s) => String(s).toLowerCase());

  if (BLOCKED_PATH_PREFIXES.some((route) => pathname?.startsWith(route))) {
    return true;
  }
  if (segments.some((seg) => BLOCKED_SEGMENTS.includes(seg))) return true;
  if (segments.some((seg) => READING_SEGMENTS.includes(seg))) return true;

  return false;
}
