/** Ebook pages and Bible chapters played through the shared audio bar. */
export function isReadingNarrationTrackId(id?: string | null): boolean {
  const value = String(id || "");
  return (
    value.startsWith("ebook-narration-") ||
    value.startsWith("bible-narration-") ||
    value.startsWith("ebook-tts-")
  );
}
