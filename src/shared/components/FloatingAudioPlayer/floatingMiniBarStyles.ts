import { Platform, StyleSheet } from "react-native";
import { UI_CONFIG } from "../../constants";
import {
  MINI_PLAYER_ELEVATION,
  MINI_PLAYER_Z_INDEX,
} from "../../layout/bottomChromeLayout";

export const MINI_PLAYER_HEIGHT = 86;
export const MINI_PLAYER_RADIUS = 18;
export const ARTWORK_SIZE = 44;

/** Deep ink surface: separates the bar from the white nav without a heavy glow. */
export const SURFACE = "#111827";
export const ON_SURFACE = "#FFFFFF";
export const ON_SURFACE_MUTED = "rgba(255, 255, 255, 0.62)";
const HAIRLINE = "rgba(255, 255, 255, 0.10)";

export const floatingMiniBarStyles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    height: MINI_PLAYER_HEIGHT,
    zIndex: MINI_PLAYER_Z_INDEX,
    borderRadius: MINI_PLAYER_RADIUS,
    backgroundColor: SURFACE,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
      },
      android: {
        elevation: MINI_PLAYER_ELEVATION,
      },
    }),
  },

  /** Grab affordance + a hint that the bar is vertically draggable. */
  /** Full-width strip so the bar can be dragged without fighting the buttons. */
  dragHandle: {
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },

  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 10,
    paddingRight: 8,
    paddingTop: 2,
    paddingBottom: 10,
  },

  // ---- Artwork -------------------------------------------------------------
  artworkWrap: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  artwork: {
    width: "100%",
    height: "100%",
  },
  artworkRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },

  // ---- Meta ---------------------------------------------------------------
  meta: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "PlusJakartaSans-Bold",
    color: ON_SURFACE,
    letterSpacing: -0.1,
  },
  expandChevron: {
    marginLeft: 6,
  },
  expandButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  subtitle: {
    fontSize: 11.5,
    lineHeight: 15,
    marginTop: 1,
    fontFamily: "PlusJakartaSans-Medium",
    color: ON_SURFACE_MUTED,
  },

  // ---- Controls -----------------------------------------------------------
  controls: {
    flexDirection: "row",
    alignItems: "center",
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: UI_CONFIG.COLORS.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },

  // ---- Progress -----------------------------------------------------------
  progressTrack: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 6,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: UI_CONFIG.COLORS.PRIMARY,
  },
});
