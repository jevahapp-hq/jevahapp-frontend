/**
 * Normalize media ids from feed/card payloads before calling the report API.
 * Some items only have `id`, some wrap Mongo ids as `{ $oid }`.
 */
export function resolveReportMediaId(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return (
      resolveReportMediaId(obj._id) ||
      resolveReportMediaId(obj.id) ||
      resolveReportMediaId(obj.$oid)
    );
  }
  return "";
}

export function getItemMediaId(
  item: { _id?: unknown; id?: unknown } | null | undefined
): string {
  if (!item) return "";
  return resolveReportMediaId(item._id) || resolveReportMediaId(item.id);
}
