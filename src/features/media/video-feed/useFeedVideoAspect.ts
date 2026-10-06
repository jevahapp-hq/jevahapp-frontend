import type { VideoPlayer } from "expo-video";
import { useEffect, useState } from "react";
import { aspectFromSize } from "./displayedVideoAspect";
import {
  isFeedVideoAspectSettled,
  noteTrackAspect,
  peekFeedVideoAspect,
  readTrustedAspect,
  rememberFeedVideoAspect,
  subscribeFeedVideoAspect,
} from "./feedVideoAspectCache";
import { ensureDisplayedAspect } from "./measureDisplayedAspect";
import {
  getVideoFrameSnapshot,
  subscribeVideoFrameSnapshots,
} from "./videoFrameSnapshotCache";

export { peekFeedVideoAspect, rememberFeedVideoAspect };

/**
 * Displayed width / height.
 *
 * A tall track can be trusted. A wide track may be a rotated portrait, so it
 * is ignored. A frame is never pulled from the live player — that clears the
 * picture to black. Upload probes and a separate thumbnail fill in the rest.
 */
export function useFeedVideoAspect(player: VideoPlayer | null, videoUrl: string) {
  const [trackedUrl, setTrackedUrl] = useState(videoUrl);
  const [aspect, setAspect] = useState<number | null>(() =>
    readTrustedAspect(videoUrl)
  );

  if (trackedUrl !== videoUrl) {
    setTrackedUrl(videoUrl);
    setAspect(readTrustedAspect(videoUrl));
  }

  useEffect(() => {
    return subscribeFeedVideoAspect((changedUrl) => {
      if (
        changedUrl !== videoUrl &&
        changedUrl.split("?")[0] !== videoUrl.split("?")[0]
      ) {
        return;
      }
      const next = readTrustedAspect(videoUrl);
      if (next == null) return;
      setAspect((current) => (current === next ? current : next));
    });
  }, [videoUrl]);

  useEffect(() => {
    return subscribeVideoFrameSnapshots((changedUrl) => {
      if (changedUrl !== videoUrl) return;
      const shot = getVideoFrameSnapshot(videoUrl);
      const next = aspectFromSize(shot?.width, shot?.height);
      if (next == null || next >= 1) return;
      rememberFeedVideoAspect(videoUrl, next);
      const trusted = readTrustedAspect(videoUrl);
      if (trusted != null) setAspect(trusted);
    });
  }, [videoUrl]);

  useEffect(() => {
    if (readTrustedAspect(videoUrl)) return;
    ensureDisplayedAspect(videoUrl, { allowPlayer: player != null, priority: true });
  }, [player, videoUrl]);

  useEffect(() => {
    const cached = readTrustedAspect(videoUrl);
    if (cached != null) {
      setAspect((current) => (current === cached ? current : cached));
      return;
    }
    if (!player) return;

    let cancelled = false;

    const publishPortraitTrack = () => {
      if (cancelled) return;
      try {
        const size = player.videoTrack?.size;
        noteTrackAspect(videoUrl, aspectFromSize(size?.width, size?.height));
      } catch {
        // Native player already released.
      }
      const trusted = readTrustedAspect(videoUrl);
      if (trusted != null) setAspect(trusted);
    };

    const publishKnownFrame = () => {
      if (cancelled) return;
      const shot = getVideoFrameSnapshot(videoUrl);
      const next = aspectFromSize(shot?.width, shot?.height);
      if (next == null || next >= 1) return;
      rememberFeedVideoAspect(videoUrl, next);
      const trusted = readTrustedAspect(videoUrl);
      if (trusted != null) setAspect(trusted);
    };

    let trackSub: { remove: () => void } | null = null;
    let loadSub: { remove: () => void } | null = null;
    let statusSub: { remove: () => void } | null = null;
    try {
      trackSub = player.addListener("videoTrackChange", () => {
        publishPortraitTrack();
        publishKnownFrame();
      });
      loadSub = player.addListener("sourceLoad", () => {
        publishPortraitTrack();
        publishKnownFrame();
      });
      statusSub = player.addListener("statusChange", ({ status }) => {
        if (status === "readyToPlay") {
          publishPortraitTrack();
          publishKnownFrame();
        }
      });
      publishPortraitTrack();
      publishKnownFrame();
    } catch {
      // Native player already released.
    }

    return () => {
      cancelled = true;
      trackSub?.remove();
      loadSub?.remove();
      statusSub?.remove();
    };
  }, [player, videoUrl]);

  return aspect;
}

/**
 * True once the shape is known or measuring gave up. Until then a card keeps
 * its cover, so it is never shown in one frame and then moved to another.
 * `maxWaitMs` stops a slow network from holding the picture back.
 */
export function useFeedVideoAspectSettled(
  videoUrl: string | null | undefined,
  maxWaitMs = 1500
): boolean {
  const [, setVersion] = useState(0);
  const [timedOutUrl, setTimedOutUrl] = useState<string | null>(null);
  const known = isFeedVideoAspectSettled(videoUrl);

  useEffect(() => {
    if (!videoUrl || isFeedVideoAspectSettled(videoUrl)) return;
    const timer = setTimeout(() => setTimedOutUrl(videoUrl), maxWaitMs);
    const unsubscribe = subscribeFeedVideoAspect(() => {
      if (!isFeedVideoAspectSettled(videoUrl)) return;
      unsubscribe();
      clearTimeout(timer);
      setVersion((version) => version + 1);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [videoUrl, maxWaitMs]);

  return known || (videoUrl != null && timedOutUrl === videoUrl);
}

/** Parked cards re-render when an upload probe or poster measurement lands. */
export function useRememberedFeedVideoAspect(
  videoUrl: string | null | undefined
): number | null {
  const [aspect, setAspect] = useState<number | null>(() =>
    peekFeedVideoAspect(videoUrl)
  );

  useEffect(() => {
    setAspect(peekFeedVideoAspect(videoUrl));
    if (!videoUrl) return;
    return subscribeFeedVideoAspect((changedUrl) => {
      if (
        changedUrl !== videoUrl &&
        changedUrl.split("?")[0] !== videoUrl.split("?")[0]
      ) {
        return;
      }
      setAspect(peekFeedVideoAspect(videoUrl));
    });
  }, [videoUrl]);

  return aspect;
}
