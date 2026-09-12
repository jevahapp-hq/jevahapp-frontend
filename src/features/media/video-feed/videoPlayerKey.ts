/** Map a media `_id` onto feed (`ALL::id`) or Reels (`reel-id-…`) player keys. */
export function videoKeyMatchesContentId(
  key: string,
  contentId?: string | null
): boolean {
  const id = String(contentId || "").trim();
  const k = String(key || "");
  if (!id || !k) return false;
  if (k === id) return true;
  if (k.endsWith(`::${id}`)) return true;
  if (k.startsWith(`reel-${id}-`)) return true;
  return false;
}
