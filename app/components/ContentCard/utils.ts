export function convertToPublicUrl(signedUrl: string): string {
  if (!signedUrl) return signedUrl;
  try {
    const url = new URL(signedUrl);
    [
      "X-Amz-Algorithm", "X-Amz-Content-Sha256", "X-Amz-Credential",
      "X-Amz-Date", "X-Amz-Expires", "X-Amz-Signature", "X-Amz-SignedHeaders",
      "x-amz-checksum-mode", "x-id",
    ].forEach((p) => url.searchParams.delete(p));
    return url.toString();
  } catch {
    return signedUrl;
  }
}

export function isValidUri(u: any): boolean {
  return typeof u === "string" && u.trim().length > 0 && /^https?:\/\//.test(u.trim());
}

export function getTimeAgo(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (minutes < 1) return "NOW";
  if (minutes < 60) return `${minutes}MIN AGO`;
  if (hours < 24) return `${hours}HRS AGO`;
  return `${days}DAYS AGO`;
}
