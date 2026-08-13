import { router } from "expo-router";

export type MainTab = "Home" | "Community" | "Library" | "Account" | "Bible";

/**
 * Prefer the HomeScreen keep-alive shell for main tabs (instant setState).
 * Account stays a dedicated route.
 */
export function navigateMainTab(tab: MainTab) {
  if (tab === "Account") {
    router.replace({ pathname: "/screens/AccountScreen" });
    return;
  }

  // Funnel into HomeScreen tab cache — avoids remounting Community/Library/Bible
  router.replace({
    pathname: "/categories/HomeScreen",
    params: tab === "Home" ? {} : { default: tab },
  });
}
