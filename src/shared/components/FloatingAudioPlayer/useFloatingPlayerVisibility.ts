import { useAuth } from "@clerk/clerk-expo";
import { usePathname, useSegments } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { Animated } from "react-native";
import { useUserProfile } from "../../../../app/hooks/useUserProfile";
import type { AudioTrack } from "../../../../app/store/useGlobalAudioPlayerStore";

type Params = {
  currentTrack: AudioTrack | null;
  stop: () => void;
};

export function useFloatingPlayerVisibility({ currentTrack, stop }: Params) {
  const pathname = usePathname();
  const segments = useSegments();
  const { user, loading: userLoading } = useUserProfile();
  const { isSignedIn, isLoaded: clerkLoaded } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  // Check if user is authenticated and not on auth/onboarding screens
  // Show player if there's a track, even if auth isn't fully loaded (for better UX)
  const shouldShowPlayer = useMemo(() => {
    // Don't show on auth/onboarding screens - always hide there
    const authRouteSegments = [
      "auth",
      "login",
      "signup",
      "sign-in",
      "sign-up",
      "onboarding",
      "welcome",
    ];
    const authRoutePaths = [
      "/auth",
      "/login",
      "/signup",
      "/sign-in",
      "/sign-up",
      "/onboarding",
      "/welcome",
    ];

    // Check if current path is an auth route
    const isAuthRoute =
      authRoutePaths.some((route) => pathname?.startsWith(route)) ||
      segments.some((seg) => authRouteSegments.includes(seg.toLowerCase()));

    // Don't show on root/index screen (welcome/onboarding)
    if (
      (pathname as any) === "/" ||
      (pathname as any) === "/index" ||
      (segments as any).length === 0 ||
      ((segments as any).length === 1 && (segments as any)[0] === "index")
    ) {
      return false;
    }

    // If on auth route, never show
    if (isAuthRoute) {
      return false;
    }

    // Hide entirely on any Bible-related routes (onboarding + reader),
    // so mini player is not visible there at all.
    const bibleRouteSegments = [
      "bible",
      "biblescreen",
      "bibleonboarding",
      "reader",
    ];
    const inBibleRoute = segments.some((seg) =>
      bibleRouteSegments.includes(seg.toLowerCase())
    );
    if (inBibleRoute) {
      return false;
    }

    // Hide on upload screen so it doesn't block the upload form,
    // but keep audio playing in the background.
    if (pathname?.startsWith("/categories/upload")) {
      return false;
    }

    // If there's a current track, ALWAYS show the player (even if auth is still loading)
    // This allows the player to appear immediately when a song starts playing
    if (currentTrack) {
      return true;
    }

    // If no track, only show if fully authenticated (but this shouldn't happen since we return null if no track)
    // This is just for safety - the component will return null anyway if no track
    return false;
  }, [
    isSignedIn,
    clerkLoaded,
    user,
    userLoading,
    pathname,
    segments,
    currentTrack,
  ]);

  // Fade-in and slide-up animation when track appears
  useEffect(() => {
    // If we're on any Bible route, force-stop audio so nothing plays in background
    const bibleRouteSegments = [
      "bible",
      "biblescreen",
      "bibleonboarding",
      "reader",
    ];
    const inBibleRoute = segments.some((seg) =>
      bibleRouteSegments.includes(seg.toLowerCase())
    );
    if (inBibleRoute && currentTrack) {
      stop();
      return;
    }

    if (currentTrack && shouldShowPlayer) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentTrack, shouldShowPlayer]);

  return { shouldShowPlayer, fadeAnim, slideAnim };
}
