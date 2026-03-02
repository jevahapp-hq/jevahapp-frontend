import { useMemo } from "react";
import { useAuth } from "@clerk/clerk-expo";

interface UsePlayerVisibilityProps {
  pathname: string | null;
  segments: string[];
  currentTrack: any;
  user: any;
  userLoading: boolean;
}

export function usePlayerVisibility({
  pathname,
  segments,
  currentTrack,
  user,
  userLoading,
}: UsePlayerVisibilityProps) {
  const { isSignedIn, isLoaded: clerkLoaded } = useAuth();

  const shouldShowPlayer = useMemo(() => {
    const authRouteSegments = ['auth', 'login', 'signup', 'sign-in', 'sign-up', 'onboarding', 'welcome'];
    const authRoutePaths = ['/auth', '/login', '/signup', '/sign-in', '/sign-up', '/onboarding', '/welcome'];

    const isAuthRoute =
      authRoutePaths.some(route => pathname?.startsWith(route)) ||
      segments.some(seg => authRouteSegments.includes(seg.toLowerCase()));

    if ((pathname as any) === '/' || (pathname as any) === '/index' || (segments as any).length === 0 || ((segments as any).length === 1 && (segments as any)[0] === 'index')) {
      return false;
    }

    if (isAuthRoute) {
      return false;
    }

    const bibleRouteSegments = ['bible', 'biblescreen', 'bibleonboarding', 'reader'];
    const inBibleRoute = segments.some(seg =>
      bibleRouteSegments.includes(seg.toLowerCase())
    );
    if (inBibleRoute) {
      return false;
    }

    if (pathname?.startsWith("/categories/upload")) {
      return false;
    }

    if (currentTrack) {
      return true;
    }

    return false;
  }, [isSignedIn, clerkLoaded, user, userLoading, pathname, segments, currentTrack]);

  return shouldShowPlayer;
}
