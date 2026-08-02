import { useCallback, useEffect, useState } from "react";
import copyrightFreeMusicAPI from "../../services/copyrightFreeMusicAPI";
import { musicCatalogApi } from "../../services/music-catalog";
import {
  trackCardToSongUi,
  type TrackCard,
} from "../../services/music-catalog/trackTypes";
import type { MusicLane } from "./MusicLaneTabs";
import { transformBackendSong } from "./transformBackendSong";

const ARTISTS_PAGE_SIZE = 20;

export function useMusicCatalog(musicLane: MusicLane) {
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [artistsPage, setArtistsPage] = useState(1);
  const [artistsHasMore, setArtistsHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  const loadSongs = useCallback(
    async (
      search?: string,
      category?: string | null,
      lane: MusicLane = musicLane,
      opts?: { page?: number; append?: boolean }
    ) => {
      const page = opts?.page ?? 1;
      const append = opts?.append === true;
      setError(null);
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        if (lane === "artists") {
          const { tracks, total } = await musicCatalogApi.listArtistTracks({
            search: search || undefined,
            genre: category || undefined,
            page,
            limit: ARTISTS_PAGE_SIZE,
          });
          const artistOnly = tracks.filter((t: TrackCard) => t.lane === "artist");
          const mapped = artistOnly.map(trackCardToSongUi);
          setSongs((prev) => {
            if (!append) return mapped;
            const seen = new Set(prev.map((s) => s.id));
            return [...prev, ...mapped.filter((s) => !seen.has(s.id))];
          });
          setArtistsPage(page);
          if (typeof total === "number") {
            const prior = append ? (page - 1) * ARTISTS_PAGE_SIZE : 0;
            setArtistsHasMore(prior + artistOnly.length < total);
          } else {
            setArtistsHasMore(artistOnly.length >= ARTISTS_PAGE_SIZE);
          }
          return;
        }

        setArtistsHasMore(false);
        setArtistsPage(1);

        const response = search
          ? await copyrightFreeMusicAPI.searchSongs(search, {
              category: category || undefined,
              limit: 50,
            })
          : await copyrightFreeMusicAPI.getAllSongs({
              category: category || undefined,
              limit: 50,
              sort: "popular",
            });

        if (response.success && response.data?.songs?.length) {
          const transformedSongs = response.data.songs
            .map(transformBackendSong)
            .filter((s) => {
              const ct = String(s?.contentType || "").toLowerCase();
              const songLane = String((s as any)?.lane || "").toLowerCase();
              if (songLane === "artist") return false;
              return !ct || ct === "copyright-free-music" || ct === "curated";
            });
          setSongs(transformedSongs);
        } else {
          setSongs([]);
        }
      } catch (err) {
        console.error("Error loading songs:", err);
        setError(
          lane === "artists"
            ? "Artist catalog unavailable. Pull to retry or check backend /api/music/tracks?lane=artist."
            : "Failed to load songs. Please try again."
        );
        if (!append) setSongs([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [musicLane]
  );

  const loadMoreArtists = useCallback(() => {
    if (musicLane !== "artists" || loading || loadingMore || !artistsHasMore) {
      return;
    }
    void loadSongs(searchQuery || undefined, selectedCategory, "artists", {
      page: artistsPage + 1,
      append: true,
    });
  }, [
    musicLane,
    loading,
    loadingMore,
    artistsHasMore,
    artistsPage,
    loadSongs,
    searchQuery,
    selectedCategory,
  ]);

  const loadCategories = useCallback(async () => {
    if (musicLane !== "copyright-free") {
      setCategories([]);
      return;
    }
    try {
      const response = await copyrightFreeMusicAPI.getCategories();
      if (response.success && response.data?.categories) {
        setCategories(
          response.data.categories.map((cat: any) => cat.name || cat)
        );
      }
    } catch (err) {
      console.warn("Error loading categories:", err);
    }
  }, [musicLane]);

  useEffect(() => {
    loadSongs(searchQuery || undefined, selectedCategory, musicLane);
    loadCategories();
  }, [searchQuery, selectedCategory, musicLane]);

  return {
    songs,
    setSongs,
    loading,
    loadingMore,
    artistsHasMore,
    error,
    setError,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    loadSongs,
    loadMoreArtists,
    loadCategories,
  };
}
