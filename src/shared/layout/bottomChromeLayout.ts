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

/** Outer hit box of the white FAB wrapper (button + padding). */
export function getFabOuterSize(): number {
  return getFabSize().size + fabWrapperPadding() * 2;
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
 * The bar is a root overlay (after `Slot`), so it can still steal hits from
 * the + button even when nav zIndex is higher. Keep the bar below the FAB
 * catcher (`90000`) and never let it occupy the nav/FAB strip.
 */
export const MINI_PLAYER_Z_INDEX = 50000;
export const MINI_PLAYER_ELEVATION = 6;

export const MINI_PLAYER_SIDE_MARGIN = 12;

/**
 * Default rest position: above the centre FAB (Upload / Go Live).
 */
const MINI_PLAYER_FAB_GAP = 52;

/**
 * Lowest the bar's bottom edge may sit while dragging. Tight to the FAB so
 * the player can use the screen, but never covers the + or the nav bar.
 */
export function getMiniPlayerFloorOffset(): number {
  return getFabTopEdge() + getResponsiveSpacing(8, 10, 12, 14);
}

/**
 * `bottom` for the Now Playing bar at rest.
 */
export function getMiniPlayerBottomOffset(): number {
  return getFabTopEdge() + MINI_PLAYER_FAB_GAP;
}
