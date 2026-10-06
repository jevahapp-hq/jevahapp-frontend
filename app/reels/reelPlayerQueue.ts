import type { VideoPlayer } from "expo-video";

/**
 * Native player calls block the JS thread on Android until ExoPlayer answers.
 * Taps and the next frame run between queued calls, and a newer command for
 * the same reel replaces the one still waiting.
 */

/** Stop every mounted reel except the one on screen. Mute alone leaves audio running. */
export function silenceReelPlayersExcept(
  keepKey: string | null,
  refs: Record<string, VideoPlayer> | null | undefined
): void {
  if (!refs) return;
  for (const key of Object.keys(refs)) {
    if (keepKey != null && key === keepKey) continue;
    const player = refs[key];
    if (!player) continue;
    try {
      player.muted = true;
      player.volume = 0;
      player.pause();
    } catch {
      // Released native player.
    }
  }
}
type Kind = "pause" | "hear" | "warm";

type Job = {
  key: string;
  kind: Kind;
  run: () => void;
};

const buckets: Record<Kind, Job[]> = {
  pause: [],
  hear: [],
  warm: [],
};

let pumping = false;
let quietUntil = 0;

export function markReelPlayerCommand(): void {
  quietUntil = Date.now() + 450;
}

/** True while a command we just sent may still be echoing back as playingChange. */
export function reelPlayerCommandQuiet(): boolean {
  return Date.now() < quietUntil;
}

const lastRan = new Map<string, { kind: Kind; at: number }>();

export function enqueueReelPlayerJob(
  key: string,
  kind: Kind,
  run: () => void
): void {
  const recent = lastRan.get(key);
  if (recent && recent.kind === kind && Date.now() - recent.at < 80) return;
  (Object.keys(buckets) as Kind[]).forEach((name) => {
    const list = buckets[name];
    const index = list.findIndex((job) => job.key === key);
    if (index >= 0) list.splice(index, 1);
  });
  buckets[kind].push({ key, kind, run });
  if (pumping) return;
  pumping = true;
  // Pause and play run in this turn. Waiting for the next frame left the
  // reel you left audible and the reel you landed on silent.
  flushNextReelPlayerJob();
}

function flushNextReelPlayerJob(): void {
  let ran = 0;
  while (ran < 4) {
    const job =
      buckets.pause.shift() ||
      buckets.hear.shift() ||
      (ran === 0 ? buckets.warm.shift() : undefined);
    if (!job) {
      pumping = false;
      return;
    }
    if (job.kind === "warm" && ran > 0) {
      buckets.warm.unshift(job);
      setTimeout(flushNextReelPlayerJob, 0);
      return;
    }
    try {
      markReelPlayerCommand();
      lastRan.set(job.key, { kind: job.kind, at: Date.now() });
      job.run();
    } catch {
      // Released native player.
    }
    ran += 1;
  }
  if (
    buckets.pause.length > 0 ||
    buckets.hear.length > 0 ||
    buckets.warm.length > 0
  ) {
    setTimeout(flushNextReelPlayerJob, 0);
    return;
  }
  pumping = false;
}
