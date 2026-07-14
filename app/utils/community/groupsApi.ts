// ============= GROUPS API =============
import type { CommunityAPIClient } from "./client";
import type { ApiResponse, Group } from "./types";

export const groupsApiMethods = {
  // Create Group
  async createGroup(
    this: CommunityAPIClient,
    groupData: {
      name: string;
      description?: string;
      visibility?: "public" | "private";
      imageBase64?: string | null;
      imageUri?: string | null;
    }
  ): Promise<ApiResponse<Group>> {
    try {
      const headers = await this.getAuthHeaders();
      const payload: Record<string, any> = {
        name: groupData.name?.trim(),
        visibility: groupData.visibility || "public",
        isPublic: (groupData.visibility || "public") === "public",
      };

      if (groupData.description && groupData.description.trim().length > 0) {
        payload.description = groupData.description.trim();
      }

      if (groupData.imageBase64) {
        payload.profileImage = groupData.imageBase64;
      }

      const response = await fetch(
        `${this.baseURL}/api/community/groups`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        }
      );

      const apiResponse = await this.handleResponse<{ group: Group }>(response);

      if (apiResponse.success) {
        const rawGroup =
          (apiResponse.data && "group" in apiResponse.data
            ? apiResponse.data.group
            : (apiResponse.data as unknown as Group)) || null;

        if (rawGroup) {
          return {
            success: true,
            data: this.normalizeGroup({ ...rawGroup, visibility: rawGroup.visibility || payload.visibility }),
            message: apiResponse.message,
          };
        }
      }

      return apiResponse as unknown as ApiResponse<Group>;
    } catch (error) {
      console.error("Error creating group:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create group",
        code: "NETWORK_ERROR",
      };
    }
  },

  async updateGroup(
    this: CommunityAPIClient,
    groupId: string,
    updateData: {
      name?: string;
      description?: string;
      visibility?: "public" | "private";
      imageBase64?: string | null;
    }
  ): Promise<ApiResponse<Group>> {
    if (!this.isValidObjectId(groupId)) {
      return {
        success: false,
        error: "Invalid group ID",
        code: "VALIDATION_ERROR",
      };
    }

    try {
      const headers = await this.getAuthHeaders();
      const payload: Record<string, any> = {};

      if (typeof updateData.name === "string") {
        const trimmed = updateData.name.trim();
        if (trimmed.length > 0) {
          payload.name = trimmed;
        }
      }

      if (typeof updateData.description === "string") {
        const trimmedDescription = updateData.description.trim();
        payload.description = trimmedDescription;
      }

      if (updateData.visibility) {
        payload.visibility = updateData.visibility;
        payload.isPublic = updateData.visibility === "public";
      }

      if (updateData.imageBase64) {
        payload.profileImage = updateData.imageBase64;
      }

      if (Object.keys(payload).length === 0) {
        return {
          success: false,
          error: "No update fields provided",
          code: "VALIDATION_ERROR",
        };
      }

      const response = await fetch(
        `${this.baseURL}/api/community/groups/${groupId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        }
      );

      const apiResponse = await this.handleResponse<{ group: Group }>(response);

      if (apiResponse.success) {
        const rawGroup =
          (apiResponse.data && "group" in apiResponse.data
            ? apiResponse.data.group
            : (apiResponse.data as unknown as Group)) || null;

        if (rawGroup) {
          return {
            success: true,
            data: this.normalizeGroup({
              ...rawGroup,
              visibility: rawGroup.visibility || payload.visibility,
            }),
            message: apiResponse.message,
          };
        }
      }

      return apiResponse as unknown as ApiResponse<Group>;
    } catch (error) {
      console.error("Error updating group:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update group",
        code: "NETWORK_ERROR",
      };
    }
  },

  // Get My Groups
  async getMyGroups(
    this: CommunityAPIClient,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<ApiResponse<{ groups: Group[]; pagination: any }>> {
    try {
      const headers = await this.getAuthHeaders();
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());

      const url = `${
        this.baseURL
      }/api/community/groups/my-groups?${queryParams.toString()}`;
      console.log("🌐 Fetching my groups from:", url);

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      console.log(
        "📡 My groups response status:",
        response.status,
        response.statusText
      );

      // Handle 404 as empty result (no groups) rather than error
      if (response.status === 404) {
        console.log("ℹ️ 404 response - no groups found, returning empty array");
        return {
          success: true,
          data: {
            groups: [],
            pagination: {
              page: params?.page || 1,
              limit: params?.limit || 20,
              total: 0,
              hasMore: false,
            },
          },
        };
      }

      const result = await this.handleResponse<{
        groups: Group[];
        pagination: any;
      }>(response);

      console.log("📥 My groups result:", {
        success: result.success,
        hasData: !!result.data,
        groupsCount: result.data?.groups?.length || 0,
        error: result.error,
      });

      if (result.success && result.data?.groups) {
        result.data.groups = result.data.groups.map((group: any) =>
          this.normalizeGroup(group)
        );
      }

      return result;
    } catch (error) {
      console.error("❌ Error getting my groups:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch my groups",
        code: "NETWORK_ERROR",
      };
    }
  },

  // Explore Public Groups
  async exploreGroups(
    this: CommunityAPIClient,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: "membersCount" | "createdAt" | "name";
      sortOrder?: "asc" | "desc";
    }
  ): Promise<ApiResponse<{ groups: Group[]; pagination: any }>> {
    try {
      const headers = await this.getAuthHeaders();
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.search) queryParams.append("search", params.search);
      if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
      if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);

      const response = await fetch(
        `${
          this.baseURL
        }/api/community/groups/explore?${queryParams.toString()}`,
        {
          method: "GET",
          headers,
        }
      );

      return await this.handleResponse<{ groups: Group[]; pagination: any }>(
        response
      );
    } catch (error) {
      console.error("Error exploring groups:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to explore groups",
        code: "NETWORK_ERROR",
      };
    }
  },

  // Get Group Details
  async getGroupDetails(
    this: CommunityAPIClient,
    groupId: string
  ): Promise<ApiResponse<Group>> {
    try {
      if (!this.isValidObjectId(groupId)) {
        return {
          success: false,
          error: "Invalid group ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/groups/${groupId}`,
        {
          method: "GET",
          headers,
        }
      );

      return await this.handleResponse<Group>(response);
    } catch (error) {
      console.error("Error getting group details:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch group details",
        code: "NETWORK_ERROR",
      };
    }
  },

  // Add Members to Group
  async addGroupMembers(
    this: CommunityAPIClient,
    groupId: string,
    userIds: string[]
  ): Promise<ApiResponse<{ addedMembers: any[]; failedUsers: any[] }>> {
    try {
      if (!this.isValidObjectId(groupId)) {
        return {
          success: false,
          error: "Invalid group ID",
          code: "VALIDATION_ERROR",
        };
      }

      if (userIds.length > 50) {
        return {
          success: false,
          error: "Maximum 50 users per request",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/groups/${groupId}/members`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ userIds }),
        }
      );

      return await this.handleResponse<{
        addedMembers: any[];
        failedUsers: any[];
      }>(response);
    } catch (error) {
      console.error("Error adding group members:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add members",
        code: "NETWORK_ERROR",
      };
    }
  },

  // Join Group (Public Groups)
  async joinGroup(
    this: CommunityAPIClient,
    groupId: string
  ): Promise<ApiResponse<any>> {
    try {
      if (!this.isValidObjectId(groupId)) {
        return {
          success: false,
          error: "Invalid group ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/groups/${groupId}/join`,
        {
          method: "POST",
          headers,
        }
      );

      return await this.handleResponse<any>(response);
    } catch (error) {
      console.error("Error joining group:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to join group",
        code: "NETWORK_ERROR",
      };
    }
  },

  // Leave Group
  async leaveGroup(
    this: CommunityAPIClient,
    groupId: string
  ): Promise<ApiResponse<void>> {
    try {
      if (!this.isValidObjectId(groupId)) {
        return {
          success: false,
          error: "Invalid group ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/groups/${groupId}/leave`,
        {
          method: "POST",
          headers,
        }
      );

      return await this.handleResponse<void>(response);
    } catch (error) {
      console.error("Error leaving group:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to leave group",
        code: "NETWORK_ERROR",
      };
    }
  },

  // Remove Member from Group
  async removeGroupMember(
    this: CommunityAPIClient,
    groupId: string,
    userId: string
  ): Promise<ApiResponse<void>> {
    try {
      if (!this.isValidObjectId(groupId) || !this.isValidObjectId(userId)) {
        return {
          success: false,
          error: "Invalid group or user ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/groups/${groupId}/members/${userId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      return await this.handleResponse<void>(response);
    } catch (error) {
      console.error("Error removing group member:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to remove member",
        code: "NETWORK_ERROR",
      };
    }
  },
};
