// ============= POLLS API =============
import { Platform } from "react-native";
import type { CommunityAPIClient } from "./client";
import type { ApiResponse, Poll } from "./types";

export const pollsApiMethods = {
  // Create Poll (All authenticated users can create)
  async createPoll(
    this: CommunityAPIClient,
    pollData: {
      question: string;
      options: string[];
      multiSelect?: boolean;
      closesAt?: string;
      expiresAt?: string; // Alias for closesAt
      description?: string;
    }
  ): Promise<ApiResponse<Poll>> {
    try {
      const headers = await this.getAuthHeaders();

      // Normalize data - use closesAt if provided, otherwise expiresAt
      const normalizedData = {
        question: pollData.question,
        options: pollData.options,
        multiSelect: pollData.multiSelect || false,
        closesAt: pollData.closesAt || pollData.expiresAt,
        description: pollData.description,
      };

      // Try both endpoints (polls and polls/create)
      let response = await fetch(`${this.baseURL}/api/community/polls`, {
        method: "POST",
        headers,
        body: JSON.stringify(normalizedData),
      });

      // If 404, try the /create endpoint
      if (response.status === 404) {
        response = await fetch(`${this.baseURL}/api/community/polls/create`, {
          method: "POST",
          headers,
          body: JSON.stringify(normalizedData),
        });
      }

      const result = await this.handleResponse<{ poll: Poll } | Poll>(response);

      // Handle different response formats
      if (result.success && result.data) {
        // Check if response has nested poll object
        const pollData = (result.data as any).poll || result.data;
        return {
          success: true,
          data: pollData as Poll,
        };
      }

      return result as ApiResponse<Poll>;
    } catch (error) {
      console.error("Error creating poll:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create poll",
        code: "NETWORK_ERROR",
      };
    }
  },

  // Get All Polls (Public - no auth required)
  async getPolls(
    this: CommunityAPIClient,
    params?: {
      page?: number;
      limit?: number;
      status?: "all" | "open" | "closed" | "active" | "expired";
      sortBy?: "createdAt" | "totalVotes";
      sortOrder?: "asc" | "desc";
    }
  ): Promise<
    ApiResponse<{
      items: Poll[];
      polls?: Poll[];
      page: number;
      pageSize: number;
      total: number;
      pagination?: any;
    }>
  > {
    try {
      // Try to get auth headers, but don't fail if not available (public endpoint)
      let headers: HeadersInit;
      try {
        headers = await this.getAuthHeaders();
      } catch {
        headers = {
          "Content-Type": "application/json",
          "expo-platform": Platform.OS,
        };
      }

      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());

      // Normalize status: active -> open, expired -> closed
      let status = params?.status;
      if (status === "active") status = "open";
      if (status === "expired") status = "closed";
      if (status) queryParams.append("status", status);

      if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
      if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);

      const response = await fetch(
        `${this.baseURL}/api/community/polls?${queryParams.toString()}`,
        {
          method: "GET",
          headers,
        }
      );

      const result = await this.handleResponse<{
        items: Poll[];
        polls?: Poll[];
        page: number;
        pageSize: number;
        total: number;
        pagination?: any;
      }>(response);

      // Handle different response formats
      if (result.success && result.data) {
        const data = result.data as any;
        // Support both formats: { items: [] } or { polls: [] }
        const items = data.items || data.polls || [];

        // Log raw response to debug missing options
        console.log("📥 Raw polls API response:", {
          hasData: !!result.data,
          dataKeys: Object.keys(data),
          itemsCount: items.length,
          sampleItem:
            items.length > 0
              ? {
                  id: items[0]._id,
                  hasOptions: !!items[0].options,
                  optionsCount: items[0].options?.length || 0,
                  keys: Object.keys(items[0]),
                }
              : null,
        });

        // Ensure options array exists on each poll
        const normalizedItems = items.map((poll: any) => {
          if (!poll.options || !Array.isArray(poll.options)) {
            console.warn("⚠️ Poll missing options array:", {
              pollId: poll._id,
              question: poll.question || poll.title,
              existingKeys: Object.keys(poll),
            });
            return {
              ...poll,
              options: [], // Ensure options is always an array
            };
          }
          return poll;
        });

        const pagination = data.pagination || {
          page: data.page || 1,
          limit: data.pageSize || params?.limit || 20,
          total: data.total || 0,
          hasMore:
            (data.page || 1) * (data.pageSize || params?.limit || 20) <
            (data.total || 0),
        };

        return {
          success: true,
          data: {
            items: normalizedItems,
            polls: normalizedItems, // Backward compatibility
            page: data.page || 1,
            pageSize: data.pageSize || params?.limit || 20,
            total: data.total || 0,
            pagination,
          },
        };
      }

      return result;
    } catch (error) {
      console.error("Error getting polls:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch polls",
        code: "NETWORK_ERROR",
      };
    }
  },

  // Get My Polls (Authenticated users only)
  async getMyPolls(
    this: CommunityAPIClient,
    params?: { page?: number; limit?: number }
  ): Promise<
    ApiResponse<{
      items: Poll[];
      page: number;
      pageSize: number;
      total: number;
      pagination: any;
    }>
  > {
    try {
      const headers = await this.getAuthHeaders();
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());

      const response = await fetch(
        `${this.baseURL}/api/community/polls/my?${queryParams.toString()}`,
        {
          method: "GET",
          headers,
        }
      );

      const result = await this.handleResponse<{
        items: Poll[];
        page: number;
        pageSize: number;
        total: number;
        pagination: any;
      }>(response);

      if (result.success && result.data) {
        const data = result.data as any;
        const pagination = data.pagination || {
          page: data.page || 1,
          limit: data.pageSize || params?.limit || 20,
          total: data.total || 0,
          pages: Math.ceil(
            (data.total || 0) / (data.pageSize || params?.limit || 20)
          ),
          hasMore:
            (data.page || 1) * (data.pageSize || params?.limit || 20) <
            (data.total || 0),
        };

        return {
          success: true,
          data: {
            items: data.items || [],
            page: data.page || 1,
            pageSize: data.pageSize || params?.limit || 20,
            total: data.total || 0,
            pagination,
          },
        };
      }

      return result;
    } catch (error) {
      console.error("Error getting my polls:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch my polls",
        code: "NETWORK_ERROR",
      };
    }
  },

  // Get Poll Details (Public - no auth required)
  async getPollDetails(
    this: CommunityAPIClient,
    pollId: string
  ): Promise<ApiResponse<Poll>> {
    try {
      if (!this.isValidObjectId(pollId)) {
        return {
          success: false,
          error: "Invalid poll ID",
          code: "VALIDATION_ERROR",
        };
      }

      // Try to get auth headers, but don't fail if not available (public endpoint)
      let headers: HeadersInit;
      try {
        headers = await this.getAuthHeaders();
      } catch {
        headers = {
          "Content-Type": "application/json",
          "expo-platform": Platform.OS,
        };
      }

      const response = await fetch(
        `${this.baseURL}/api/community/polls/${pollId}`,
        {
          method: "GET",
          headers,
        }
      );

      const result = await this.handleResponse<{ poll: Poll } | Poll>(response);

      // Handle different response formats
      if (result.success && result.data) {
        const pollData = (result.data as any).poll || result.data;
        return {
          success: true,
          data: pollData as Poll,
        };
      }

      return result as ApiResponse<Poll>;
    } catch (error) {
      console.error("Error getting poll details:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch poll details",
        code: "NETWORK_ERROR",
      };
    }
  },

  // Vote on Poll (Supports single or multi-select)
  async voteOnPoll(
    this: CommunityAPIClient,
    pollId: string,
    optionIndex: number | number[]
  ): Promise<ApiResponse<Poll>> {
    try {
      if (!this.isValidObjectId(pollId)) {
        return {
          success: false,
          error: "Invalid poll ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();

      // Try both endpoints (vote and votes)
      let response = await fetch(
        `${this.baseURL}/api/community/polls/${pollId}/vote`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ optionIndex }),
        }
      );

      // If 404, try the /votes endpoint
      if (response.status === 404) {
        response = await fetch(
          `${this.baseURL}/api/community/polls/${pollId}/votes`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ optionIndex }),
          }
        );
      }

      const result = await this.handleResponse<{ poll: Poll } | Poll>(response);

      // Handle different response formats
      if (result.success && result.data) {
        const pollData = (result.data as any).poll || result.data;
        return {
          success: true,
          data: pollData as Poll,
        };
      }

      return result as ApiResponse<Poll>;
    } catch (error) {
      console.error("Error voting on poll:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to vote",
        code: "NETWORK_ERROR",
      };
    }
  },

  // Update Poll (Creator or Admin only)
  async updatePoll(
    this: CommunityAPIClient,
    pollId: string,
    updates: {
      question?: string;
      title?: string; // Backward compatibility
      description?: string | null;
      options?: string[];
      multiSelect?: boolean;
      closesAt?: string | null;
      expiresAt?: string | null; // Alias for closesAt
      isActive?: boolean;
    }
  ): Promise<ApiResponse<Poll>> {
    try {
      if (!this.isValidObjectId(pollId)) {
        return {
          success: false,
          error: "Invalid poll ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();

      // Normalize updates
      const normalizedUpdates: any = {};
      if (updates.question !== undefined)
        normalizedUpdates.question = updates.question;
      if (updates.title !== undefined && !updates.question)
        normalizedUpdates.question = updates.title;
      if (updates.description !== undefined)
        normalizedUpdates.description = updates.description;
      if (updates.options !== undefined)
        normalizedUpdates.options = updates.options;
      if (updates.multiSelect !== undefined)
        normalizedUpdates.multiSelect = updates.multiSelect;
      if (updates.closesAt !== undefined)
        normalizedUpdates.closesAt = updates.closesAt;
      if (updates.expiresAt !== undefined && !updates.closesAt)
        normalizedUpdates.closesAt = updates.expiresAt;
      if (updates.isActive !== undefined)
        normalizedUpdates.isActive = updates.isActive;

      const response = await fetch(
        `${this.baseURL}/api/community/polls/${pollId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(normalizedUpdates),
        }
      );

      const result = await this.handleResponse<{ data: Poll } | Poll>(response);

      // Handle different response formats
      if (result.success && result.data) {
        const pollData = (result.data as any).data || result.data;
        return {
          success: true,
          data: pollData as Poll,
        };
      }

      return result as ApiResponse<Poll>;
    } catch (error) {
      console.error("Error updating poll:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update poll",
        code: "NETWORK_ERROR",
      };
    }
  },

  // Delete Poll (Creator or Admin only)
  async deletePoll(
    this: CommunityAPIClient,
    pollId: string
  ): Promise<ApiResponse<void>> {
    try {
      if (!this.isValidObjectId(pollId)) {
        return {
          success: false,
          error: "Invalid poll ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/polls/${pollId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      return await this.handleResponse<void>(response);
    } catch (error) {
      console.error("Error deleting poll:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete poll",
        code: "NETWORK_ERROR",
      };
    }
  },
};
