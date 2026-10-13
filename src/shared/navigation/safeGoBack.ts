import { router } from "expo-router";

/** `router.back()` throws in dev when the stack has no previous screen. */
export function safeGoBack(fallbackHref: string = "/") {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallbackHref as any);
}
