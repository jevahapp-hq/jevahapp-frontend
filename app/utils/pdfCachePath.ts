/**
 * Flat PDF cache filenames. Android's downloadAsync treats `%2F` / `/` in the
 * destination as directories, so a URL must never be used as the file name.
 */
export function pdfCacheFileName(url: string): string {
  const trimmed = String(url || "").trim();
  let h1 = 0x811c9dc5;
  let h2 = 5381;
  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 = (h2 << 5) + h2 + c;
  }
  const a = (h1 >>> 0).toString(16).padStart(8, "0");
  const b = (h2 >>> 0).toString(16).padStart(8, "0");
  return `${a}${b}.pdf`;
}
