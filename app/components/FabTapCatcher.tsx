import { Pressable } from "react-native";
import { useCopyrightFreeOverlayStore } from "@/store/useCopyrightFreeOverlayStore";
import { useGlobalAudioPlayerStore } from "@/store/useGlobalAudioPlayerStore";
import { useFloatingPlayerVisibility } from "../../src/shared/components/FloatingAudioPlayer/useFloatingPlayerVisibility";
import { emitFabTap } from "../../src/shared/layout/fabTapBridge";
import { getFabWrapperBottom } from "../../src/shared/layout/bottomChromeLayout";
import { getFabSize, getResponsiveSpacing } from "../utils/responsive";

/**
 * Invisible hit target stacked above the Now Playing bar, sitting exactly on
 * the + button. Without this, the mini bar (later root sibling + Android
 * elevation) eats the tap even when the plus is still visible.
 */
export default function FabTapCatcher() {
  const currentTrack = useGlobalAudioPlayerStore((s) => s.currentTrack);
  const isSessionActive = useGlobalAudioPlayerStore((s) => s.isSessionActive);
  const overlayFull = useCopyrightFreeOverlayStore((s) => s.surface === "full");
  const { shouldMountPlayer } = useFloatingPlayerVisibility({
    currentTrack,
    isSessionActive,
  });

  if (!shouldMountPlayer || overlayFull) return null;

  const pad = getResponsiveSpacing(2, 3, 4, 5);
  const inner = getFabSize().size;
  const outer = inner + pad * 2;

  return (
    <Pressable
      onPress={emitFabTap}
      accessibilityRole="button"
      accessibilityLabel="Create"
      hitSlop={8}
      style={{
        position: "absolute",
        bottom: getFabWrapperBottom(),
        left: "50%",
        marginLeft: -outer / 2,
        width: outer,
        height: outer,
        zIndex: 60000,
        elevation: 60,
      }}
    />
  );
}
