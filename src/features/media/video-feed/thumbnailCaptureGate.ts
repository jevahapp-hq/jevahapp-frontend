/**
 * AVAssetImageGenerator and MediaMetadataRetriever hitch scrolling when several
 * run at once. Aspect reads and paused-frame snapshots share one slot.
 */
const MAX_CONCURRENT = 1;

let active = 0;
const waiters: Array<() => void> = [];

export function runThumbnailCapture<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const start = () => {
      active += 1;
      task().then(resolve, reject).finally(() => {
        active -= 1;
        const next = waiters.shift();
        if (next) next();
      });
    };
    if (active < MAX_CONCURRENT) start();
    else waiters.push(start);
  });
}
