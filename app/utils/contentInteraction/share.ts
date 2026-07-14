import type { ContentInteractionClient } from "./client";
import { devLog } from "./logging";

export async function recordShare(
  ctx: ContentInteractionClient,
  contentId: string,
  contentType: string,
  shareMethod: string = "generic",
  message?: string
): Promise<{ totalShares: number; shared?: boolean }> {
  try {
    if (!ctx.isValidObjectId(contentId)) {
      return { totalShares: 0 };
    }
    const headers = await ctx.getAuthHeaders();
    const backendContentType = ctx.mapContentTypeToBackend(contentType);
    const platform =
      shareMethod === "generic" || shareMethod === "internal"
        ? "internal"
        : shareMethod;

    const response = await fetch(
      `${ctx.baseURL}/api/content/${backendContentType}/${contentId}/share`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          platform,
          ...(message ? { message } : {}),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    devLog(`✅ Share recorded successfully for ${contentId}:`, result);

    return {
      totalShares: result.data?.shareCount ?? result.data?.totalShares ?? 0,
      shared: result.data?.shared ?? true,
    };
  } catch (error) {
    console.error("Error recording share:", error);
    return { totalShares: 0 };
  }
}
