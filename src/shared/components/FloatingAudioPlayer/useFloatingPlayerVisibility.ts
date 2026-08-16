import { usePathname, useSegments } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated } from "react-native";
import {
  isMiniPlayerSuppressed,
  subscribeMiniPlayerGate,
} from "../../audio/miniPlayerGate";
import type { AudioTrack } from "../../../../app/store/useGlobalAudioPlayerStore";

type Params = {
  currentTrack: AudioTrack | null;
  stop: () => void;
};

/**
 * Route-based mini-player visibility. Avoids Clerk `useAuth()` here —
 * that hook fires telemetry on every render and can spam
 * "[clerk/telemetry] Value is a number, expected an Object" in RN.
 */
export function useFloatingPlayerVisibility({ currentTrack, stop }: Params) {
  const pathname = usePathname();
  const segments = useSegments();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const [bibleTabHidden, setBibleTabHidden] = useState(isMiniPlayerSuppressed());

  useEffect(() => subscribeMiniPlayerGate(() => {
    setBibleTabHidden(isMiniPlayerSuppressed());
  }), []);

  const shouldShowPlayer = useMemo(() => {
    if (bibleTabHidden) return false;
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

    const isAuthRoute =
      authRoutePaths.some((route) => pathname?.startsWith(route)) ||
      segments.some((seg) => authRouteSegments.includes(seg.toLowerCase()));

    if (
      (pathname as any) === "/" ||
      (pathname as any) === "/index" ||
      (segments as any).length === 0 ||
      ((segments as any).length === 1 && (segments as any)[0] === "index")
    ) {
      return false;
    }

    if (isAuthRoute) {
      return false;
    }

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

    if (pathname?.startsWith("/categories/upload")) {
      return false;
    }

    // Show whenever a track is loaded (auth is enforced elsewhere)
    return !!currentTrack;
  }, [pathname, segments, currentTrack, bibleTabHidden]);

  useEffect(() => {
    if (currentTrack && shouldShowPlayer) {
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
  }, [currentTrack, shouldShowPlayer, segments, stop, fadeAnim, slideAnim]);

  return { shouldShowPlayer, fadeAnim, slideAnim };
}
