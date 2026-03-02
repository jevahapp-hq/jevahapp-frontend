import { useLibraryStore } from "../store/useLibraryStore";

export interface CopyrightFreeSong {
  id: string;
  title: string;
  artist: string;
  year: number;
  audioUrl: string;
  thumbnailUrl: string;
  category: string;
  duration: number;
  contentType: "copyright-free-music";
  description: string;
  speaker: string;
  uploadedBy: string;
  createdAt: string;
  views: number;
  likes: number;
  isLiked: boolean;
  isInLibrary: boolean;
  isPublicDomain: boolean;
}

class CopyrightFreeSongsService {
  private songs: CopyrightFreeSong[] = [];

  constructor() {
    this.initializeSongs();
  }

  private initializeSongs() {
    // These are all public domain songs - completely copyright free!
    this.songs = [
      {
        id: "song-amazing-grace",
        title: "Amazing Grace",
        artist: "Traditional Hymn",
        year: 1779,
        audioUrl: "", // Audio file not available
        thumbnailUrl: "/images/amazing-grace-thumb.jpg",
        category: "Traditional Gospel",
        duration: 240,
        contentType: "copyright-free-music",
        description:
          "One of the most beloved hymns of all time, written by John Newton in 1779. This powerful song speaks of God's amazing grace and redemption.",
        speaker: "John Newton",
        uploadedBy: "Jevah App",
        createdAt: new Date().toISOString(),
        views: 0,
        likes: 0,
        isLiked: false,
        isInLibrary: false,
        isPublicDomain: true,
      },
      {
        id: "song-how-great-thou-art",
        title: "How Great Thou Art",
        artist: "Traditional Hymn",
        year: 1885,
        audioUrl: "", // Audio file not available
        thumbnailUrl: "/images/how-great-thou-art-thumb.jpg",
        category: "Traditional Gospel",
        duration: 280,
        contentType: "copyright-free-music",
        description:
          "A majestic hymn of praise to God's greatness and creation, originally written in Swedish by Carl Boberg in 1885.",
        speaker: "Carl Boberg",
        uploadedBy: "Jevah App",
        createdAt: new Date().toISOString(),
        views: 0,
        likes: 0,
        isLiked: false,
        isInLibrary: false,
        isPublicDomain: true,
      },
      {
        id: "song-blessed-assurance",
        title: "Blessed Assurance",
        artist: "Traditional Hymn",
        year: 1873,
        audioUrl: "", // Audio file not available
        thumbnailUrl: "/images/blessed-assurance-thumb.jpg",
        category: "Traditional Gospel",
        duration: 220,
        contentType: "copyright-free-music",
        description:
          "A beautiful hymn of assurance and joy in salvation, written by the prolific hymn writer Fanny Crosby in 1873.",
        speaker: "Fanny Crosby",
        uploadedBy: "Jevah App",
        createdAt: new Date().toISOString(),
        views: 0,
        likes: 0,
        isLiked: false,
        isInLibrary: false,
        isPublicDomain: true,
      },
      {
        id: "song-great-is-thy-faithfulness",
        title: "Great Is Thy Faithfulness",
        artist: "Traditional Hymn",
        year: 1923,
        audioUrl: "", // Audio file not available
        thumbnailUrl: "/images/great-is-thy-faithfulness-thumb.jpg",
        category: "Traditional Gospel",
        duration: 260,
        contentType: "copyright-free-music",
        description:
          "A hymn celebrating God's unchanging faithfulness and daily mercies, written by Thomas Chisholm in 1923.",
        speaker: "Thomas Chisholm",
        uploadedBy: "Jevah App",
        createdAt: new Date().toISOString(),
        views: 0,
        likes: 0,
        isLiked: false,
        isInLibrary: false,
        isPublicDomain: true,
      },
      {
        id: "song-it-is-well",
        title: "It Is Well With My Soul",
        artist: "Traditional Hymn",
        year: 1873,
        audioUrl: "", // Audio file not available
        thumbnailUrl: "/images/it-is-well-thumb.jpg",
        category: "Traditional Gospel",
        duration: 200,
        contentType: "copyright-free-music",
        description:
          "A deeply moving hymn written by Horatio Spafford after experiencing great personal tragedy, expressing trust in God's sovereignty.",
        speaker: "Horatio Spafford",
        uploadedBy: "Jevah App",
        createdAt: new Date().toISOString(),
        views: 0,
        likes: 0,
        isLiked: false,
        isInLibrary: false,
        isPublicDomain: true,
      },
      {
        id: "song-nearer-my-god",
        title: "Nearer, My God, to Thee",
        artist: "Traditional Hymn",
        year: 1841,
        audioUrl: "", // Audio file not available
        thumbnailUrl: "/images/nearer-my-god-thumb.jpg",
        category: "Traditional Gospel",
        duration: 180,
        contentType: "copyright-free-music",
        description:
          "A prayerful hymn expressing the desire to draw closer to God, written by Sarah Adams in 1841.",
        speaker: "Sarah Adams",
        uploadedBy: "Jevah App",
        createdAt: new Date().toISOString(),
        views: 0,
        likes: 0,
        isLiked: false,
        isInLibrary: false,
        isPublicDomain: true,
      },
    ];
  }

