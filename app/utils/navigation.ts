import { router } from "expo-router";

export type MainTab = "Home" | "Community" | "Library" | "Account";

export function navigateMainTab(tab: MainTab) {
  switch (tab) {
    case "Home":
      router.replace({ pathname: "/categories/HomeScreen" });
      break;
    case "Community":
      router.replace({ pathname: "/screens/PrayerWallScreen" });
      break;
    case "Library":
      router.replace({ pathname: "/screens/library/LibraryScreen" });
      break;
    case "Account":
      router.replace({ pathname: "/screens/AccountScreen" });
      break;
    default:
      break;
  }
}


