/**
 * useCopyrightFreeSongsData - Data loading, transform, fallback, cache
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import {
  mmkvGetJson,
  mmkvSetJson,
} from "../../../../src/shared/cache/mmkvStorage";
import copyrightFreeMusicAPI, {
  CopyrightFreeSongResponse,
} from "../../../services/copyrightFreeMusicAPI";
import { transformBackendSong } from "../../CopyrightFreeSongModal/utils/transformBackendSong";

const CACHE_KEY = "copyrightFreeSongsCache_v1";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

type SongsCache = { timestamp: number; songs: any[] };
let memorySongs: any[] | null = null;

function readInstantCache(): any[] | null {
  if (memorySongs?.length) return memorySongs;
  const disk = mmkvGetJson<SongsCache>(CACHE_KEY);
  if (
    Array.isArray(disk?.songs) &&
    typeof disk?.timestamp === "number" &&
    Date.now() - disk.timestamp < CACHE_TTL_MS
  ) {
    memorySongs = disk.songs;
    return disk.songs;
  }
  return null;
}

function writeInstantCache(songs: any[]) {
  memorySongs = songs;
  mmkvSetJson(CACHE_KEY, { timestamp: Date.now(), songs });
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
  const [songs, setSongs] = useState<any[]>(() => readInstantCache() ?? []);
  const [loading, setLoading] = useState(() => !readInstantCache()?.length);
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
        if (instant?.length) {
          setSongs(instant);
          setLoading(false);
          usedCache = true;
        } else {
          try {
            const cachedRaw = await AsyncStorage.getItem(CACHE_KEY);
            if (cachedRaw) {
              const parsed = JSON.parse(cachedRaw);
              const { timestamp, songs: cachedSongs } = parsed || {};
              if (
                Array.isArray(cachedSongs) &&
                typeof timestamp === "number" &&
                Date.now() - timestamp < CACHE_TTL_MS
              ) {
                writeInstantCache(cachedSongs);
                setSongs(cachedSongs);
                setLoading(false);
                usedCache = true;
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
