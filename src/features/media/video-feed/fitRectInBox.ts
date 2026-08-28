/**
 * Fit a content rectangle inside a feed box without cropping.
 * Used so 9:16 (and other) uploads sit in the 400px card with blur in the gaps.
 */
export function fitRectInBox(
  contentAspect: number,
  boxW: number,
  boxH: number
): { width: number; height: number } {
  if (!(contentAspect > 0) || !(boxW > 0) || !(boxH > 0)) {
    return { width: boxW, height: boxH };
  }
  const boxAspect = boxW / boxH;
  if (contentAspect >= boxAspect) {
    return { width: boxW, height: boxW / contentAspect };
  }
  return { width: boxH * contentAspect, height: boxH };
}
