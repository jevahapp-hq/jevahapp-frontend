// Playlist API Service - Unified System Supporting Both Media & Copyright-Free Songs
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { API_BASE_URL } from "./api";

export interface PlaylistTrack {
  _id: string;
  trackType: "media" | "copyrightFree";
  mediaId?: string;
  copyrightFreeSongId?: string;
  content: {
    _id: string;
    title: string;
    artistName: string;
    thumbnailUrl?: string;
    fileUrl: string;
    duration: number;
    contentType: string;
  };
  order: number;
  addedAt: string;
  notes?: string;
}

export interface Playlist {
  _id: string;
  name: string;
  description?: string;
  userId: string;
  tracks: PlaylistTrack[];
  totalTracks: number;
  createdAt: string;
  updatedAt: string;
  isPublic?: boolean;
}

export interface CreatePlaylistRequest {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface AddTrackRequest {
  mediaId?: string; // For regular Media
  copyrightFreeSongId?: string; // For copyright-free songs
  notes?: string;
  position?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class PlaylistAPI {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL || "http://localhost:3000";
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    try {
      let token = await AsyncStorage.getItem("userToken");
      if (!token) {
        token = await AsyncStorage.getItem("token");
      }
      if (!token) {
        try {
          const { default: SecureStore } = await import("expo-secure-store");
          token = await SecureStore.getItemAsync("jwt");
        } catch (secureStoreError) {
          console.log("SecureStore not available or no JWT token");
        }
      }

      if (token) {
        return {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "expo-platform": Platform.OS,
        };
      }

      return {
        "Content-Type": "application/json",
        "expo-platform": Platform.OS,
      };
    } catch (error) {
      console.error("Error getting auth headers:", error);
      return {
        "Content-Type": "application/json",
        "expo-platform": Platform.OS,
      };
    }
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    let data: any;
    try {
      data = isJson ? await response.json() : await response.text();
    } catch (error) {
      console.error("Error parsing response:", error);
      return {
        success: false,
        error: "Failed to parse response",
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: data?.error || data?.message || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return {
      success: true,
      data: data?.data || data,
      message: data?.message,
    };
  }

  /**
   * Get user's playlists
   * GET /api/playlists
   */
  async getUserPlaylists(): Promise<ApiResponse<{ playlists: Playlist[] }>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/api/playlists`, {
        method: "GET",
        headers,
      });

      return await this.handleResponse<{ playlists: Playlist[] }>(response);
    } catch (error) {
      console.error("Error getting user playlists:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch playlists",
      };
    }
  }

  /**
   * Get single playlist by ID
   * GET /api/playlists/:playlistId
   */
  async getPlaylistById(playlistId: string): Promise<ApiResponse<Playlist>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/api/playlists/${playlistId}`, {
        method: "GET",
        headers,
      });

      return await this.handleResponse<Playlist>(response);
    } catch (error) {
      console.error("Error getting playlist:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch playlist",
      };
    }
  }

  /**
   * Create new playlist
   * POST /api/playlists
   */
  async createPlaylist(
    playlistData: CreatePlaylistRequest
  ): Promise<ApiResponse<Playlist>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/api/playlists`, {
        method: "POST",
        headers,
        body: JSON.stringify(playlistData),
      });

      return await this.handleResponse<Playlist>(response);
    } catch (error) {
      console.error("Error creating playlist:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create playlist",
      };
    }
  }

  /**
   * Update playlist
   * PUT /api/playlists/:playlistId
   */
  async updatePlaylist(
    playlistId: string,
    updates: Partial<CreatePlaylistRequest>
  ): Promise<ApiResponse<Playlist>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/api/playlists/${playlistId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(updates),
      });

      return await this.handleResponse<Playlist>(response);
    } catch (error) {
      console.error("Error updating playlist:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update playlist",
      };
    }
  }

  /**
   * Delete playlist
   * DELETE /api/playlists/:playlistId
   */
  async deletePlaylist(playlistId: string): Promise<ApiResponse<void>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/api/playlists/${playlistId}`, {
        method: "DELETE",
        headers,
      });

      return await this.handleResponse<void>(response);
    } catch (error) {
      console.error("Error deleting playlist:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete playlist",
      };
    }
  }

  /**
   * Add track to playlist (Unified - supports both Media and Copyright-Free Songs)
   * POST /api/playlists/:playlistId/tracks
   */
  async addTrackToPlaylist(
    playlistId: string,
    trackData: AddTrackRequest
  ): Promise<ApiResponse<Playlist>> {
    try {
      // Validate: must have exactly one ID
      if (!trackData.mediaId && !trackData.copyrightFreeSongId) {
        return {
          success: false,
          error: "Either mediaId or copyrightFreeSongId is required",
        };
      }

      if (trackData.mediaId && trackData.copyrightFreeSongId) {
        return {
          success: false,
          error: "Cannot specify both mediaId and copyrightFreeSongId",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/playlists/${playlistId}/tracks`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(trackData),
        }
      );

      return await this.handleResponse<Playlist>(response);
    } catch (error) {
      console.error("Error adding track to playlist:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add track to playlist",
      };
    }
  }

  /**
   * Remove track from playlist
   * DELETE /api/playlists/:playlistId/tracks/:trackId
   * OR DELETE /api/playlists/:playlistId/tracks/:mediaId?trackType=media
   * OR DELETE /api/playlists/:playlistId/tracks/:copyrightFreeSongId?trackType=copyrightFree
   */
  async removeTrackFromPlaylist(
    playlistId: string,
    trackId: string,
    trackType?: "media" | "copyrightFree"
  ): Promise<ApiResponse<Playlist>> {
    try {
      const headers = await this.getAuthHeaders();
      let url = `${this.baseURL}/api/playlists/${playlistId}/tracks/${trackId}`;
      
      // Add query params if trackType is provided
      if (trackType) {
        url += `?trackType=${trackType}`;
        if (trackType === "copyrightFree") {
          url += `&copyrightFreeSongId=${trackId}`;
        }
      }

      const response = await fetch(url, {
        method: "DELETE",
        headers,
      });

      return await this.handleResponse<Playlist>(response);
    } catch (error) {
      console.error("Error removing track from playlist:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to remove track from playlist",
      };
    }
  }

  /**
   * Reorder playlist tracks
   * PUT /api/playlists/:playlistId/tracks/reorder
   */
  async reorderPlaylistTracks(
    playlistId: string,
    trackIds: string[]
  ): Promise<ApiResponse<Playlist>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/playlists/${playlistId}/tracks/reorder`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ trackIds }),
        }
      );

      return await this.handleResponse<Playlist>(response);
    } catch (error) {
      console.error("Error reordering playlist tracks:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to reorder tracks",
      };
    }
  }
}

export const playlistAPI = new PlaylistAPI();
export default playlistAPI;

