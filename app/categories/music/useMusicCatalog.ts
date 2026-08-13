import { useCallback, useEffect, useRef, useState } from "react";
import copyrightFreeMusicAPI from "../../services/copyrightFreeMusicAPI";
import { musicCatalogApi } from "../../services/music-catalog";
import {
  trackCardToSongUi,
  type TrackCard,
} from "../../services/music-catalog/trackTypes";
import { USE_MUSIC_FOR_YOU } from "../../../src/shared/feed/feedFeatureFlags";
import { enqueueFeedEvent } from "../../../src/shared/feed/feedRanker";
import { getLiteFeedLimit } from "../../../src/shared/lite/liteProfile";
import { getSessionToken } from "../../utils/sessionAuth";
import type { MusicLane } from "./MusicLaneTabs";
import { transformBackendSong } from "./transformBackendSong";

function artistsPageSize(): number {
  return getLiteFeedLimit(20);
}

export function useMusicCatalog(musicLane: MusicLane) {
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [artistsCursor, setArtistsCursor] = useState<string | null>(null);
  const [artistsHasMore, setArtistsHasMore] = useState(false);
  const [artistsPage, setArtistsPage] = useState(1);
  const [usingMusicForYou, setUsingMusicForYou] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const impressedRef = useRef<Set<string>>(new Set());

  const loadSongs = useCallback(
    async (
      search?: string,
      category?: string | null,
      lane: MusicLane = musicLane,
      opts?: { page?: number; append?: boolean; cursor?: string | null }
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
          const browsing =
            Boolean(search?.trim()) || Boolean(category?.trim());
          const token = browsing ? null : await getSessionToken();
          const preferForYou =
            USE_MUSIC_FOR_YOU && !!token && !browsing;

          if (preferForYou) {
            const pageLimit = artistsPageSize();
            const { tracks, cursor, hasMore, source } =
              await musicCatalogApi.listMusicForYou({
                cursor: append ? opts?.cursor ?? artistsCursor : null,
                limit: pageLimit,
                lane: "artist",
              });
            const mapped = tracks
              .filter((t: TrackCard) => t.lane === "artist" || !t.lane)
              .map(trackCardToSongUi);
            setSongs((prev) => {
              if (!append) return mapped;
              const seen = new Set(prev.map((s) => s.id));
              return [...prev, ...mapped.filter((s) => !seen.has(s.id))];
            });
            setArtistsCursor(cursor);
            setArtistsHasMore(hasMore);
            setUsingMusicForYou(source === "music_for_you");
            setArtistsPage(page);
            return;
          }

          setUsingMusicForYou(false);
          const pageLimit = artistsPageSize();
          const { tracks, total } = await musicCatalogApi.listArtistTracks({
            search: search || undefined,
            genre: category || undefined,
            page,
            limit: pageLimit,
          });
          const artistOnly = tracks.filter((t: TrackCard) => t.lane === "artist");
          const mapped = artistOnly.map(trackCardToSongUi);
          setSongs((prev) => {
            if (!append) return mapped;
            const seen = new Set(prev.map((s) => s.id));
            return [...prev, ...mapped.filter((s) => !seen.has(s.id))];
          });
          setArtistsPage(page);
          setArtistsCursor(String(page + 1));
          if (typeof total === "number") {
            const prior = append ? (page - 1) * pageLimit : 0;
            setArtistsHasMore(prior + artistOnly.length < total);
          } else {
            setArtistsHasMore(artistOnly.length >= pageLimit);
          }
          return;
        }

        setArtistsHasMore(false);
        setArtistsPage(1);
        setArtistsCursor(null);
        setUsingMusicForYou(false);

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
            ? "Artist catalog unavailable. Pull to retry."
            : "Failed to load songs. Please try again."
        );
        if (!append) setSongs([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [musicLane, artistsCursor]
  );

  const loadMoreArtists = useCallback(() => {
    if (musicLane !== "artists" || loading || loadingMore || !artistsHasMore) {
      return;
    }
    if (usingMusicForYou) {
      void loadSongs(searchQuery || undefined, selectedCategory, "artists", {
        append: true,
        cursor: artistsCursor,
      });
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
    artistsCursor,
    usingMusicForYou,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on lane/search/category only
  }, [searchQuery, selectedCategory, musicLane]);

  /** Soft impression when Artists list mounts / updates first pages */
  useEffect(() => {
    if (musicLane !== "artists" || !usingMusicForYou) return;
    for (const song of songs.slice(0, 8)) {
      const id = String(song?.id || "");
      if (!id || impressedRef.current.has(id)) continue;
      impressedRef.current.add(id);
      enqueueFeedEvent({
        contentId: id,
        contentType: "music",
        eventType: "impression",
        source: "music_for_you",
      });
    }
  }, [songs, musicLane, usingMusicForYou]);

  return {
    songs,
    setSongs,
    loading,
    loadingMore,
    artistsHasMore,
    usingMusicForYou,
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
