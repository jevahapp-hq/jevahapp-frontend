/**
 * Public music catalog — artist lane only.
 * Copyright-free stays on /api/audio/copyright-free (separate service).
 */
import { BaseApiClient } from "../../../src/core/api/BaseApiClient";
import { normalizeTrackCard, type TrackCard } from "./trackTypes";

export type ArtistProfile = {
  id: string;
  displayName: string;
  slug: string;
  bio?: string;
  avatarUrl?: string;
  genres?: string[];
  isVerified?: boolean;
  creatorTypes?: string[];
  socials?: Record<string, string>;
};

function unwrap(payload: any): any {
  return payload?.data?.data ?? payload?.data ?? payload;
}

class MusicCatalogApiClient extends BaseApiClient {
  async listArtistTracks(params?: {
    search?: string;
    genre?: string;
    page?: number;
    limit?: number;
  }): Promise<{ tracks: TrackCard[]; total?: number }> {
    const q = new URLSearchParams();
    q.set("lane", "artist");
    if (params?.search) q.set("search", params.search);
    if (params?.genre) q.set("genre", params.genre);
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit ?? 50));

    const res = await this.request<any>(`/api/music/tracks?${q.toString()}`, {
      method: "GET",
      requireAuth: false,
    });

    if (!res.success) {
      if (__DEV__) {
        console.warn("⚠️ GET /api/music/tracks?lane=artist failed:", res.error);
      }
      return { tracks: [] };
    }

    const payload = unwrap(res);
    const list =
      payload?.tracks ||
      payload?.items ||
      payload?.media ||
      (Array.isArray(payload) ? payload : []);

    const tracks = (list as any[])
      .map((item) => normalizeTrackCard(item, "artist"))
      .filter((t): t is TrackCard => !!t && t.lane === "artist");

    return { tracks, total: payload?.total ?? tracks.length };
  }

  async getArtistBySlug(slug: string): Promise<ArtistProfile | null> {
    const res = await this.request<any>(
      `/api/artists/${encodeURIComponent(slug)}`,
      { method: "GET", requireAuth: false }
    );
    if (!res.success) return null;
    const a = unwrap(res)?.artist ?? unwrap(res);
    if (!a) return null;
    const id = String(a.id || a._id || "");
    const s = String(a.slug || slug);
    if (!id && !s) return null;
    return {
      id: id || s,
      displayName: String(a.displayName || a.name || "Artist"),
      slug: s,
      bio: a.bio,
      avatarUrl: a.avatarUrl || a.imageUrl,
      genres: a.genres,
      isVerified: Boolean(a.isVerified),
      creatorTypes: a.creatorTypes,
      socials: a.socials,
    };
  }

  async getArtistTracks(
    slug: string,
    params?: { page?: number; limit?: number }
  ): Promise<{ tracks: TrackCard[]; total?: number }> {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit ?? 50));
    const qs = q.toString() ? `?${q.toString()}` : "";

    const res = await this.request<any>(
      `/api/artists/${encodeURIComponent(slug)}/tracks${qs}`,
      { method: "GET", requireAuth: false }
    );
    if (!res.success) return { tracks: [] };
    const payload = unwrap(res);
    const list =
      payload?.tracks ||
      payload?.items ||
      (Array.isArray(payload) ? payload : []);
    const tracks = (list as any[])
      .map((item) => normalizeTrackCard(item, "artist"))
      .filter((t): t is TrackCard => !!t && t.lane === "artist");
    return { tracks, total: payload?.total ?? tracks.length };
  }

  /** Increment play count — artist lane. Soft-fail. */
  async recordPlay(trackId: string): Promise<void> {
    try {
      await this.request(`/api/music/tracks/${encodeURIComponent(trackId)}/play`, {
        method: "POST",
        requireAuth: false,
        body: {},
      });
    } catch {
      // non-blocking
    }
  }
}

export const musicCatalogApi = new MusicCatalogApiClient();
export default musicCatalogApi;
