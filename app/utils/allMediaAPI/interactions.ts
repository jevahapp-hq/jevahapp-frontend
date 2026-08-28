import { authedRequest } from "./http";
import type { ApiResult } from "./types";

export function toggleLike(
  contentType: string,
  contentId: string
): Promise<ApiResult> {
  return authedRequest(
    `/api/content/${contentType}/${contentId}/like`,
    { method: "POST" },
    "toggling like"
  );
}

export function shareContent(
  contentType: string,
  contentId: string,
  platform: string = "general",
  message: string = "Check this out!"
): Promise<ApiResult> {
  return authedRequest(
    `/api/content/${contentType}/${contentId}/share`,
    { method: "POST", body: { platform, message } },
    "sharing content"
  );
}
