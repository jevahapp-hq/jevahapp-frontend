import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ensurePdfCacheDir,
  evictOldPdfCache,
  getCachedPdfUri,
  getPdfCachePath,
} from "../../utils/pdfCache";
import {
  EbookChapter,
  firstReadableChapter,
  upsertChapter,
} from "../pdfText/buildEbookChapters";
import type { PdfJsExtractorMessage } from "../pdfText/PdfJsExtractorWebView";

export type ExtractionStatus =
  | "idle"
  | "preparing"
  | "extracting"
  | "ready"
  | "error";

type Options = {
  url?: string;
  localUri?: string | null;
  enabled: boolean;
};

async function resolvePdfFile(
  url?: string,
  localUri?: string | null
): Promise<string> {
  const local = typeof localUri === "string" ? localUri.trim() : "";
  if (
    local &&
    (local.startsWith("file://") ||
      local.startsWith(FileSystem.documentDirectory || "") ||
      local.startsWith(FileSystem.cacheDirectory || ""))
  ) {
    const info = await FileSystem.getInfoAsync(local);
    if (info.exists) return local;
  }

  const trimmed = String(url || "").trim();
  if (!trimmed) {
    throw new Error("No PDF URL provided");
  }
  if (trimmed.startsWith("file://")) {
    const info = await FileSystem.getInfoAsync(trimmed);
    if (!info.exists) throw new Error("Local PDF file is missing");
    return trimmed;
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("Invalid PDF URL");
  }

  const cached = await getCachedPdfUri(trimmed);
  if (cached) return cached;

  await ensurePdfCacheDir();
  const path = getPdfCachePath(trimmed);
  const result = await FileSystem.downloadAsync(trimmed, path);
  if (result.status < 200 || result.status >= 300 || !result.uri) {
    throw new Error("Could not download the PDF for audio reading");
  }
  void evictOldPdfCache();
  return result.uri;
}

export function usePdfChapterExtraction({ url, localUri, enabled }: Options) {
  const [status, setStatus] = useState<ExtractionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [chapters, setChapters] = useState<EbookChapter[]>([]);
  const [extractedPages, setExtractedPages] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const requestIdRef = useRef(0);
  const skipCacheRef = useRef(false);
  const cacheRef = useRef<{
    key: string;
    chapters: EbookChapter[];
    totalPages: number;
  } | null>(null);
  const liveChaptersRef = useRef<EbookChapter[]>([]);

  const cacheKey = `${url || ""}|${localUri || ""}`;

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setPdfBase64(null);
    setChapters([]);
    setExtractedPages(0);
    setTotalPages(0);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (
      !skipCacheRef.current &&
      cacheRef.current &&
      cacheRef.current.key === cacheKey &&
      cacheRef.current.chapters.length > 0
    ) {
      setChapters(cacheRef.current.chapters);
      liveChaptersRef.current = cacheRef.current.chapters;
      setTotalPages(cacheRef.current.totalPages);
      setExtractedPages(cacheRef.current.totalPages);
      setPdfBase64(null);
      setError(null);
      setStatus("ready");
      return;
    }
    skipCacheRef.current = false;

    let cancelled = false;
    const requestId = ++requestIdRef.current;

    const prepare = async () => {
      setStatus("preparing");
      setError(null);
      setPdfBase64(null);
      setChapters([]);
      setExtractedPages(0);
      setTotalPages(0);
      liveChaptersRef.current = [];
      try {
        const fileUri = await resolvePdfFile(url, localUri);
        const b64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (cancelled || requestId !== requestIdRef.current) return;
        if (!b64) {
          throw new Error("PDF file was empty");
        }
        setPdfBase64(b64);
        setStatus("extracting");
      } catch (e) {
        if (cancelled || requestId !== requestIdRef.current) return;
        setError(
          e instanceof Error
            ? e.message
            : "Could not prepare this ebook for audio reading"
        );
        setStatus("error");
      }
    };

    void prepare();
    return () => {
      cancelled = true;
    };
  }, [enabled, url, localUri, attempt, cacheKey]);

  const handleExtractorMessage = useCallback((message: PdfJsExtractorMessage) => {
    if (message.type === "started") {
      setTotalPages(message.totalPages || 0);
      setStatus("extracting");
      return;
    }
    if (message.type === "page") {
      setTotalPages(message.totalPages || 0);
      setExtractedPages(message.pageNumber);
      setChapters((prev) => {
        const next = upsertChapter(prev, message.pageNumber, message.text || "");
        liveChaptersRef.current = next;
        return next;
      });
      return;
    }
    if (message.type === "done") {
      setPdfBase64(null);
      setTotalPages(message.totalPages || 0);
      setStatus("ready");
      cacheRef.current = {
        key: cacheKey,
        chapters: liveChaptersRef.current,
        totalPages: message.totalPages || liveChaptersRef.current.length,
      };
      return;
    }
    if (message.type === "error") {
      setError(message.message || "Text extraction failed");
      setStatus("error");
    }
  }, [cacheKey]);

  const retry = useCallback(() => {
    cacheRef.current = null;
    skipCacheRef.current = true;
    reset();
    setAttempt((n) => n + 1);
  }, [reset]);

  const firstChapter = firstReadableChapter(chapters);

  return {
    status,
    error,
    pdfBase64,
    chapters,
    extractedPages,
    totalPages,
    firstChapter,
    handleExtractorMessage,
    retry,
    reset,
  };
}
