import { performDelete } from "./deleteRequest";
import type { DeleteMediaResponse } from "./types";

// Track successfully deleted media IDs to suppress redundant 404 errors
const successfullyDeletedIds = new Set<string>();

// Clean up old IDs after 5 minutes (media might be re-uploaded with same ID)
setInterval(() => {
  successfullyDeletedIds.clear();
}, 5 * 60 * 1000);

/**
 * Delete a media item.
 * @throws Error if deletion fails or the user is not authorized
 */
export const deleteMedia = (
  mediaId: string
): Promise<DeleteMediaResponse> =>
  performDelete(mediaId, {
    url: (baseURL, id) => `${baseURL}/api/media/${id}`,
    logLabel: "🗑️ Delete",
    noTokenMessage: "Please log in to delete media.",
    successMessage: "Media deleted successfully",
    failureMessage: "Failed to delete media",
    forbiddenMessage: "You don't have permission to delete this media.",
    notFoundMessage:
      "Media not found. It may have already been deleted or the ID is incorrect.",
    genericFailureMessage: "Failed to delete media. Please try again.",
    onSuccess: (id) => successfullyDeletedIds.add(id),
    onNotFound: (id) => {
      // A 404 right after our own successful delete is expected, not an error.
      if (!successfullyDeletedIds.has(id)) return null;
      console.log(
        "✅ Media already deleted successfully (suppressing redundant 404)"
      );
      return { success: true, message: "Media deleted successfully" };
    },
  });

/**
 * Admin delete endpoint — permanently removes content that violates platform
 * rules.
 * @throws Error if deletion fails or the user is not authorized
 */
export const adminDeleteContent = (
  mediaId: string
): Promise<DeleteMediaResponse & { data?: any }> =>
  performDelete(mediaId, {
    url: (baseURL, id) => `${baseURL}/api/media/reports/${id}/delete`,
    logLabel: "🔨 Admin delete",
    noTokenMessage: "Please log in to delete content.",
    successMessage: "Content deleted successfully",
    failureMessage: "Failed to delete content",
    forbiddenMessage:
      "You don't have permission to delete content. Admin access required.",
    notFoundMessage:
      "Content not found. It may have already been deleted or the ID is incorrect.",
    genericFailureMessage: "Failed to delete content. Please try again.",
  });
