import { useAuth } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, router } from "expo-router";
import React, { Suspense, useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { appMmkv } from "../src/shared/cache/mmkvStorage";
import {
  hasBackendSession,
  hasBackendSessionSync,
} from "./utils/sessionAuth";
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
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
      }}
    />
  );
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

  const { isLoaded: authLoaded } = useAuth();

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
        if (!cancelled) setOnboardingReady(true);
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

  // No session: after Clerk loads, send to login
  useEffect(() => {
    if (!onboardingReady || redirected) return;
    if (!skipIntro) return;
    if (hasSession) return;
    if (!authLoaded) return;

    setRedirected(true);
    router.replace("/auth/login");
  }, [onboardingReady, skipIntro, hasSession, authLoaded, redirected]);

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
