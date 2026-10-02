/**
 * Cover thumbnails may be square, portrait, or landscape.
 * The picker crops to one of these. Anything else is rejected.
 * The uploaded file keeps that shape; it is not forced back to 1:1.
 */

export const THUMBNAIL_ASPECTS = [
  { id: "1:1", label: "Square 1:1", width: 1, height: 1 },
  { id: "9:16", label: "Portrait 9:16", width: 9, height: 16 },
  { id: "16:9", label: "Landscape 16:9", width: 16, height: 9 },
] as const;

export type ThumbnailAspectId = (typeof THUMBNAIL_ASPECTS)[number]["id"];

export function thumbnailAspectById(id: ThumbnailAspectId) {
  const found = THUMBNAIL_ASPECTS.find((item) => item.id === id);
  if (!found) return THUMBNAIL_ASPECTS[0];
  return found;
}

/** Width / height for the upload preview tile. */
export function thumbnailPreviewRatio(id?: ThumbnailAspectId | null): number {
  const aspect = thumbnailAspectById(id || "1:1");
  return aspect.width / aspect.height;
}

/**
 * True when the cropped image matches the chosen shape.
 * Missing sizes are accepted because the picker already cropped to that shape.
 */
/** Center crop that turns a photo into the chosen cover shape. */
export function thumbnailCropRect(
  width: number,
  height: number,
  id: ThumbnailAspectId
): { originX: number; originY: number; width: number; height: number } | null {
  if (!(width > 0) || !(height > 0)) return null;
  const target = thumbnailPreviewRatio(id);
  const actual = width / height;
  if (Math.abs(actual - target) / target <= 0.06) {
    return {
      originX: 0,
      originY: 0,
      width: Math.round(width),
      height: Math.round(height),
    };
  }
  if (actual > target) {
    const cropW = Math.max(1, Math.round(height * target));
    const originX = Math.max(0, Math.round((width - cropW) / 2));
    return {
      originX,
      originY: 0,
      width: Math.min(cropW, Math.round(width) - originX),
      height: Math.round(height),
    };
  }
  const cropH = Math.max(1, Math.round(width / target));
  const originY = Math.max(0, Math.round((height - cropH) / 2));
  return {
    originX: 0,
    originY,
    width: Math.round(width),
    height: Math.min(cropH, Math.round(height) - originY),
  };
}

export function thumbnailMatchesAspect(
  width: number | null | undefined,
  height: number | null | undefined,
  id: ThumbnailAspectId,
  tolerance = 0.06
): boolean {
  if (!(typeof width === "number" && typeof height === "number")) return true;
  if (!(width > 0) || !(height > 0)) return false;
  const expected = thumbnailPreviewRatio(id);
  return Math.abs(width / height - expected) / expected <= tolerance;
}
