import type { VideoPlayer } from "expo-video";
import { useEffect, useState } from "react";
import {
  aspectFromSize,
  confirmedAspectFromTrack,
} from "./displayedVideoAspect";
import {
  getVideoFrameSnapshot,
  subscribeVideoFrameSnapshots,
} from "./videoFrameSnapshotCache";

const aspectByUrl = new Map<string, number>();
/** Wide ratios are stored only after a rotated frame confirms them. */
const frameConfirmedUrls = new Set<string>();

function readTrustedAspect(videoUrl: string | null | undefined): number | null {
  if (!videoUrl) return null;
  const aspect = aspectByUrl.get(videoUrl) ?? null;
  if (aspect == null || !(aspect > 0)) return null;
  if (aspect >= 1 && !frameConfirmedUrls.has(videoUrl)) return null;
  return aspect;
}

/** Last measured ratio for this file, if a player has already read it. */
export function peekFeedVideoAspect(videoUrl: string | null | undefined): number | null {
  return readTrustedAspect(videoUrl);
}

/**
 * Displayed width / height.
 *
 * The track size is the layout ratio. A frame is never pulled from the
 * live player — that clears the picture to black.
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
    return subscribeVideoFrameSnapshots((changedUrl) => {
      if (changedUrl !== videoUrl) return;
      const shot = getVideoFrameSnapshot(videoUrl);
      const next = aspectFromSize(shot?.width, shot?.height);
      if (next == null) return;
      const current = readTrustedAspect(videoUrl);
      if (current != null && current < 1 && next < 1) return;
      frameConfirmedUrls.add(videoUrl);
      aspectByUrl.set(videoUrl, next);
      setAspect(next);
    });
  }, [videoUrl]);

  useEffect(() => {
    const cached = readTrustedAspect(videoUrl);
    if (cached != null) {
      setAspect((current) => (current === cached ? current : cached));
      return;
    }
    if (!player) return;

    let cancelled = false;
    let publishedSource: "none" | "track" | "frame" = "none";

    const publish = (next: number | null, source: "track" | "frame") => {
      if (cancelled || next == null || !(next > 0)) return;
      const trusted =
        source === "track" ? confirmedAspectFromTrack(next) : next;
      if (trusted == null) return;
      if (publishedSource === "track" || publishedSource === "frame") return;
      publishedSource = source;
      if (source === "frame") frameConfirmedUrls.add(videoUrl);
      aspectByUrl.set(videoUrl, trusted);
      setAspect(trusted);
    };

    const readTrack = (): number | null => {
      try {
        const size = player.videoTrack?.size;
        return confirmedAspectFromTrack(
          aspectFromSize(size?.width, size?.height)
        );
      } catch {
        return null;
      }
    };

    const publishPortraitTrack = () => {
      publish(readTrack(), "track");
    };

    const publishKnownFrame = () => {
      const shot = getVideoFrameSnapshot(videoUrl);
      publish(aspectFromSize(shot?.width, shot?.height), "frame");
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
