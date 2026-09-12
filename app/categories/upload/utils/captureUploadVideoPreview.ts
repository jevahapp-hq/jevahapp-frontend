/**
 * One-shot first-frame grab for the upload video tile.
 * Releases the player immediately so Post + feed do not share a decoder.
 */
import { createVideoPlayer } from "expo-video";
import { isLiteProfileActive } from "../../../../src/shared/lite/liteProfile";

export async function captureUploadVideoPreview(
  uri: string
): Promise<unknown | null> {
  if (!uri) return null;

  let player: ReturnType<typeof createVideoPlayer> | null = null;
  try {
    player = createVideoPlayer({
      uri,
      contentType: "progressive",
    });
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
    try {
      player?.release?.();
    } catch {
      // no-op
    }
  }
}
