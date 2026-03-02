import allMediaAPI from './allMediaAPI';

export interface MediaItem {
  _id?: string;
  contentType: string;
  fileUrl: string;
  title: string;
  speaker?: string;
  uploadedBy?: string;
  description?: string;
  createdAt: string;
  speakerAvatar?: string | number | { uri: string };
  views?: number;
  sheared?: number;
  saved?: number;
  comment?: number;
  favorite?: number;
  imageUrl?: string | { uri: string };
  thumbnailUrl?: string;
}

export class URLManager {
  private static instance: URLManager;
  private urlCache = new Map<string, { url: string; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): URLManager {
    if (!URLManager.instance) {
      URLManager.instance = new URLManager();
    }
    return URLManager.instance;
  }

  /**
   * Get a valid URL for a media item, with automatic refresh if needed
   */
  async getValidUrl(item: MediaItem): Promise<string> {
    const cacheKey = `${item._id || item.title}-${item.contentType}`;
    const cached = this.urlCache.get(cacheKey);
    
    // Check if we have a recent cached URL
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.url;
    }

    // Validate current URL
    const currentUrl = item.fileUrl;
    if (this.isValidUrl(currentUrl)) {
      // Cache the valid URL
      this.urlCache.set(cacheKey, { url: currentUrl, timestamp: Date.now() });
      return currentUrl;
    }

    // Try to refresh the URL
    console.log(`🔄 URLManager: Refreshing URL for ${item.title}`);
    const refreshedUrl = await this.refreshUrl(item);
    
    if (refreshedUrl) {
      this.urlCache.set(cacheKey, { url: refreshedUrl, timestamp: Date.now() });
      return refreshedUrl;
    }

    // Return fallback URL
    return this.getFallbackUrl(item);
  }

  /**
   * Check if a URL is valid and accessible
   */
  private isValidUrl(url: string): boolean {
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return false;
    }

    // Check if it's a valid HTTP/HTTPS URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return false;
    }

    // Check if it's not a placeholder URL
    const placeholderPatterns = [
      'example.com',
      'placeholder',
      'default',
      'temp',
      'test'
    ];

    return !placeholderPatterns.some(pattern => 
      url.toLowerCase().includes(pattern)
    );
  }

  /**
   * Try to refresh a stale URL from the backend
   */
  private async refreshUrl(item: MediaItem): Promise<string | null> {
    try {
      const response = await allMediaAPI.getAllMedia({
        search: item.title,
        contentType: item.contentType as any,
        limit: 1,
      });

      const fresh = (response as any)?.media?.[0];
      if (fresh?.fileUrl && this.isValidUrl(fresh.fileUrl)) {
        console.log(`✅ URLManager: Found fresh URL for ${item.title}: ${fresh.fileUrl}`);
        return fresh.fileUrl;
      }
    } catch (error) {
      console.warn(`⚠️ URLManager: Failed to refresh URL for ${item.title}:`, error);
    }

    return null;
  }

  /**
   * Get a fallback URL based on content type
   */
  private getFallbackUrl(item: MediaItem): string {
    const fallbackUrls = {
      videos: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      music: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
      ebook: 'https://via.placeholder.com/400x600/4A90E2/FFFFFF?text=E-Book',
      books: 'https://via.placeholder.com/400x600/4A90E2/FFFFFF?text=Book',
      sermon: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      live: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
    };

    return fallbackUrls[item.contentType as keyof typeof fallbackUrls] || 
           fallbackUrls.videos;
  }

  /**
   * Get a fallback image URL for thumbnails
   */
  getFallbackImageUrl(contentType: string): string {
    const fallbackImages = {
      videos: 'https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=Video',
      music: 'https://via.placeholder.com/400x300/4ECDC4/FFFFFF?text=Music',
      ebook: 'https://via.placeholder.com/400x300/45B7D1/FFFFFF?text=E-Book',
      books: 'https://via.placeholder.com/400x300/45B7D1/FFFFFF?text=Book',
      sermon: 'https://via.placeholder.com/400x300/96CEB4/FFFFFF?text=Sermon',
      live: 'https://via.placeholder.com/400x300/FFEAA7/FFFFFF?text=Live'
    };

    return fallbackImages[contentType as keyof typeof fallbackImages] || 
           fallbackImages.videos;
  }

  /**
   * Clear the URL cache
   */
  clearCache(): void {
    this.urlCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.urlCache.size,
      entries: Array.from(this.urlCache.keys())
    };
  }
}

// Export singleton instance
export const urlManager = URLManager.getInstance();
