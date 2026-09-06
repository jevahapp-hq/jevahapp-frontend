/**
 * useCopyrightFreeSongsData - Data loading, transform, fallback, cache
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import {
  mmkvGetJson,
  mmkvSetJson,
} from "../../../../src/shared/cache/mmkvStorage";
import { CF_SONGS_CACHE_KEY } from "../../../../src/shared/cache/persistKeys";
import {
  isCheapJsonFresh,
  isCheapJsonPaintable,
} from "../../../../src/shared/config/feedCachePolicy";
import copyrightFreeMusicAPI, {
  CopyrightFreeSongResponse,
} from "../../../services/copyrightFreeMusicAPI";
import { transformBackendSong } from "@/components/CopyrightFreeSongModal/utils/transformBackendSong";

const CACHE_KEY = CF_SONGS_CACHE_KEY;

type SongsCache = { timestamp: number; songs: any[] };
let memorySongs: any[] | null = null;
let memoryFetchedAt = 0;

function readInstantCache(): { songs: any[]; timestamp: number } | null {
  if (memorySongs?.length && isCheapJsonPaintable(memoryFetchedAt)) {
    return { songs: memorySongs, timestamp: memoryFetchedAt };
  }
  const disk = mmkvGetJson<SongsCache>(CACHE_KEY);
  if (
    Array.isArray(disk?.songs) &&
    disk.songs.length > 0 &&
    isCheapJsonPaintable(disk.timestamp)
  ) {
    memorySongs = disk.songs;
    memoryFetchedAt = disk.timestamp;
    return { songs: disk.songs, timestamp: disk.timestamp };
  }
  return null;
}

function writeInstantCache(songs: any[], fetchedAt = Date.now()) {
  memorySongs = songs;
  memoryFetchedAt = fetchedAt;
  mmkvSetJson(CACHE_KEY, { timestamp: fetchedAt, songs });
}

const FALLBACK_THUMBNAIL = require("../../../../assets/images/Rectangle.svg");

function getFallbackSongs(): any[] {
  return [
    {
      id: "song-in-the-name-of-jesus",
      title: "In The Name of Jesus",
      artist: "Tadashikeiji",
      year: 2024,
      audioUrl: "", // Fallback: no local audio; API typically provides songs
      thumbnailUrl: FALLBACK_THUMBNAIL,
      category: "Gospel Music",
      duration: 180,
      contentType: "copyright-free-music",
      description: "A powerful gospel song praising the name of Jesus Christ.",
      speaker: "Tadashikeiji",
      uploadedBy: "Jevah App",
      createdAt: new Date().toISOString(),
      views: 1250,
      likes: 89,
      isLiked: false,
      isInLibrary: false,
      isPublicDomain: true,
    },
    {
      id: "song-call-to-worship",
      title: "Call to Worship",
      artist: "Engelis",
      year: 2024,
      audioUrl: "",
      thumbnailUrl: FALLBACK_THUMBNAIL,
      category: "Gospel Music",
      duration: 220,
      description: "A beautiful call to worship song by Engelis.",
      contentType: "copyright-free-music",
      speaker: "Engelis",
      uploadedBy: "Jevah App",
      createdAt: new Date().toISOString(),
      views: 980,
      likes: 67,
      isLiked: false,
      isInLibrary: false,
      isPublicDomain: true,
    },
    {
      id: "song-the-wind-gospel",
      title: "The Wind Gospel",
      artist: "Gospel Pop Vocals",
      year: 2024,
      audioUrl: "",
      thumbnailUrl: FALLBACK_THUMBNAIL,
      category: "Gospel Pop",
      duration: 195,
      description: "An uplifting gospel pop song with beautiful vocals.",
      speaker: "Gospel Pop Vocals",
      uploadedBy: "Jevah App",
      createdAt: new Date().toISOString(),
      views: 1450,
      likes: 112,
      isLiked: false,
      isInLibrary: false,
      isPublicDomain: true,
    },
    {
      id: "song-gospel-train",
      title: "Gospel Train",
      artist: "Traditional Gospel",
      year: 2024,
      audioUrl: "",
      thumbnailUrl: FALLBACK_THUMBNAIL,
      category: "Traditional Gospel",
      duration: 210,
      description: "A classic gospel train song with traditional styling.",
      speaker: "Traditional Gospel",
      uploadedBy: "Jevah App",
      createdAt: new Date().toISOString(),
      views: 2100,
      likes: 145,
      isLiked: false,
      isInLibrary: false,
      isPublicDomain: true,
    },
    {
      id: "song-you-restore-my-soul",
      title: "You Restore My Soul",
      artist: "Tune Melody Media",
      year: 2024,
      audioUrl: "",
      thumbnailUrl: FALLBACK_THUMBNAIL,
      category: "Contemporary Gospel",
      duration: 185,
      description: "A soulful contemporary gospel song about restoration.",
      speaker: "Tune Melody Media",
      uploadedBy: "Jevah App",
      createdAt: new Date().toISOString(),
      views: 1750,
      likes: 98,
      isLiked: false,
      isInLibrary: false,
      isPublicDomain: true,
    },
  ];
}

export function useCopyrightFreeSongsData() {
  const [songs, setSongs] = useState<any[]>(
    () => readInstantCache()?.songs ?? []
  );
  const [loading, setLoading] = useState(
    () => !readInstantCache()?.songs.length
  );
  const [error, setError] = useState<string | null>(null);

  const transformSong = useCallback((backendSong: CopyrightFreeSongResponse) => {
    return transformBackendSong(backendSong);
  }, []);

  const loadSongs = useCallback(
    async (useCacheFirst: boolean = true) => {
      setError(null);
      let usedCache = false;

      if (useCacheFirst) {
        const instant = readInstantCache();
        if (instant?.songs.length) {
          setSongs(instant.songs);
          setLoading(false);
          usedCache = true;
          // Match feed SWR: fresh disk skips the network; stale still paints then revalidates.
          if (isCheapJsonFresh(instant.timestamp)) {
            return;
          }
        } else {
          try {
            const cachedRaw = await AsyncStorage.getItem(CACHE_KEY);
            if (cachedRaw) {
              const parsed = JSON.parse(cachedRaw);
              const { timestamp, songs: cachedSongs } = parsed || {};
              if (
                Array.isArray(cachedSongs) &&
                cachedSongs.length > 0 &&
                isCheapJsonPaintable(timestamp)
              ) {
                writeInstantCache(cachedSongs, timestamp);
                setSongs(cachedSongs);
                setLoading(false);
                usedCache = true;
                if (isCheapJsonFresh(timestamp)) {
                  void AsyncStorage.removeItem(CACHE_KEY);
                  return;
                }
              }
              void AsyncStorage.removeItem(CACHE_KEY);
            }
          } catch {
            // ignore stale cache
          }
        }
      }

      if (!usedCache) {
        setLoading(true);
      }

      try {
        const response = await copyrightFreeMusicAPI.getAllSongs({
          page: 1,
          limit: 20,
          sort: "popular",
        });

        if (response.success && response.data?.songs?.length) {
          const transformedSongs = response.data.songs.map(transformSong);
          writeInstantCache(transformedSongs);
          setSongs(transformedSongs);
        } else {
          if (__DEV__) {
            console.warn("⚠️ No songs from backend, using local copyright-free set");
          }
          setSongs(getFallbackSongs());
        }
      } catch (err) {
        console.error("❌ Error loading songs from backend:", err);
        setError("Failed to load songs from server. Showing offline collection.");
        setSongs(getFallbackSongs());
      } finally {
        setLoading(false);
      }
    },
    [transformSong]
  );

  const updateSongInList = useCallback((songId: string, updatedSong: any) => {
    setSongs((prev) =>
      prev.map((s) => (s.id === songId ? updatedSong : s))
    );
  }, []);

  useEffect(() => {
    loadSongs(true);
  }, [loadSongs]);

  return {
    songs,
    loading,
    error,
    loadSongs,
    updateSongInList,
  };
}
