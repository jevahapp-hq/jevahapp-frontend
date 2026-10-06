type ReleasablePlayer = {
  pause?: () => void;
  destroy?: () => void;
  remove?: () => void;
  release?: () => void;
  clearLockScreenControls?: () => void;
};

let onRelease: ((player: unknown) => void) | null = null;

/** Lets the queue engine drop its singleton when the player is torn down. */
export function setAudioEngineReleaseHook(hook: (player: unknown) => void): void {
  onRelease = hook;
}

/** Tear down a manually created expo-audio player or playlist. */
export function releaseAudioPlayer(player: ReleasablePlayer | null | undefined): void {
  if (!player) return;
  const releaseHook = onRelease;
  onRelease = null;
  try {
    releaseHook?.(player);
  } finally {
    onRelease = releaseHook;
  }
  try {
    player.pause?.();
  } catch {
    // already stopped
  }
  try {
    player.clearLockScreenControls?.();
  } catch {
    // ignore
  }
  try {
    if (player.destroy) {
      player.destroy();
      return;
    }
  } catch {
    // already destroyed
  }
  try {
    player.remove?.();
  } catch {
    // ignore
  }
  try {
    player.release?.();
  } catch {
    // already released
  }
}
