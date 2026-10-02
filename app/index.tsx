import { useAuth, useUser } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, router } from "expo-router";
import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import AppLaunchScreen from "./components/AppLaunchScreen";
import { appMmkv } from "../src/shared/cache/mmkvStorage";
import {
  hasBackendSession,
  hasBackendSessionSync,
} from "./utils/sessionAuth";
import { hideAppSplash } from "../src/shared/utils/appSplash";
import { restoreBackendSessionFromClerk } from "./utils/restoreClerkSession";
import "../global.css";

const WelcomeLanding = React.lazy(() => import("./components/WelcomeLanding"));

const ONBOARDING_MMKV = "onboardingSeen";

function hasOnboardingSeenSync(): boolean {
  try {
    return appMmkv.getString(ONBOARDING_MMKV) === "1";
  } catch {
    return false;
  }
}

function markOnboardingSeenSync(): void {
  try {
    appMmkv.set(ONBOARDING_MMKV, "1");
  } catch {
    // no-op
  }
  void AsyncStorage.setItem("onboardingSeen", "true").catch(() => {});
}

function BootSpinner() {
  return <AppLaunchScreen />;
}

/**
 * Fast boot gate: returning users with a sync session hint go straight to Home
 * (no spinner, no AsyncStorage await). Clerk is only for first-run OAuth.
 */
export default function Welcome() {
  // Instant path — paint Home on the same tick as mount when possible.
  if (hasOnboardingSeenSync() && hasBackendSessionSync()) {
    return <Redirect href="/categories/HomeScreen" />;
  }

  return <WelcomeAsyncGate />;
}

function WelcomeAsyncGate() {
  const [showIntro, setShowIntro] = useState(true);
  const [skipIntro, setSkipIntro] = useState(() => hasOnboardingSeenSync());
  const [hasSession, setHasSession] = useState(() => hasBackendSessionSync());
  const [onboardingReady, setOnboardingReady] = useState(() =>
    hasOnboardingSeenSync()
  );
  const [redirected, setRedirected] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const userRef = useRef(user);
  userRef.current = user;
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const isSignedInRef = useRef(isSignedIn);
  isSignedInRef.current = isSignedIn;

  useEffect(() => {
    let cancelled = false;

    const initOnboarding = async () => {
      try {
        const [seenFlag, session] = await Promise.all([
          AsyncStorage.getItem("onboardingSeen"),
          hasBackendSession(),
        ]);

        if (cancelled) return;

        setHasSession(session);

        if (seenFlag === "true" || hasOnboardingSeenSync()) {
          markOnboardingSeenSync();
          setSkipIntro(true);
        } else {
          markOnboardingSeenSync();
        }
      } catch {
        // fall through
      } finally {
        if (!cancelled) {
          setOnboardingReady(true);
          setSessionChecked(true);
        }
      }
    };

    void initOnboarding();

    const timeout = setTimeout(() => {
      if (!cancelled) setOnboardingReady(true);
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  // Session confirmed async — jump to Home without waiting on Clerk
  useEffect(() => {
    if (!onboardingReady || redirected) return;
    if (skipIntro && hasSession) {
      setRedirected(true);
      router.replace("/categories/HomeScreen");
    }
  }, [onboardingReady, skipIntro, hasSession, redirected]);

  // Login / intro: Home is not coming — drop the native splash onto the branded boot screen.
  useEffect(() => {
    if (!onboardingReady) return;
    if (skipIntro && hasSession) return;
    hideAppSplash();
  }, [onboardingReady, skipIntro, hasSession]);

  // No backend token yet. If Google/Apple is still signed in, exchange it
  // and open Home. Only then show the login form.
  useEffect(() => {
    if (!onboardingReady || !sessionChecked || redirected) return;
    if (!skipIntro) return;
    if (hasSession) return;
    if (!authLoaded) return;

    let cancelled = false;
    void (async () => {
      if (isSignedInRef.current) {
        try {
          const restored = await restoreBackendSessionFromClerk(
            () => userRef.current,
            () => getTokenRef.current()
          );
          if (cancelled) return;
          if (restored) {
            setHasSession(true);
            setRedirected(true);
            router.replace("/categories/HomeScreen");
            return;
          }
        } catch {
          // Exchange failed. The login form is the remaining path.
        }
      }
      if (cancelled) return;
      setRedirected(true);
      router.replace("/auth/login");
    })();

    return () => {
      cancelled = true;
    };
  }, [
    onboardingReady,
    sessionChecked,
    skipIntro,
    hasSession,
    authLoaded,
    redirected,
  ]);

  const handleIntroFinished = useCallback(() => setShowIntro(false), []);

  if (skipIntro && hasSession) {
    return <Redirect href="/categories/HomeScreen" />;
  }

  if (!onboardingReady) {
    return <BootSpinner />;
  }

  if (skipIntro && (hasSession || !authLoaded || redirected)) {
    return <BootSpinner />;
  }

  if (!authLoaded) {
    return <BootSpinner />;
  }

  if (skipIntro) {
    return <BootSpinner />;
  }

  return (
    <Suspense fallback={<BootSpinner />}>
      <WelcomeLanding
        showIntro={showIntro}
        onIntroFinished={handleIntroFinished}
      />
    </Suspense>
  );
}
