/** expo-av wraps missing CDN files as "Response code: 404". */
export function isUnavailableAudioError(error: unknown): boolean {
  const msg = String(
    (error as { message?: string })?.message || error || ""
  );
  return (
    /\b404\b/.test(msg) ||
    /\b410\b/.test(msg) ||
    /response code:\s*4\d\d/i.test(msg) ||
    /not found/i.test(msg) ||
    /no such file/i.test(msg)
  );
}

export function audioLoadErrorMessage(
  error: unknown,
  title?: string
): string {
  const name = title?.trim() || "This track";
  if (isUnavailableAudioError(error)) {
    return `${name} isn’t available (file missing).`;
  }
  return `${name} couldn’t be loaded.`;
}
