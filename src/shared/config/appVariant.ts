/**
 * Build-time app SKU: "full" (flagship) vs "lite" (2GB / budget phones).
 * Set via EAS: EXPO_PUBLIC_APP_VARIANT=lite | full
 *
 * - Full app → com.italgyirhrudhdhd.jevahapp (runtime auto-lite on low RAM only)
 * - Lite app → com.italgyirhrudhdhd.jevahapp.lite (always lite, smaller native binary)
 */
export type AppVariant = "full" | "lite";

export function getAppVariant(): AppVariant {
  const raw = (process.env.EXPO_PUBLIC_APP_VARIANT || "full").trim().toLowerCase();
  return raw === "lite" ? "lite" : "full";
}

/** True when this binary is the dedicated Jevah Lite SKU (separate Play listing / APK). */
export function isLiteAppBuild(): boolean {
  return getAppVariant() === "lite";
}

export function isFullAppBuild(): boolean {
  return !isLiteAppBuild();
}

export const ANDROID_PACKAGE = {
  full: "com.italgyirhrudhdhd.jevahapp",
  lite: "com.italgyirhrudhdhd.jevahapp.lite",
} as const;
