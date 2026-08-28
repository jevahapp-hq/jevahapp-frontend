/**
 * The Now Playing bar is a root overlay painted after the tab bar, so it
 * sits above the + button no matter what zIndex the FAB uses inside the page.
 * BottomNav registers its toggle here; FabTapCatcher (mounted after the mini
 * bar) forwards presses to it.
 */
let fabTapHandler: (() => void) | null = null;

export function setFabTapHandler(handler: (() => void) | null) {
  fabTapHandler = handler;
}

export function emitFabTap() {
  fabTapHandler?.();
}
