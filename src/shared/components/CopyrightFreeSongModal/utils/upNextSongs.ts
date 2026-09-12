export function songKey(song: { id?: string; _id?: string } | null | undefined): string {
  if (!song) return "";
  return String(song.id || song._id || "");
}

/** Remaining tracks after the current one, then the ones before it (wrap). */
export function upNextSongs<T extends { id?: string; _id?: string }>(
  songs: T[] | undefined,
  current: T | null | undefined
): T[] {
  const list = Array.isArray(songs) ? songs : [];
  const currentId = songKey(current);
  if (!currentId || list.length === 0) {
    return list.filter((s) => songKey(s) !== currentId);
  }
  const idx = list.findIndex((s) => songKey(s) === currentId);
  if (idx === -1) {
    return list.filter((s) => songKey(s) !== currentId);
  }
  return [...list.slice(idx + 1), ...list.slice(0, idx)];
}

export function durationSeconds(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n > 1000 ? Math.floor(n / 1000) : Math.floor(n);
}
