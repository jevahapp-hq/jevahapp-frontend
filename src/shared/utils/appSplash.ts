import * as SplashScreen from "expo-splash-screen";
import { PERF, perfMeasure } from "./perfMarks";

let nativeHidden = false;
let appReady = false;
const readyListeners = new Set<() => void>();

/** Drop the native splash so the in-app launch screen can show through. */
export function hideNativeSplash(): void {
  if (nativeHidden) return;
  nativeHidden = true;
  SplashScreen.hideAsync()
    .then(() => {
      perfMeasure(PERF.SPLASH_HIDE, PERF.APP_START);
    })
    .catch(() => {});
}

/** Home painted, or the fail-open timeout — launch screen can leave. */
export function hideAppSplash(): void {
  hideNativeSplash();
  if (appReady) return;
  appReady = true;
  readyListeners.forEach((listener) => listener());
  readyListeners.clear();
}

export function subscribeAppReady(listener: () => void): () => void {
  if (appReady) listener();
  else readyListeners.add(listener);
  return () => readyListeners.delete(listener);
}

export function hasHiddenAppSplash(): boolean {
  return appReady;
}
