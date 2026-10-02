/**
 * One-shot first-frame grab for the upload video tile.
 * Releases the player immediately so Post + feed do not share a decoder.
 * Releasing twice, or releasing during a screen pop, crashes iOS.
 */
import { createVideoPlayer } from "expo-video";
import { isLiteProfileActive } from "../../../../src/shared/lite/liteProfile";

type PreviewSession = {
  promise: Promise<unknown | null>;
  release: () => void;
};

let activeRelease: (() => void) | null = null;

export function releaseUploadVideoPreview(): void {
  const release = activeRelease;
  activeRelease = null;
  release?.();
}

export function startUploadVideoPreview(uri: string): PreviewSession {
  releaseUploadVideoPreview();

  let player: ReturnType<typeof createVideoPlayer> | null = null;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    if (activeRelease === release) activeRelease = null;
    const current = player;
    player = null;
    try {
      current?.release?.();
    } catch {
      // no-op
    }
  };
  activeRelease = release;

  const promise = (async () => {
    if (!uri) return null;
    try {
      player = createVideoPlayer({
        uri,
        contentType: "progressive",
      });
      if (released) return null;
      const maxWidth = isLiteProfileActive() ? 240 : 480;
      const thumbs = await Promise.race([
        player.generateThumbnailsAsync([0.15], { maxWidth }),
        new Promise<never[]>((resolve) => {
          setTimeout(() => resolve([]), 4000);
        }),
      ]);
      return thumbs[0] ?? null;
    } catch {
      return null;
    } finally {
      release();
    }
  })();

  return { promise, release };
}
