export type TypedCatalogKind = "sermon" | "ebook" | "music";

/** Typed catalog keys — never reuse `default-content` without a queryFn. */
export function typedCatalogQueryKey(kind: TypedCatalogKind, limit: number) {
  const root =
    kind === "sermon" ? "sermons" : kind === "ebook" ? "ebooks" : "music-tracks";
  return [root, limit] as const;
}
