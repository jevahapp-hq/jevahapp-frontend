/**
 * Geometry for everything stacked above the bottom nav.
 *
 * The nav bar, the centre FAB, the create sheet (Upload / Go Live) and the Now
 * Playing bar all sit in the same strip, and they used to each hardcode their
 * own offsets — including a `+ 56` in the mini bar that had been hand-tuned to
 * clear the FAB and silently stopped clearing the expanded sheet. Deriving all
 * of it here keeps them from drifting apart again.
 */
import { getBottomNavHeight, getFabSize, getResponsiveSpacing } from "../../../utils/responsive";

/** How far the FAB wrapper is lifted above the nav's bottom edge. */
function fabLift(): number {
  return getResponsiveSpacing(40, 44, 48, 52);
}

/** Padding inside the white FAB wrapper, applied on every side. */
function fabWrapperPadding(): number {
  return getResponsiveSpacing(2, 3, 4, 5);
}

/** `bottom` for the circular FAB wrapper in the bottom nav. */
export function getFabWrapperBottom(): number {
  return getBottomNavHeight() - fabLift();
}

/** Screen-space Y of the FAB's top edge, measured from the bottom. */
export function getFabTopEdge(): number {
  return (
    getFabWrapperBottom() + getFabSize().size + fabWrapperPadding() * 2
  );
}

/** `bottom` for the create sheet so it clears the FAB it expands from. */
export function getCreateSheetBottomOffset(): number {
  return (
    getFabWrapperBottom() +
    getFabSize().size +
    getResponsiveSpacing(8, 10, 12, 16)
  );
}

/**
 * Stacking order for the strip, highest last.
 *
 * The nav bar sits at `zIndex: 10` / elevation 4-10, and the FAB wrapper at
 * `zIndex: 1000` with the button itself at elevation 15. The Now Playing bar
 * must clear all of them, so it needs to beat the FAB's numbers and not just
 * the nav's — on Android `elevation` decides the winner between separate root
 * siblings regardless of `zIndex`, which is why both are specified.
 */
export const MINI_PLAYER_Z_INDEX = 50000;
export const MINI_PLAYER_ELEVATION = 6;

/**
 * Extra lift above the centre FAB (Upload / Go Live). The previous 12px gap
 * still left the + button overlapping the bar on most phones.
 */
const MINI_PLAYER_FAB_GAP = 52;

/**
 * `bottom` for the Now Playing bar. It spans the full width, so it has to clear
 * the FAB's top edge rather than just the nav bar.
 */
export function getMiniPlayerBottomOffset(): number {
  return getFabTopEdge() + MINI_PLAYER_FAB_GAP;
}
