/**
 * Ebook open → PdfViewer (or details fallback).
 */
import { useRouter } from "expo-router";
import { useCallback } from "react";
import type { MediaItem } from "../../../../../shared/types";

export function useEbookOpen(
  ebook: MediaItem,
  setShowDetailsModal: (v: boolean) => void
) {
  const router = useRouter();

  return useCallback(() => {
    try {
      const pdfUrl =
        (ebook as any)?.fileUrl || (ebook as any)?.pdfUrl || "";

      if (typeof pdfUrl === "string" && pdfUrl.trim().length > 0) {
        const isValidUrl = /^(https?|file):\/\//.test(pdfUrl.trim());
        if (isValidUrl) {
          router.push({
            pathname: "/reader/PdfViewer",
            params: {
              url: pdfUrl.trim(),
              ebookId: (ebook as any)?._id || (ebook as any)?.id || "",
              title: ebook.title || "Untitled",
              desc: (ebook as any)?.description || "",
            },
          });
          return;
        }
      }
      setShowDetailsModal(true);
    } catch {
      setShowDetailsModal(true);
    }
  }, [ebook, router, setShowDetailsModal]);
}
