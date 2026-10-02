/**
 * Mount heavy root overlays after the first frame so cold start does not
 * pay for them upfront.
 *
 * These used to be React.lazy. On Android that fires a second bundle
 * download (fetchAsync), which fails with "Could not load bundle" and the
 * root error boundary blanks the app. iPhone's chunk fetch usually
 * succeeds. Loading them with the main bundle avoids that request.
 * CommentModalV2 stays sync as well — the docked sheet must not race a load.
 */
import { useEffect, useState } from "react";
import {
  installFeedEventLifecycle,
  uninstallFeedEventLifecycle,
} from "../../src/shared/feed";
import { useCopyrightFreeOverlayStore } from "@/store/useCopyrightFreeOverlayStore";
import FloatingAudioPlayer from "../../src/shared/components/FloatingAudioPlayer";
import AuthGlassToastHost from "./auth/AuthGlassToastHost";
import CommentModalV2 from "./CommentModalV2";
import CopyrightFreeSongOverlayHost from "./CopyrightFreeSongOverlayHost";
import ErrorBoundary from "./ErrorBoundary";
import RootCreateFab from "./RootCreateFab";
import ServerUnavailableModalWrapper from "./ServerUnavailableModalWrapper";

export default function DeferredRootOverlays() {
  const [ready, setReady] = useState(false);
  const playerRequested = useCopyrightFreeOverlayStore(
    (s) => s.surface === "full" && !!s.song
  );

  useEffect(() => {
    let cancelled = false;
    const task = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 0);
    installFeedEventLifecycle();
    return () => {
      cancelled = true;
      clearTimeout(task);
      uninstallFeedEventLifecycle();
    };
  }, []);

  return (
    <>
      <AuthGlassToastHost />
      <CommentModalV2 />
      <ErrorBoundary fallback={null}>
      {playerRequested || ready ? <CopyrightFreeSongOverlayHost /> : null}
      {ready ? (
        <>
          <FloatingAudioPlayer />
          <ServerUnavailableModalWrapper />
        </>
      ) : null}
      </ErrorBoundary>
      <RootCreateFab />
    </>
  );
}
