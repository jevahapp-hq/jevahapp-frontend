import type { ContentInteractionClient } from "./client";
import type { ContentInteraction } from "./types";

export async function getUserInteractionHistory(
  ctx: ContentInteractionClient,
  page: number = 1,
  limit: number = 50,
  interactionType?: string
): Promise<{
  interactions: ContentInteraction[];
  totalCount: number;
  hasMore: boolean;
}> {
  try {
    const headers = await ctx.getAuthHeaders();
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(interactionType && { interactionType }),
    });

    const response = await fetch(
      `${ctx.baseURL}/api/user/interaction-history?${queryParams}`,
      {
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting interaction history:", error);
    return { interactions: [], totalCount: 0, hasMore: false };
  }
}
