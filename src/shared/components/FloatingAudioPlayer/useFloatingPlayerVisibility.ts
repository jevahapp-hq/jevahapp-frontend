import { usePathname, useSegments } from "expo-router";
import { useMemo, useSyncExternalStore } from "react";
import { useCopyrightFreeOverlayStore } from "@/store/useCopyrightFreeOverlayStore";
import type { AudioTrack } from "@/store/useGlobalAudioPlayerStore";
import {
  isMiniPlayerSuppressed,
  subscribeMiniPlayerGate,
} from "../../audio/miniPlayerGate";
import { isRouteHostileToMiniPlayer } from "./miniPlayerRoutePolicy";

type Params = {
  currentTrack: AudioTrack | null;
  isSessionActive: boolean;
};

function useSuppressed(): boolean {
  return useSyncExternalStore(
    subscribeMiniPlayerGate,
    isMiniPlayerSuppressed,
    isMiniPlayerSuppressed
  );
}

export function useFloatingPlayerVisibility({
  currentTrack,
  isSessionActive,
}: Params) {
  const pathname = usePathname();
  const segments = useSegments();
  const suppressed = useSuppressed();
  const overlayCovered = useCopyrightFreeOverlayStore(
    (s) => s.surface === "full"
  );

  const shouldMountPlayer = useMemo(() => {
    if (suppressed) return false;
    if (!isSessionActive) return false;
    if (!currentTrack) return false;
    return !isRouteHostileToMiniPlayer(pathname, segments);
  }, [pathname, segments, currentTrack, isSessionActive, suppressed]);

  return { shouldMountPlayer, overlayCovered };
}
