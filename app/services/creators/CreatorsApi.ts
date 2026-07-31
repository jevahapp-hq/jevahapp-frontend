/**
 * Creators API — apply + session hub for Spotify-for-Gospel.
 * Never call /api/admin/* from this client.
 */
import { BaseApiClient } from "../../../src/core/api/BaseApiClient";
import {
  emptyCreatorMe,
  normalizeCreatorMe,
  type CreatorApplyBody,
  type CreatorMe,
  type CreatorProfileUpdateBody,
} from "./types";

class CreatorsApiClient extends BaseApiClient {
  async getMe(): Promise<CreatorMe> {
    try {
      const res = await this.request<any>("/api/creators/me", {
        method: "GET",
        requireAuth: true,
      });

      if (!res.success) {
        if (__DEV__) {
          console.warn(
            "⚠️ GET /api/creators/me failed:",
            res.error || res.message
          );
        }
        return emptyCreatorMe();
      }

      const payload = (res as any).data?.data ?? (res as any).data ?? res;
      return normalizeCreatorMe(payload);
    } catch (error) {
      if (__DEV__) {
        console.warn("⚠️ GET /api/creators/me error:", error);
      }
      return emptyCreatorMe();
    }
  }

  async apply(body: CreatorApplyBody): Promise<CreatorMe> {
    const res = await this.request<any>("/api/creators/apply", {
      method: "POST",
      requireAuth: true,
      body,
    });

    if (!res.success) {
      throw new Error(res.error || res.message || "Failed to submit application");
    }

    const payload = (res as any).data?.data ?? (res as any).data ?? res;
    return normalizeCreatorMe(payload);
  }

  /** Public profile edit — PATCH /api/creators/me */
  async updateMe(body: CreatorProfileUpdateBody): Promise<CreatorMe> {
    const res = await this.request<any>("/api/creators/me", {
      method: "PATCH",
      requireAuth: true,
      body,
    });
    if (!res.success) {
      throw new Error(res.error || res.message || "Failed to update profile");
    }
    const payload = (res as any).data?.data ?? (res as any).data ?? res;
    return normalizeCreatorMe(payload);
  }

  async createAvatarUploadIntent(body: {
    contentType: string;
    fileName: string;
    fileSizeBytes: number;
  }) {
    return this.request<any>("/api/creators/me/avatar-upload-intent", {
      method: "POST",
      requireAuth: true,
      body,
      timeoutMs: 60000,
    });
  }

  async getMyTracks(params?: { page?: number; limit?: number }): Promise<{
    tracks: any[];
    total?: number;
  }> {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString() ? `?${q.toString()}` : "";

    const res = await this.request<any>(`/api/creators/me/tracks${qs}`, {
      method: "GET",
      requireAuth: true,
    });

    if (!res.success) {
      return { tracks: [] };
    }

    const payload = (res as any).data?.data ?? (res as any).data ?? res;
    const tracks =
      payload?.tracks ||
      payload?.items ||
      (Array.isArray(payload) ? payload : []);
    return { tracks, total: payload?.total };
  }

  async createUploadIntent(body: Record<string, unknown>) {
    return this.request<any>("/api/creators/tracks/upload-intent", {
      method: "POST",
      requireAuth: true,
      body,
      timeoutMs: 60000,
    });
  }

  async createCoverUploadIntent(
    trackId: string,
    body: {
      contentType: string;
      fileName: string;
      fileSizeBytes: number;
    }
  ) {
    return this.request<any>(
      `/api/creators/tracks/${encodeURIComponent(trackId)}/cover-upload-intent`,
      {
        method: "POST",
        requireAuth: true,
        body,
        timeoutMs: 60000,
      }
    );
  }

  async finalizeTrack(trackId: string, body?: { publish?: boolean }) {
    return this.request<any>(
      `/api/creators/tracks/${encodeURIComponent(trackId)}/finalize`,
      {
        method: "POST",
        requireAuth: true,
        body: body ?? { publish: true },
        timeoutMs: 120000,
      }
    );
  }

  async patchTrack(trackId: string, body: Record<string, unknown>) {
    return this.request<any>(
      `/api/creators/tracks/${encodeURIComponent(trackId)}`,
      { method: "PATCH", requireAuth: true, body }
    );
  }

  async deleteTrack(trackId: string) {
    return this.request<any>(
      `/api/creators/tracks/${encodeURIComponent(trackId)}`,
      { method: "DELETE", requireAuth: true }
    );
  }
}

export const creatorsApi = new CreatorsApiClient();
export default creatorsApi;
