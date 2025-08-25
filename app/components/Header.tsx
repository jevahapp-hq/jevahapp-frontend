import { useRouter } from "expo-router";
import { useUserProfile } from "../hooks/useUserProfile";
import MobileHeader from "./MobileHeader";

export default function Header() {
  const { user, loading, getAvatarUrl } = useUserProfile();
  const router = useRouter();

  const rightActions = [
    {
      icon: "search-outline",
      onPress: () => router.push("/ExploreSearch/ExploreSearch"),
    },
    {
      icon: "notifications-outline",
      onPress: () => router.push("/noitfication/NotificationsScreen"),
      badge: true,
    },
    {
      icon: "download-outline",
      onPress: () => router.push("/downloads/DownloadsScreen"),
    },
  ];

  return (
    <MobileHeader
      type="main"
      user={user ? {
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: getAvatarUrl(user) || undefined,
        section: user.section,
        isOnline: true,
      } : loading ? {
        firstName: "Loading...",
        lastName: "",
        section: "USER",
        isOnline: false,
      } : undefined}
      rightActions={rightActions}
    />
  );
}
