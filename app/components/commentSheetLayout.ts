import { Dimensions } from "react-native";
import { Easing } from "react-native-reanimated";

/** @deprecated Prefer getWindowHeight() — kept for module-load fallbacks */
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

/** Top band where media stays visible while comments are open (~28%) — taller sheet */
export const MEDIA_PEEK_HEIGHT = Math.round(SCREEN_HEIGHT * 0.28);

/** Resting sheet height (below the media peek) */
export const SHEET_HEIGHT_REST = SCREEN_HEIGHT - MEDIA_PEEK_HEIGHT;

/** Main comments sheet — fast + smooth (ease-out cubic bezier) */
export const COMMENT_SHEET_IN = {
  duration: 200,
  easing: Easing.bezier(0.22, 1, 0.36, 1),
} as const;

export const COMMENT_SHEET_OUT = {
  duration: 160,
  easing: Easing.bezier(0.4, 0, 1, 1),
} as const;

export const COMMENT_SHEET_BACKDROP_MAX = 0.16;
export const COMMENT_SHEET_DISMISS_THRESHOLD = 100;

/** Nested action overlays (sort / delete / own menu) */
export const COMMENT_OVERLAY_IN = {
  duration: 220,
  easing: Easing.bezier(0.22, 1, 0.36, 1),
} as const;

export const COMMENT_OVERLAY_OUT = {
  duration: 160,
  easing: Easing.bezier(0.4, 0, 1, 1),
} as const;

export { SCREEN_HEIGHT };
