export type PlayOrToggleDecision = "toggle" | "load";

const QUEUE_REPLACE_SOURCES = new Set(["feed", "hymn", "ebook", "library"]);

export function playOrToggleDecision(
  currentTrackId: string | undefined,
  nextTrackId: string
): PlayOrToggleDecision {
  if (currentTrackId && currentTrackId === nextTrackId) return "toggle";
  return "load";
}

export function shouldReplaceAudioQueue(source?: string): boolean {
  return !!source && QUEUE_REPLACE_SOURCES.has(source);
}
