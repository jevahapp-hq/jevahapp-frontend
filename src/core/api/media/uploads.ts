import { API_CONFIG } from "../../../shared/constants";
import { MediaItem } from "../../../shared/types";
import { apiClient } from "../ApiClient";
import { Result, unwrap } from "./envelope";

export async function uploadMedia(
  file: any,
  metadata: {
    title: string;
    description?: string;
    contentType: string;
    tags?: string[];
  }
): Promise<Result<MediaItem>> {
  return unwrap(
    await apiClient.upload<any>(API_CONFIG.ENDPOINTS.UPLOAD, file, metadata),
    "Failed to upload media"
  );
}
