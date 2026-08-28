import { Asset } from "expo-asset";

/**
 * Normalize audio source for expo-av (support require(), string URLs, and { uri } objects).
 */
export function normalizeAudioSource(audioUrl: any): any {
  let source: any = audioUrl;
  if (!source) {
    throw new Error("Missing audio source for track");
  }

  // If we received a plain string from backend, wrap in { uri }
  if (typeof source === "string") {
    source = { uri: source };
  } else if (typeof source === "number") {
    // Convert require() number module to Asset
    source = Asset.fromModule(source);
  } else if (typeof source === "object" && !("uri" in source)) {
    // If it's some other object (e.g. { localUri }), try to map to { uri }
    if ((source as any).localUri) {
      source = { uri: (source as any).localUri };
    }
  }

  return source;
}
