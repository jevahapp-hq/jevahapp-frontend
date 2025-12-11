import { router } from "expo-router";

export type MainTab = "Home" | "Community" | "Library" | "Account" | "Bible";

export function navigateMainTab(tab: MainTab) {
  switch (tab) {
    case "Home":
      router.replace({ pathname: "/categories/HomeScreen" });
      break;
    case "Community":
      router.replace({ pathname: "/screens/CommunityScreen" });
      break;
    case "Library":
      router.replace({ pathname: "/screens/library/LibraryScreen" });
      break;
    case "Account":
      router.replace({ pathname: "/screens/AccountScreen" });
      break;
    case "Bible":
      router.replace({ pathname: "/categories/HomeScreen", params: { default: "Bible" } });
      break;
    default:
      break;
  }
}


