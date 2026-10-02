/**
 * The home feed and Reels cannot hold hardware decoders at the same time.
 * Opening Reels while the feed still has ExoPlayers paints a black page
 * and then the process is killed.
 */
type Listener = () => void;

let suspended = false;
const listeners = new Set<Listener>();

export function areFeedDecodersSuspended(): boolean {
  return suspended;
}

export function subscribeFeedDecoders(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // no-op
    }
  });
}

export function suspendFeedDecoders(): void {
  if (suspended) return;
  suspended = true;
  emit();
}

export function resumeFeedDecoders(): void {
  if (!suspended) return;
  suspended = false;
  emit();
}
