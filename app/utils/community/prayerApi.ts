// ============= PRAYER WALL API =============
import type { CommunityAPIClient } from "./client";
import type {
  ApiResponse,
  CreatePrayerRequest,
  PrayerComment,
  PrayerRequest,
} from "./types";

export const prayerApiMethods = {
  // Create Prayer Request
  async createPrayer(
    this: CommunityAPIClient,
    prayerData: CreatePrayerRequest
  ): Promise<ApiResponse<PrayerRequest>> {
    try {
      const headers = await this.getAuthHeaders();
      const url = `${this.baseURL}/api/community/prayer-wall/create`;

      console.log("📤 Creating prayer at:", url);
      console.log("📤 Request body:", {
        prayerText: prayerData.prayerText?.substring(0, 50) + "...",
        color: prayerData.color,
        shape: prayerData.shape,
        hasVerse: !!(prayerData.verse?.text || prayerData.verse?.reference),
      });

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(prayerData),
      });

      console.log(
        "📡 Create prayer response status:",
        response.status,
        response.statusText
      );

      const result = await this.handleResponse<PrayerRequest>(response);

      console.log("📥 Create prayer result:", {
        success: result.success,
        hasData: !!result.data,
        prayerId: result.data?._id,
        error: result.error,
      });

      return result;
    } catch (error) {
      console.error("❌ Error creating prayer:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create prayer",
        code: "NETWORK_ERROR",
      };
    }
  },

  // Get Prayer Requests (Paginated)
  async getPrayers(
    this: CommunityAPIClient,
    params?: {
      page?: number;
      limit?: number;
      sortBy?: "createdAt" | "likesCount" | "commentsCount";
      sortOrder?: "asc" | "desc";
    }
  ): Promise<ApiResponse<{ prayers: PrayerRequest[]; pagination: any }>> {
    try {
      const headers = await this.getAuthHeaders();
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
      if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);

      const url = `${
        this.baseURL
      }/api/community/prayer-wall?${queryParams.toString()}`;
      console.log("🌐 Fetching prayers from:", url);
      console.log("🌐 Using baseURL:", this.baseURL);

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      console.log("📡 Response status:", response.status, response.statusText);

      const result = await this.handleResponse<
        | {
            prayers: PrayerRequest[];
            pagination: any;
          }
        | {
            items: PrayerRequest[];
            data: {
              prayers: PrayerRequest[];
              pagination: any;
            };
          }
      >(response);

      console.log("📥 Raw getPrayers result:", {
        success: result.success,
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data as any) : [],
        error: result.error,
      });

      // Handle different response formats
      if (result.success && result.data) {
        const data = result.data as any;
        // Check for different response structures
        let prayers =
          data.prayers ||
          data.items ||
          data.data?.prayers ||
          data.data?.items ||
          [];
        let pagination = data.pagination ||
          data.data?.pagination || {
            page: params?.page || 1,
            limit: params?.limit || 20,
            total: prayers.length,
            totalPages: 1,
            hasMore: false,
          };

        // Ensure hasMore is properly set
        if (pagination.hasMore === undefined) {
          pagination.hasMore = prayers.length >= (params?.limit || 20);
        }

        console.log("✅ Parsed prayers:", prayers.length, "prayers");
        console.log("✅ Pagination:", JSON.stringify(pagination, null, 2));
        if (prayers.length > 0) {
          console.log("📋 Sample prayer:", {
            id: prayers[0]._id,
            text: prayers[0].prayerText?.substring(0, 30) + "...",
            author: prayers[0].author?.username || "anonymous",
          });
        }

        return {
          success: true,
          data: { prayers, pagination },
        };
      }

      console.warn("⚠️ Unexpected response format:", result);
      return result as ApiResponse<{
        prayers: PrayerRequest[];
        pagination: any;
      }>;
    } catch (error) {
      console.error("❌ Error getting prayers:", error);
      console.error("❌ Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        baseURL: this.baseURL,
        endpoint: "/api/community/prayer-wall",
      });

      // Provide more specific error messages
      let errorMessage = "Failed to fetch prayers";
      if (error instanceof Error) {
        if (
          error.message.includes("Network request failed") ||
          error.message.includes("fetch failed") ||
          error.message.includes("ECONNREFUSED")
        ) {
          errorMessage = `Cannot connect to server. Please check:\n1. Backend server is running\n2. API URL is correct: ${this.baseURL}\n3. Your internet connection`;
        } else if (error.message.includes("timeout")) {
          errorMessage =
            "Request timed out. The server may be slow or unreachable.";
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
        code: "NETWORK_ERROR",
      };
    }
  },

  // Search Prayer Requests (AI-Enhanced)
  async searchPrayers(
    this: CommunityAPIClient,
    params: {
      query: string;
      page?: number;
      limit?: number;
    }
  ): Promise<ApiResponse<{ prayers: PrayerRequest[]; pagination: any }>> {
    try {
      const headers = await this.getAuthHeaders();
      const queryParams = new URLSearchParams();
      queryParams.append("query", params.query);
      if (params.page) queryParams.append("page", params.page.toString());
      if (params.limit) queryParams.append("limit", params.limit.toString());

      const response = await fetch(
        `${
          this.baseURL
        }/api/community/prayer-wall/search?${queryParams.toString()}`,
        {
          method: "GET",
          headers,
        }
      );

      return await this.handleResponse<{
        prayers: PrayerRequest[];
        pagination: any;
      }>(response);
    } catch (error) {
      console.error("Error searching prayers:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to search prayers",
        code: "NETWORK_ERROR",
      };
    }
  },

  // Like/Unlike Prayer Request
  async likePrayer(
    this: CommunityAPIClient,
    prayerId: string
  ): Promise<ApiResponse<{ liked: boolean; likesCount: number }>> {
    try {
      if (!this.isValidObjectId(prayerId)) {
        return {
          success: false,
          error: "Invalid prayer ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/prayer-wall/${prayerId}/like`,
        {
          method: "POST",
          headers,
        }
      );

      return await this.handleResponse<{ liked: boolean; likesCount: number }>(
        response
      );
    } catch (error) {
      console.error("Error liking prayer:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to like prayer",
        code: "NETWORK_ERROR",
      };
    }
  },

  // Get Prayer Comments
  async getPrayerComments(
    this: CommunityAPIClient,
    prayerId: string,
    params?: { page?: number; limit?: number }
  ): Promise<ApiResponse<{ comments: PrayerComment[]; pagination: any }>> {
    try {
      if (!this.isValidObjectId(prayerId)) {
        return {
          success: false,
          error: "Invalid prayer ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());

      const response = await fetch(
        `${
          this.baseURL
        }/api/community/prayer-wall/${prayerId}/comments?${queryParams.toString()}`,
        {
          method: "GET",
          headers,
        }
      );

      return await this.handleResponse<{
        comments: PrayerComment[];
        pagination: any;
      }>(response);
    } catch (error) {
      console.error("Error getting prayer comments:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch comments",
        code: "NETWORK_ERROR",
      };
    }
  },

  // Add Comment to Prayer
  async commentOnPrayer(
    this: CommunityAPIClient,
    prayerId: string,
    commentData: { content: string; parentCommentId?: string }
  ): Promise<ApiResponse<PrayerComment>> {
    try {
      if (!this.isValidObjectId(prayerId)) {
        return {
          success: false,
          error: "Invalid prayer ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/prayer-wall/${prayerId}/comments`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(commentData),
        }
      );

      return await this.handleResponse<PrayerComment>(response);
    } catch (error) {
      console.error("Error commenting on prayer:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add comment",
        code: "NETWORK_ERROR",
      };
    }
  },

  // Update Prayer Request
  async updatePrayer(
    this: CommunityAPIClient,
    prayerId: string,
    updates: Partial<CreatePrayerRequest>
  ): Promise<ApiResponse<PrayerRequest>> {
    try {
      if (!this.isValidObjectId(prayerId)) {
        return {
          success: false,
          error: "Invalid prayer ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/prayer-wall/${prayerId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(updates),
        }
      );

      return await this.handleResponse<PrayerRequest>(response);
    } catch (error) {
      console.error("Error updating prayer:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update prayer",
        code: "NETWORK_ERROR",
      };
    }
  },

  // Delete Prayer Request
  async deletePrayer(
    this: CommunityAPIClient,
    prayerId: string
  ): Promise<ApiResponse<void>> {
    try {
      if (!this.isValidObjectId(prayerId)) {
        return {
          success: false,
          error: "Invalid prayer ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/prayer-wall/${prayerId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      return await this.handleResponse<void>(response);
    } catch (error) {
      console.error("Error deleting prayer:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete prayer",
        code: "NETWORK_ERROR",
      };
    }
  },
};