  /**
   * Get all copyright-free songs
   */
  getAllSongs(): CopyrightFreeSong[] {
    return this.songs;
  }

  /**
   * Get songs that are saved in the library
   */
  getSavedSongs(): CopyrightFreeSong[] {
    return this.songs.filter((song) => song.isInLibrary);
  }

  /**
   * Add a song to the library
   */
  async addSongToLibrary(songId: string): Promise<boolean> {
    try {
      const song = this.songs.find((s) => s.id === songId);
      if (!song) {
        console.error(`Song with ID ${songId} not found`);
        return false;
      }

      // Add to library store
      const libraryItem = {
        id: song.id,
        contentType: song.contentType,
        fileUrl: song.audioUrl,
        title: song.title,
        speaker: song.artist,
        uploadedBy: song.uploadedBy,
        description: song.description,
        createdAt: song.createdAt,
        speakerAvatar: song.thumbnailUrl,
        views: song.views,
        sheared: 0,
        saved: 1,
        comment: 0,
        favorite: song.likes,
        imageUrl: song.thumbnailUrl,
      };

      await useLibraryStore.getState().addToLibrary(libraryItem);

      // Update song status
      song.isInLibrary = true;

      console.log(`✅ Added song "${song.title}" to library`);
      return true;
    } catch (error) {
      console.error("Error adding song to library:", error);
      return false;
    }
  }

  /**
   * Remove a song from the library
   */
  async removeSongFromLibrary(songId: string): Promise<boolean> {
    try {
      const song = this.songs.find((s) => s.id === songId);
      if (!song) {
        console.error(`Song with ID ${songId} not found`);
        return false;
      }

      // Remove from library store
      await useLibraryStore.getState().removeFromLibrary(songId);

      // Update song status
      song.isInLibrary = false;

      console.log(`✅ Removed song "${song.title}" from library`);
      return true;
    } catch (error) {
      console.error("Error removing song from library:", error);
      return false;
    }
  }

  /**
   * Check if a song is in the library
   */
  isSongInLibrary(songId: string): boolean {
    const song = this.songs.find((s) => s.id === songId);
    return song ? song.isInLibrary : false;
  }

  /**
   * Get songs by category
   */
  getSongsByCategory(category: string): CopyrightFreeSong[] {
    return this.songs.filter((song) => song.category === category);
  }

  /**
   * Search songs by title or artist
   */
  searchSongs(query: string): CopyrightFreeSong[] {
    const lowercaseQuery = query.toLowerCase();
    return this.songs.filter(
      (song) =>
        song.title.toLowerCase().includes(lowercaseQuery) ||
        song.artist.toLowerCase().includes(lowercaseQuery) ||
        song.description.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Get song by ID
   */
  getSongById(songId: string): CopyrightFreeSong | null {
    return this.songs.find((song) => song.id === songId) || null;
  }

  /**
   * Get all songs formatted for library display
   */
  getSongsForLibrary(): any[] {
    return this.songs.map((song) => ({
      _id: song.id,
      id: song.id,
      title: song.title,
      contentType: song.contentType,
      mediaUrl: song.audioUrl,
      fileUrl: song.audioUrl,
      thumbnailUrl: song.thumbnailUrl,
      imageUrl: song.thumbnailUrl,
      speaker: song.artist,
      uploadedBy: song.uploadedBy,
      description: song.description,
      createdAt: song.createdAt,
      views: song.views,
      likes: song.likes,
      isLiked: song.isLiked,
      isInLibrary: song.isInLibrary,
      isPublicDomain: song.isPublicDomain,
      duration: song.duration,
      category: song.category,
      year: song.year,
    }));
  }
}

export default new CopyrightFreeSongsService();
