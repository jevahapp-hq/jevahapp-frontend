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

  /**
   * Personalized Artists Discover — soft-fails to listArtistTracks.
   * GET /api/feed/music-for-you?lane=artist (alias /api/music/for-you).
   */
  async listMusicForYou(params?: {
    cursor?: string | null;
    limit?: number;
    lane?: "artist" | "curated";
  }): Promise<{
    tracks: TrackCard[];
    cursor: string | null;
    hasMore: boolean;
    source: "music_for_you" | "tracks";
  }> {
    const lane = params?.lane ?? "artist";
    const limit = params?.limit ?? 20;

    try {
      const { fetchMusicForYou } = await import(
        "../../../src/shared/feed/feedRanker"
      );
      const page = await fetchMusicForYou({
        cursor: params?.cursor ?? null,
        limit,
        lane,
      });
      const tracks = (page.tracks || [])
        .map((item) => normalizeTrackCard(item, "artist"))
        .filter((t): t is TrackCard => !!t);
      if (tracks.length > 0 || page.hasMore) {
        return {
          tracks,
          cursor: page.cursor,
          hasMore: page.hasMore,
          source: "music_for_you",
        };
      }
    } catch (err) {
      if (__DEV__) {
        console.warn("⚠️ music-for-you failed; chronological fallback", err);
      }
    }

    const pageNum = params?.cursor
      ? Math.max(1, parseInt(String(params.cursor), 10) || 1)
      : 1;
    const { tracks, total } = await this.listArtistTracks({
      page: pageNum,
      limit,
    });
    const loaded = pageNum * limit;
    return {
      tracks,
      cursor: String(pageNum + 1),
      hasMore: typeof total === "number" ? loaded < total : tracks.length >= limit,
      source: "tracks",
    };
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

  /** Public release page — never use for copyright-free. */
  async getRelease(idOrSlug: string): Promise<import("../creators/releaseTypes").ArtistRelease | null> {
    const { normalizeArtistRelease } = await import("../creators/releaseTypes");
    const res = await this.request<any>(
      `/api/music/releases/${encodeURIComponent(idOrSlug)}`,
      { method: "GET", requireAuth: false }
    );
    if (!res.success) return null;
    return normalizeArtistRelease(unwrap(res));
  }

  /** Artist discography */
  async getArtistReleases(
    slug: string,
    params?: { page?: number; limit?: number }
  ): Promise<{
    releases: import("../creators/releaseTypes").ArtistRelease[];
    total?: number;
  }> {
    const { normalizeArtistRelease } = await import("../creators/releaseTypes");
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit ?? 20));
    const qs = q.toString() ? `?${q.toString()}` : "";
    const res = await this.request<any>(
      `/api/artists/${encodeURIComponent(slug)}/releases${qs}`,
      { method: "GET", requireAuth: false }
    );
    if (!res.success) return { releases: [] };
    const payload = unwrap(res);
    const list =
      payload?.releases ||
      payload?.items ||
      (Array.isArray(payload) ? payload : []);
    const releases = (list as any[])
      .map(normalizeArtistRelease)
      .filter(Boolean) as import("../creators/releaseTypes").ArtistRelease[];
    return { releases, total: payload?.total ?? releases.length };
  }

  /** Optional shelf filter — artist lane only */
  async listTracksByRelease(
    releaseId: string,
    params?: { page?: number; limit?: number }
  ): Promise<{ tracks: TrackCard[]; total?: number }> {
    const q = new URLSearchParams();
    q.set("lane", "artist");
    q.set("releaseId", releaseId);
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit ?? 50));
    const res = await this.request<any>(`/api/music/tracks?${q.toString()}`, {
      method: "GET",
      requireAuth: false,
    });
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
}

export const musicCatalogApi = new MusicCatalogApiClient();
export default musicCatalogApi;
