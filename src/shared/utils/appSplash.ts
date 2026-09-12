import * as SplashScreen from "expo-splash-screen";
import { PERF, perfMeasure } from "./perfMarks";

let hidden = false;

/** Hide native splash once — Home's first layout, or a fail-open timeout. */
export function hideAppSplash(): void {
  if (hidden) return;
  hidden = true;
  SplashScreen.hideAsync()
    .then(() => {
      perfMeasure(PERF.SPLASH_HIDE, PERF.APP_START);
    })
    .catch(() => {});
}

export function hasHiddenAppSplash(): boolean {
  return hidden;
}
