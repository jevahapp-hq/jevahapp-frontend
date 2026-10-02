/**
 * Ids worth trying when DELETE /api/media/:id says the post is missing.
 * A feed row can carry a wrapper id while the file URL still has the media id.
 */

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

function asId(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return asId(obj.$oid) || asId(obj._id) || asId(obj.id) || asId(obj.mediaId);
  }
  return "";
}

/** Media id baked into storage paths like `…/media-videos/<id>-video.mp4`. */
export function mediaIdFromFileUrl(url: unknown): string {
  if (typeof url !== "string" || !url) return "";
  const named = url.match(
    /\/([0-9a-fA-F]{24})(?:-[A-Za-z0-9]+)?\.(?:mp4|mov|m4v|webm|m4a|mp3|aac|wav)(?:\?|$)/i
  );
  return named?.[1] || "";
}

export function collectMediaDeleteIds(item: unknown): string[] {
  const ids: string[] = [];
  const push = (value: unknown) => {
    const id = asId(value);
    if (!OBJECT_ID.test(id) || ids.includes(id)) return;
    ids.push(id);
  };

  if (typeof item === "string" || typeof item === "number") {
    push(item);
    return ids;
  }
  if (!item || typeof item !== "object") return ids;

  const row = item as Record<string, any>;
  const nested = row.media || row.content || row.item;
  push(nested?._id);
  push(nested?.id);
  push(row.mediaId);
  push(row.contentId);
  for (const url of [
    row.fileUrl,
    row.playbackUrl,
    row.videoUrl,
    row.url,
    row.hlsUrl,
    nested?.fileUrl,
    nested?.videoUrl,
  ]) {
    push(mediaIdFromFileUrl(url));
  }
  push(row._id);
  push(row.id);
  return ids;
}

/** Card ids to drop on this phone, including a row id that is not an object id. */
export function localMediaIds(item: unknown, fallbackId?: string): string[] {
  const ids = collectMediaDeleteIds(item);
  const push = (value: unknown) => {
    const id =
      typeof value === "string" || typeof value === "number"
        ? String(value).trim()
        : "";
    if (!id || ids.includes(id)) return;
    ids.push(id);
  };
  if (item && typeof item === "object") {
    const row = item as Record<string, unknown>;
    push(row._id);
    push(row.id);
  }
  push(fallbackId);
  return ids;
}

function titleOf(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  return String((value as { title?: unknown }).title || "")
    .trim()
    .toLowerCase();
}

function createdAtMs(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const parsed = Date.parse(
    String((value as { createdAt?: unknown }).createdAt || "")
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * When the card id is not the server media id, pick the viewer's own post
 * that is the same file or the only post with the same title.
 */
export function matchOwnedMediaId(
  item: unknown,
  rows: unknown[],
  alreadyTried: string[] = []
): string | null {
  const tried = new Set(alreadyTried.map((id) => id.toLowerCase()));
  const title = titleOf(item);
  const fileId = mediaIdFromFileUrl(
    item && typeof item === "object"
      ? (item as { fileUrl?: unknown; videoUrl?: unknown; url?: unknown })
          .fileUrl ||
          (item as { videoUrl?: unknown }).videoUrl ||
          (item as { url?: unknown }).url
      : ""
  );
  const itemCreated = createdAtMs(item);

  const usable = rows.filter((row) => {
    if (!row || typeof row !== "object") return false;
    const id = asId((row as { _id?: unknown; id?: unknown })._id) ||
      asId((row as { id?: unknown }).id);
    return OBJECT_ID.test(id) && !tried.has(id.toLowerCase());
  });

  for (const row of usable) {
    const id =
      asId((row as { _id?: unknown })._id) ||
      asId((row as { id?: unknown }).id);
    const rowFile = mediaIdFromFileUrl(
      (row as { fileUrl?: unknown; url?: unknown; videoUrl?: unknown }).fileUrl ||
        (row as { url?: unknown }).url ||
        (row as { videoUrl?: unknown }).videoUrl
    );
    if (fileId && (fileId === id || fileId === rowFile)) return id;
  }

  const titled = title
    ? usable.filter((row) => titleOf(row) === title)
    : [];
  if (titled.length === 1) {
    return (
      asId((titled[0] as { _id?: unknown })._id) ||
      asId((titled[0] as { id?: unknown }).id)
    );
  }
  if (titled.length > 1 && itemCreated) {
    const closest = [...titled].sort(
      (a, b) =>
        Math.abs(createdAtMs(a) - itemCreated) -
        Math.abs(createdAtMs(b) - itemCreated)
    )[0];
    if (Math.abs(createdAtMs(closest) - itemCreated) <= 5 * 60 * 1000) {
      return (
        asId((closest as { _id?: unknown })._id) ||
        asId((closest as { id?: unknown }).id)
      );
    }
  }
  return null;
}
