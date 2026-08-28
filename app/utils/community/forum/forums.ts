import type { CommunityAPIClient } from "../client";
import {
  networkError,
  optionalAuthHeaders,
  toQuery,
  unwrapEntity,
  unwrapList,
  validationError,
} from "../requestHelpers";
import type { ApiResponse, Forum } from "../types";

/** Create Forum (authenticated users only). */
export async function createForum(
  this: CommunityAPIClient,
  forumData: {
    categoryId: string;
    title: string;
    description: string;
  }
): Promise<ApiResponse<Forum>> {
  try {
    if (!this.isValidObjectId(forumData.categoryId)) {
      return validationError("Invalid category ID");
    }

    const response = await fetch(`${this.baseURL}/api/community/forum/create`, {
      method: "POST",
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(forumData),
    });

    return unwrapEntity<Forum>(await this.handleResponse<any>(response));
  } catch (error) {
    console.error("Error creating forum:", error);
    return networkError(error, "Failed to create forum");
  }
}

/** Get all forums (public — no auth required). */
export async function getForums(
  this: CommunityAPIClient,
  params?: {
    page?: number;
    limit?: number;
    view?: "categories" | "discussions" | "all";
    categoryId?: string;
  }
): Promise<ApiResponse<{ forums: Forum[]; pagination: any }>> {
  try {
    if (params?.categoryId && !this.isValidObjectId(params.categoryId)) {
      return validationError("Invalid category ID");
    }

    const query = toQuery({
      page: params?.page,
      limit: params?.limit,
      view: params?.view,
      categoryId: params?.categoryId,
    });

    const response = await fetch(
      `${this.baseURL}/api/community/forum?${query}`,
      { method: "GET", headers: await optionalAuthHeaders(this) }
    );

    return unwrapList<"forums", Forum>(
      await this.handleResponse<any>(response),
      "forums",
      params
    );
  } catch (error) {
    console.error("Error getting forums:", error);
    return networkError(error, "Failed to fetch forums");
  }
}
