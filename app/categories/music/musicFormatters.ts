export function formatDuration(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function songCategoryName(song: { category?: string; genre?: string } | null | undefined): string {
  const name = String(song?.category || song?.genre || "").trim();
  if (!name || name === "artist" || name === "copyright-free") return "";
  return name;
}

/** Immediate search and category filter over the songs already on screen. */
export function filterCatalogSongs<T extends { title?: string; artist?: string; artistName?: string; category?: string; genre?: string }>(
  songs: T[],
  searchQuery: string,
  selectedCategory: string | null
): T[] {
  const query = searchQuery.trim().toLowerCase();
  return songs.filter((song) => {
    const category = songCategoryName(song);
    if (selectedCategory && category !== selectedCategory) return false;
    if (!query) return true;
    const haystack = `${song?.title || ""} ${song?.artist || ""} ${song?.artistName || ""}`.toLowerCase();
    return haystack.includes(query);
  });
}

/** Format player position/duration from milliseconds. */
export function formatTimeMs(milliseconds: number): string {
  if (!milliseconds || !Number.isFinite(milliseconds)) return "0:00";
  const totalSeconds = Math.floor(milliseconds / 1000);
  return formatDuration(totalSeconds);
}
