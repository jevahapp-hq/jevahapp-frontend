/**
 * iPhone screen recordings are MOV / video/quicktime.
 * The upload API rejects that MIME for videos and sermons.
 * H.264 screen recordings play when the part is declared as MP4.
 */
export function asUploadableVideoFile<T extends { name?: string; mimeType?: string }>(
  file: T
): T {
  const mime = (file.mimeType || "").toLowerCase();
  const name = file.name || "";
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const quicktime =
    mime === "video/quicktime" ||
    mime === "video/mov" ||
    ext === "mov" ||
    ext === "qt";
  if (!quicktime) return file;

  const base =
    name.replace(/\.(mov|qt|mp4)$/i, "") || `screen_recording_${Date.now()}`;
  return {
    ...file,
    name: `${base}.mp4`,
    mimeType: "video/mp4",
  };
}
