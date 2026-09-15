/**
 * Ebook open → PdfViewer (or details fallback).
 */
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { readHomeFeedCategory } from "../../../../../shared/media/homeFeedCategory";
import type { MediaItem } from "../../../../../shared/types";

export function useEbookOpen(
  ebook: MediaItem,
  setShowDetailsModal: (v: boolean) => void
) {
  const router = useRouter();

  return useCallback(() => {
    try {
      const pdfUrl =
        (ebook as any)?.pdfUrl || (ebook as any)?.fileUrl || "";

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
              from: "feed",
              homeCategory: readHomeFeedCategory(),
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
