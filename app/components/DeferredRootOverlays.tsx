/**
 * Mount heavy root overlays after first interactions so cold start
 * does not pay for FloatingAudio / session UI upfront.
 * CommentModalV2 is sync — docked sheet must not race Suspense/lazy load.
 */
import React, { Suspense, useEffect, useState } from "react";
import { InteractionManager } from "react-native";
import {
  installFeedEventLifecycle,
  uninstallFeedEventLifecycle,
} from "../../src/shared/feed";
import { useCopyrightFreeOverlayStore } from "@/store/useCopyrightFreeOverlayStore";
import AuthGlassToastHost from "./auth/AuthGlassToastHost";
import CommentModalV2 from "./CommentModalV2";
import RootCreateFab from "./RootCreateFab";

const SessionExpiredOverlay = React.lazy(
  () => import("./SessionExpiredOverlay")
);
const ServerUnavailableModalWrapper = React.lazy(
  () => import("./ServerUnavailableModalWrapper")
);
const CopyrightFreeSongOverlayHost = React.lazy(
  () => import("./CopyrightFreeSongOverlayHost")
);
const FloatingAudioPlayer = React.lazy(
  () => import("../../src/shared/components/FloatingAudioPlayer")
);

export default function DeferredRootOverlays() {
  const [ready, setReady] = useState(false);
  const playerRequested = useCopyrightFreeOverlayStore(
    (s) => s.surface === "full" && !!s.song
  );

  useEffect(() => {
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      if (!cancelled) setReady(true);
    });
    // SessionExpiredOverlay must subscribe before a cold-start refresh
    // failure, or the login redirect is missed.
    const fallback = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 400);
    installFeedEventLifecycle();
    return () => {
      cancelled = true;
      task.cancel();
      clearTimeout(fallback);
      uninstallFeedEventLifecycle();
    };
  }, []);

  return (
    <>
      <AuthGlassToastHost />
      <CommentModalV2 />
      {playerRequested || ready ? (
        <Suspense fallback={null}>
          <CopyrightFreeSongOverlayHost />
        </Suspense>
      ) : null}
      {ready ? (
        <Suspense fallback={null}>
          <FloatingAudioPlayer />
          <SessionExpiredOverlay />
          <ServerUnavailableModalWrapper />
        </Suspense>
      ) : null}
      <RootCreateFab />
    </>
  );
}
