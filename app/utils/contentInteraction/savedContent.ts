import type { ContentInteractionClient } from "./client";
import { devLog, devWarn } from "./logging";

export async function getUserSavedContent(
  ctx: ContentInteractionClient,
  contentType?: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  content: any[];
  totalCount: number;
  hasMore: boolean;
}> {
  devLog("🔍 Getting user saved content with params:", {
    contentType,
    page,
    limit,
  });

  try {
    const headers = await ctx.getAuthHeaders();
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(contentType && { contentType }),
    });

    devLog("📡 Using endpoint: /api/bookmark/user");
    devLog("📡 Request headers:", headers);
    devLog("📡 Query params:", queryParams.toString());

    const response = await fetch(
      `${ctx.baseURL}/api/bookmark/user?${queryParams}`,
      {
        headers,
      }
    );

    devLog("📡 Response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error:", response.status, errorText);

      // Handle 500 errors gracefully - don't crash the app
      if (response.status === 500) {
        devWarn(
          "⚠️ Backend server error (500) - returning empty saved content"
        );
        devWarn("⚠️ This usually means:");
        devWarn("   - Database connection issues");
        devWarn("   - User authentication problems");
        devWarn("   - Backend code errors in bookmark retrieval");
        return { content: [], totalCount: 0, hasMore: false };
      }

      throw new Error(
        `HTTP error! status: ${response.status} - ${errorText}`
      );
    }

    const payload = await response.json();
    devLog("📡 API Response:", JSON.stringify(payload, null, 2));

    const items: any[] =
      payload?.data?.bookmarks ||
      payload?.data?.media ||
      payload?.bookmarks ||
      payload?.data ||
      payload?.media ||
      [];
    const list = Array.isArray(items) ? items : [];
    const total: number =
      payload?.data?.pagination?.total || payload?.total || list.length || 0;
    const totalPages: number =
      payload?.data?.pagination?.totalPages ||
      Math.ceil(total / Math.max(limit, 1));

    devLog("✅ Parsed saved content:", {
      itemCount: list.length,
      total,
      totalPages,
    });

    return {
      content: list,
      totalCount: total,
      hasMore: page < totalPages,
    };
  } catch (error) {
    console.error("❌ Error getting user saved content:", error);

    // Don't crash the app - return empty result
    devWarn("⚠️ Returning empty saved content to prevent app crash");
    return { content: [], totalCount: 0, hasMore: false };
  }
}
