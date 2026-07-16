/**
 * videoConnectionWarmer - Fire-and-forget "warm up" requests for upcoming
 * videos.
 *
 * A real <Video> player can only safely be mounted for a couple of items at
 * once (see index.tsx) because Android only has a handful of hardware video
 * decoder slots - mounting too many causes some videos to render black while
 * still playing audio. That means most upcoming videos in the feed don't get
 * a real player until the user is already very close to them, which is the
 * main reason there's still a visible gap between a video becoming active
 * and its first frame painting: DNS lookup, TLS handshake, and CDN
 * edge-routing for that URL haven't happened yet.
 *
 * This does the cheap, decoder-free part of that work ahead of time: a small
 * ranged GET (no full player, no decoding) that forces the connection to
 * the CDN to be established and the first chunk of the file to start
 * flowing, so that whenever the real player does mount, the OS/network
 * stack already has a head start instead of starting from zero.
 */

const WARMED_URLS = new Map<string, number>();
const MAX_TRACKED_URLS = 150;
const WARM_RANGE_BYTES = 65_536; // 64KB - enough to warm DNS/TLS/CDN routing without burning much data on items that never get watched

function rememberWarmed(url: string) {
  WARMED_URLS.set(url, Date.now());
  if (WARMED_URLS.size > MAX_TRACKED_URLS) {
    const oldestKey = WARMED_URLS.keys().next().value;
    if (oldestKey) WARMED_URLS.delete(oldestKey);
  }
}

export function warmVideoConnection(url: string | null | undefined): void {
  if (!url || typeof url !== "string") return;
  if (url.startsWith("file://") || url.startsWith("/")) return; // already local, nothing to warm
  if (WARMED_URLS.has(url)) return;

  rememberWarmed(url);

  fetch(url, {
    method: "GET",
    headers: { Range: `bytes=0-${WARM_RANGE_BYTES - 1}` },
  }).catch(() => {
    // Best-effort only - a failed warm-up just means no head start, the
    // real player will still try to load the source normally.
  });
}
