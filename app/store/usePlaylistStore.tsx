import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PlaylistSong {
  id: string;
  title: string;
  artist: string;
  audioUrl: any; // Can be require() or URL string
  thumbnailUrl: any;
  duration: number;
  category?: string;
  description?: string;
  addedAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  songs: PlaylistSong[];
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: any;
}

interface PlaylistState {
  playlists: Playlist[];
  isLoaded: boolean;
  
  // Actions
  createPlaylist: (name: string, description?: string) => string;
  deletePlaylist: (playlistId: string) => boolean;
  addSongToPlaylist: (playlistId: string, song: PlaylistSong) => boolean;
  removeSongFromPlaylist: (playlistId: string, songId: string) => boolean;
  updatePlaylist: (playlistId: string, updates: Partial<Playlist>) => boolean;
  getPlaylist: (playlistId: string) => Playlist | null;
  getAllPlaylists: () => Playlist[];
  loadPlaylists: () => Promise<void>;
  clearAll: () => void;
}

const STORAGE_KEY = "@jevahapp_playlists";

export const usePlaylistStore = create<PlaylistState>()(
  persist(
    (set, get) => ({
      playlists: [],
      isLoaded: false,

      createPlaylist: (name: string, description?: string) => {
        const newPlaylist: Playlist = {
          id: `playlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: name.trim(),
          description: description?.trim(),
          songs: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          playlists: [...state.playlists, newPlaylist],
        }));

        return newPlaylist.id;
      },

      deletePlaylist: (playlistId: string) => {
        const { playlists } = get();
        const exists = playlists.some((p) => p.id === playlistId);
        
        if (!exists) return false;

        set((state) => ({
          playlists: state.playlists.filter((p) => p.id !== playlistId),
        }));

        return true;
      },

      addSongToPlaylist: (playlistId: string, song: PlaylistSong) => {
        const { playlists } = get();
        const playlist = playlists.find((p) => p.id === playlistId);
        
        if (!playlist) return false;

        // Check if song already exists in playlist
        const songExists = playlist.songs.some((s) => s.id === song.id);
        if (songExists) return false;

        const playlistSong: PlaylistSong = {
          ...song,
          addedAt: new Date().toISOString(),
        };

        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId
              ? {
                  ...p,
                  songs: [...p.songs, playlistSong],
                  updatedAt: new Date().toISOString(),
                  thumbnailUrl: playlistSong.thumbnailUrl, // Use first song's thumbnail
                }
              : p
          ),
        }));

        return true;
      },

      removeSongFromPlaylist: (playlistId: string, songId: string) => {
        const { playlists } = get();
        const playlist = playlists.find((p) => p.id === playlistId);
        
        if (!playlist) return false;

        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId
              ? {
                  ...p,
                  songs: p.songs.filter((s) => s.id !== songId),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));

        return true;
      },

      updatePlaylist: (playlistId: string, updates: Partial<Playlist>) => {
        const { playlists } = get();
        const exists = playlists.some((p) => p.id === playlistId);
        
        if (!exists) return false;

        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId
              ? {
                  ...p,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));

        return true;
      },

      getPlaylist: (playlistId: string) => {
        const { playlists } = get();
        return playlists.find((p) => p.id === playlistId) || null;
      },

      getAllPlaylists: () => {
        return get().playlists;
      },

      loadPlaylists: async () => {
        try {
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            set({ playlists: parsed.state?.playlists || [], isLoaded: true });
          } else {
            set({ isLoaded: true });
          }
        } catch (error) {
          console.error("Error loading playlists:", error);
          set({ isLoaded: true });
        }
      },

      clearAll: () => {
        set({ playlists: [] });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ playlists: state.playlists }),
    }
  )
);

