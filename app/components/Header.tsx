import { useRouter } from "expo-router";
import { useUserProfile } from "../hooks/useUserProfile";
import MobileHeader from "./MobileHeader";
import { NotificationBadge } from "./NotificationBadge";

export default function Header() {
  const { user, loading, getAvatarUrl, error } = useUserProfile();
  const router = useRouter();

  console.log("🔍 Header: User data:", user);
  console.log("🔍 Header: User section:", user?.section);
  console.log("🔍 Header: Loading:", loading);
  console.log("🔍 Header: Error:", error);

  // Helper function to normalize section value
  const normalizeSection = (section: string | undefined | null): string => {
    if (!section) return "ADULT";

    const normalized = section.toLowerCase().trim();
    if (normalized === "adult" || normalized === "adults") return "ADULT";
    if (
      normalized === "kid" ||
      normalized === "kids" ||
      normalized === "child" ||
      normalized === "children"
    )
      return "KID";

    return "ADULT"; // Default fallback
  };

  const rightActions = [
    {
      icon: "search-outline",
      onPress: () => router.push("/ExploreSearch/ExploreSearch"),
    },
    {
      icon: "notifications-outline",
      onPress: () => router.push("/noitfication/NotificationsScreen"),
      badge: (
        <NotificationBadge
          size="small"
          onPress={() => router.push("/noitfication/NotificationsScreen")}
        />
      ),
    },
    {
      icon: "download-outline",
      onPress: () => router.push("/downloads/DownloadsScreen"),
    },
  ];

  return (
    <MobileHeader
      type="main"
      user={
        user
          ? {
              firstName: user.firstName,
              lastName: user.lastName,
              avatar: getAvatarUrl(user) || undefined,
              section: normalizeSection(user.section),
              isOnline: true,
            }
          : loading
          ? {
              firstName: "Loading...",
              lastName: "",
              section: "USER",
              isOnline: false,
            }
          : undefined
      }
      rightActions={rightActions}
    />
  );
}
