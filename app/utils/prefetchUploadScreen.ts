/**
 * Warm Create flows (Upload + Go Live) before navigation so push feels instant.
 *
 * Strategy:
 * 1) Idle warm after Home settles
 * 2) FAB open / press-in (intent)
 * 3) Chip press (last chance before push)
 */

let uploadWarmed = false;
let goLiveWarmed = false;
let pickersWarmed = false;

function warmPickers(): void {
  if (pickersWarmed) return;
  pickersWarmed = true;
  void import("expo-image-picker").catch(() => {
    pickersWarmed = false;
  });
  void import("expo-document-picker").catch(() => {
    pickersWarmed = false;
  });
}

/** Route entry + screen graph for Upload. */
export function prefetchUploadScreen(): void {
  warmPickers();
  if (uploadWarmed) return;
  uploadWarmed = true;
  // Prefer the router entry so Metro resolves the same graph navigation will use.
  void import("../categories/upload")
    .catch(() => import("../categories/upload/UploadScreen"))
    .catch(() => {
      uploadWarmed = false;
    });
}

/** Permissions → coming-soon chain for Go Live. */
export function prefetchGoLiveScreen(): void {
  if (goLiveWarmed) return;
  goLiveWarmed = true;
  void import("../goLlive/AllowPermissionsScreen").catch(() => {
    goLiveWarmed = false;
  });
  void import("../goLlive/LiveComingSoon").catch(() => {});
}

/** Warm both create destinations (FAB open / idle). */
export function prefetchCreateFlows(): void {
  prefetchUploadScreen();
  prefetchGoLiveScreen();
}
