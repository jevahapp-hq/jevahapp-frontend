import type { FileInfo } from "./fileTypeDetection";
import { isVideoMediaFile } from "./fileTypeDetection";
import { validateMimeCompatibility } from "./mimeCompatibility";

export function bytesToMbLabel(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  const rounded = mb >= 10 ? mb.toFixed(0) : mb.toFixed(1);
  return rounded.replace(/\.0$/, "");
}

export function describeMediaFormat(file: FileInfo): string {
  const ext = file.name?.split(".").pop()?.toLowerCase() || "";
  const mime = (file.mimeType || "").toLowerCase();
  if (mime.includes("quicktime") || ext === "mov") return "MOV";
  if (ext === "m4v" || mime.includes("x-m4v")) return "M4V";
  if (mime.includes("mp4") || ext === "mp4") return "MP4";
  if (ext === "webm" || mime.includes("webm")) return "WebM";
  if (ext === "mkv" || mime.includes("matroska")) return "MKV";
  if (ext === "avi" || mime.includes("x-msvideo")) return "AVI";
  if (mime.startsWith("video/") && mime !== "video/") {
    return mime.replace("video/", "").toUpperCase();
  }
  if (ext) return ext.toUpperCase();
  return "unknown format";
}

/**
 * Size is compared in bytes from the picker (`file.size`) against the
 * device cap. A 25MB clip is always under 300MB (and under the 64MB lite cap).
 */
export function buildFileGuidelineErrors(
  file: FileInfo,
  selectedType: string,
  maxBytes: number
): string[] {
  const formatErrors = validateMimeCompatibility(file, selectedType);
  const size = typeof file.size === "number" && file.size > 0 ? file.size : 0;
  const maxMB = Math.round(maxBytes / (1024 * 1024));
  const sizeMB = size ? bytesToMbLabel(size) : null;
  const sizeOk = !size || size <= maxBytes;

  if (size && !sizeOk) {
    return [
      `This file is ${sizeMB} MB. The maximum allowed is ${maxMB} MB.`,
      ...formatErrors,
    ];
  }

  if (formatErrors.length === 0) return [];

  if (sizeOk && sizeMB && isVideoMediaFile(file)) {
    const format = describeMediaFormat(file);
    return [
      `This video is ${sizeMB} MB. The limit is ${maxMB} MB, so the size is fine.\n\nIt still can't be posted because of the format (${format}). ${formatErrors[0]}`,
    ];
  }

  return formatErrors;
}
