import { BaseService } from "../../src/core/services/BaseService";

export interface GospelTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  previewUrl?: string;
  fullStreamUrl?: string;
  thumbnailUrl?: string;
  isDownloadable: boolean;
  source: "spotify" | "youtube" | "local" | "copyright-free";
  genre: string;
  year?: number;
}

export interface GospelPlaylist {
  id: string;
  name: string;
  description: string;
  tracks: GospelTrack[];
  thumbnailUrl?: string;
  totalTracks: number;
}

export interface GospelSearchResponse {
  success: boolean;
  data: {
    tracks: GospelTrack[];
    playlists: GospelPlaylist[];
    total: number;
  };
  message?: string;
}

class GospelMusicService extends BaseService {
  private basePath = "/gospel-music";

  /**
   * Search for gospel music tracks
   */
  async searchGospelMusic(
    query: string,
    limit: number = 20
  ): Promise<GospelSearchResponse> {
    try {
      const response = await this.post<GospelSearchResponse>(
        `${this.basePath}/search`,
        {
          query,
          limit,
          genre: "gospel",
          includePreviews: true,
        }
      );

      if (response.success && response.data) {
        return response.data;
      }

      // Return fallback data with copyright-free options
      return {
        success: false,
        data: {
          tracks: this.getFallbackGospelTracks(),
          playlists: this.getFallbackPlaylists(),
          total: 0,
        },
        message: "Using offline gospel music collection",
      };
    } catch (error) {
      console.error("Error searching gospel music:", error);
      return {
        success: false,
        data: {
          tracks: this.getFallbackGospelTracks(),
          playlists: this.getFallbackPlaylists(),
          total: 0,
        },
        message: "Using offline gospel music collection",
      };
    }
  }

  /**
   * Get featured gospel playlists
   */
  async getFeaturedPlaylists(): Promise<GospelSearchResponse> {
    try {
      const response = await this.get<GospelSearchResponse>(
        `${this.basePath}/featured`,
        undefined,
        { requireAuth: false }
      );

      if (response.success && response.data) {
        return response.data;
      }

      return {
        success: false,
        data: {
          tracks: [],
          playlists: this.getFallbackPlaylists(),
          total: 0,
        },
        message: "Using offline playlists",
      };
    } catch (error) {
      console.error("Error fetching featured playlists:", error);
      return {
        success: false,
        data: {
          tracks: [],
          playlists: this.getFallbackPlaylists(),
          total: 0,
        },
        message: "Using offline playlists",
      };
    }
  }

  /**
   * Get gospel tracks by artist
   */
  async getTracksByArtist(artistName: string): Promise<GospelSearchResponse> {
    try {
      const response = await this.get<GospelSearchResponse>(
        `${this.basePath}/artist/${encodeURIComponent(artistName)}`,
        undefined,
        { requireAuth: false }
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.error || "Failed to fetch artist tracks");
    } catch (error) {
      console.error("Error fetching artist tracks:", error);
      throw error;
    }
  }

  /**
   * Get copyright-free gospel tracks (fallback)
   */
  private getFallbackGospelTracks(): GospelTrack[] {
    return [
      {
        id: "fallback-1",
        title: "Amazing Grace",
        artist: "Traditional Hymn",
        duration: 240,
        source: "copyright-free",
        genre: "Traditional Gospel",
        isDownloadable: true,
        previewUrl: "/audio/amazing-grace-preview.mp3",
        fullStreamUrl: "/audio/amazing-grace-full.mp3",
        thumbnailUrl: "/images/amazing-grace-thumb.jpg",
      },
      {
        id: "fallback-2",
        title: "How Great Thou Art",
        artist: "Traditional Hymn",
        duration: 280,
        source: "copyright-free",
        genre: "Traditional Gospel",
        isDownloadable: true,
        previewUrl: "/audio/how-great-thou-art-preview.mp3",
        fullStreamUrl: "/audio/how-great-thou-art-full.mp3",
        thumbnailUrl: "/images/how-great-thou-art-thumb.jpg",
      },
      {
        id: "fallback-3",
        title: "Blessed Assurance",
        artist: "Traditional Hymn",
        duration: 220,
        source: "copyright-free",
        genre: "Traditional Gospel",
        isDownloadable: true,
        previewUrl: "/audio/blessed-assurance-preview.mp3",
        fullStreamUrl: "/audio/blessed-assurance-full.mp3",
        thumbnailUrl: "/images/blessed-assurance-thumb.jpg",
      },
      {
        id: "fallback-4",
        title: "Great Is Thy Faithfulness",
        artist: "Traditional Hymn",
        duration: 260,
        source: "copyright-free",
        genre: "Traditional Gospel",
        isDownloadable: true,
        previewUrl: "/audio/great-is-thy-faithfulness-preview.mp3",
        fullStreamUrl: "/audio/great-is-thy-faithfulness-full.mp3",
        thumbnailUrl: "/images/great-is-thy-faithfulness-thumb.jpg",
      },
    ];
  }

  /**
   * Get fallback playlists
   */
  private getFallbackPlaylists(): GospelPlaylist[] {
    return [
      {
        id: "playlist-1",
        name: "Traditional Hymns",
        description: "Classic gospel hymns that have stood the test of time",
        tracks: this.getFallbackGospelTracks(),
        totalTracks: 4,
        thumbnailUrl: "/images/traditional-hymns-thumb.jpg",
      },
      {
        id: "playlist-2",
        name: "Contemporary Gospel",
        description: "Modern gospel songs and contemporary Christian music",
        tracks: [],
        totalTracks: 0,
        thumbnailUrl: "/images/contemporary-gospel-thumb.jpg",
      },
      {
        id: "playlist-3",
        name: "Worship Songs",
        description: "Songs for worship and praise",
        tracks: [],
        totalTracks: 0,
        thumbnailUrl: "/images/worship-songs-thumb.jpg",
      },
    ];
  }

  /**
   * Get Spotify integration info (for legal streaming)
   */
  async getSpotifyIntegration(): Promise<any> {
    return {
      clientId: "your-spotify-client-id",
      redirectUri: "your-app-redirect-uri",
      scopes: [
        "user-read-private",
        "user-read-email",
        "playlist-read-private",
        "user-library-read",
        "user-top-read",
        "user-read-playback-state",
        "user-modify-playback-state",
        "user-read-currently-playing",
        "streaming",
      ],
      authUrl: "https://accounts.spotify.com/authorize",
    };
  }

  /**
   * Get YouTube Music integration info
   */
  async getYouTubeIntegration(): Promise<any> {
    return {
      apiKey: "your-youtube-api-key",
      baseUrl: "https://www.googleapis.com/youtube/v3",
      searchEndpoint: "/search",
      videoEndpoint: "/videos",
    };
  }
}

export default new GospelMusicService();
