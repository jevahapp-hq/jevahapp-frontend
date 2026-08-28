import type { ImageSourcePropType } from "react-native";

/** App icon — used when a track has no cover. */
export const JEVAH_LOGO: ImageSourcePropType = require("../../../assets/images/Jevah.png");

function httpUri(value: unknown): string | null {
  if (typeof value === "string") {
    const t = value.trim();
    if (/^https?:\/\//i.test(t) || t.startsWith("file:")) return t;
    return null;
  }
  if (value && typeof value === "object" && "uri" in (value as object)) {
    return httpUri((value as { uri?: string }).uri);
  }
  return null;
}

/** Always returns a renderable image (remote cover or Jevah logo). */
export function resolveAlbumArtSource(thumb?: unknown): ImageSourcePropType {
  if (typeof thumb === "number") return thumb;
  const uri = httpUri(thumb);
  if (uri) return { uri };
  return JEVAH_LOGO;
}
