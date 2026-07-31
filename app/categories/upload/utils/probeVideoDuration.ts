/**
 * Probe local/remote video duration (seconds) via expo-video metadata.
 * Used so freshly uploaded feed items can seek before BE returns duration.
 */
import { createVideoPlayer } from "expo-video";

export async function probeVideoDurationSec(
  uri: string,
  timeoutMs = 5000
): Promise<number | undefined> {
  if (!uri) return undefined;

  let player: ReturnType<typeof createVideoPlayer> | null = null;
  try {
    player = createVideoPlayer({
      uri,
      contentType: "progressive",
    });

    const duration = await new Promise<number | undefined>((resolve) => {
      let settled = false;
      let sub: { remove?: () => void } | undefined;
      let statusSub: { remove?: () => void } | undefined;

      const finish = (value: number | undefined) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          sub?.remove?.();
          statusSub?.remove?.();
        } catch {
          // no-op
        }
        resolve(value);
      };

      const timer = setTimeout(() => {
        const d = player && player.duration > 0 ? player.duration : undefined;
        finish(d);
      }, timeoutMs);

      sub = player!.addListener("sourceLoad", (payload: any) => {
        const fromPayload =
          typeof payload?.duration === "number" && payload.duration > 0
            ? payload.duration
            : 0;
        const fromPlayer =
          player && player.duration > 0 ? player.duration : 0;
        const d = fromPayload || fromPlayer;
        finish(d > 0 ? d : undefined);
      });

      statusSub = player!.addListener("statusChange", (status: any) => {
        if (status?.status === "readyToPlay" && player && player.duration > 0) {
          finish(player.duration);
        }
      });
    });

    return duration;
  } catch {
    return undefined;
  } finally {
    try {
      player?.release?.();
    } catch {
      // no-op
    }
  }
}
