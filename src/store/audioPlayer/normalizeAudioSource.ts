/**
 * Normalize audio source for expo-audio (support require(), string URLs, and { uri } objects).
 */
export function normalizeAudioSource(audioUrl: any): any {
  let source: any = audioUrl;
  if (!source) {
    throw new Error("Missing audio source for track");
  }

  if (typeof source === "string") {
    source = { uri: source };
  } else if (typeof source === "number") {
    source = source;
  } else if (typeof source === "object" && !("uri" in source) && !("assetId" in source)) {
    if ((source as any).localUri) {
      source = { uri: (source as any).localUri };
    }
  }

  return source;
}
