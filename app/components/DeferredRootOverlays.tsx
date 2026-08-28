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
import AuthGlassToastHost from "./auth/AuthGlassToastHost";
import CommentModalV2 from "./CommentModalV2";
import CopyrightFreeSongOverlayHost from "./CopyrightFreeSongOverlayHost";
import FabTapCatcher from "./FabTapCatcher";
import FloatingAudioPlayer from "../../src/shared/components/FloatingAudioPlayer";

const SessionExpiredOverlay = React.lazy(
  () => import("./SessionExpiredOverlay")
);
const ServerUnavailableModalWrapper = React.lazy(
  () => import("./ServerUnavailableModalWrapper")
);

export default function DeferredRootOverlays() {
  const [ready, setReady] = useState(false);

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
      <CopyrightFreeSongOverlayHost />
      <FloatingAudioPlayer />
      <FabTapCatcher />
      {ready ? (
        <Suspense fallback={null}>
          <SessionExpiredOverlay />
          <ServerUnavailableModalWrapper />
        </Suspense>
      ) : null}
    </>
  );
}
