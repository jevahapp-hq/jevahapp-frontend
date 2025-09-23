
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://jevahapp-backend.onrender.com';

// TypeScript types for public media responses based on your documentation
export type PublicContentType = "videos" | "audio" | "ebook" | "music" | "live";

export interface PublicAuthorInfo {
  _id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  avatar?: string;
  section?: string;
}

export interface PublicMediaItem {
  _id: string;
  title: string;
  description?: string;
  contentType: PublicContentType;
  category?: string;
  fileUrl: string;
  thumbnailUrl?: string;
  thumbnail?: string; // alias of thumbnailUrl in some responses
  topics?: string[];
  viewCount?: number;
  shareCount?: number;
  likeCount?: number;
  commentCount?: number;
  totalLikes?: number;
  totalShares?: number;
  totalViews?: number;
  createdAt?: string;
  updatedAt?: string;
  formattedCreatedAt?: string;
  authorInfo?: PublicAuthorInfo;
  // Additional fields that might be present
  duration?: number;
  isLive?: boolean;
  concurrentViewers?: number;
}

export interface AllPublicContentResponse {
  success: boolean;
  media: PublicMediaItem[];
  total: number;
}

export interface PublicMediaResponse {
  success: boolean;
  media: PublicMediaItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class PublicMediaService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
    console.log(`🌐 PublicMediaService initialized with base URL: ${this.baseURL}`);
  }

  private isNetworkError(error: Error): boolean {
    const networkErrorMessages = [
      'Network request failed',
      'Request timeout',
      'fetch',
      'ERR_NETWORK',
      'ERR_INTERNET_DISCONNECTED',
      'ERR_CONNECTION_REFUSED',
      'ERR_CONNECTION_TIMED_OUT'
    ];
    
    return networkErrorMessages.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }

  private async fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 15000): Promise<Response> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, timeoutMs);

      fetch(url, options)
        .then((response) => {
          clearTimeout(timeoutId);
          resolve(response);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private async makeRequest(url: string, options: RequestInit, retries: number = 3): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${retries} - Fetching public media from: ${url}`);
        const response = await this.fetchWithTimeout(url, options, 20000);
        
        if (response.ok) {
          console.log(`✅ Public media request successful on attempt ${attempt}`);
          return response;
        } else if (response.status >= 500 && attempt < retries) {
          // Server error - retry
          console.log(`⚠️ Server error ${response.status}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        } else {
          // Client error - don't retry
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (error) {
        lastError = error as Error;
        console.log(`❌ Attempt ${attempt} failed:`, error);
        
        if (attempt < retries) {
          // Network error - retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  }

  // Get all public media without pagination (for "All" tab)
  async fetchAllPublicContent(): Promise<AllPublicContentResponse> {
    try {
      const url = `${this.baseURL}/api/media/public/all-content`;
      console.log(`🌐 Fetching all public content from: ${url}`);
      
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log(`✅ Successfully fetched ${data.media?.length || 0} public media items`);
      
      // Validate response structure
      if (!data.success || !Array.isArray(data.media)) {
        console.warn('⚠️ Unexpected response structure:', data);
        return {
          success: false,
          media: [],
          total: 0,
        };
      }

      return data;
    } catch (error) {
      console.error('❌ Error fetching all public content:', error);
      
      // Determine error type and provide appropriate fallback
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (this.isNetworkError(error as Error)) {
        console.log('🌐 Network connectivity issue detected - returning empty response');
        console.log('💡 Tip: Check your internet connection and server availability');
      } else if (errorMessage.includes('HTTP error')) {
        console.log('🔧 Server error detected - returning empty response');
      } else {
        console.log('❓ Unknown error - returning empty response');
      }
      
      // Return empty response instead of throwing to prevent app crashes
      return {
        success: false,
        media: [],
        total: 0,
      };
    }
  }

  // Get public media with pagination and filters
  async fetchPublicMedia(params: {
    search?: string;
    contentType?: string;
    category?: string;
    topics?: string;
    sort?: string;
    page?: number;
    limit?: number;
    creator?: string;
    duration?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<PublicMediaResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append('search', params.search);
      if (params.contentType) queryParams.append('contentType', params.contentType);
      if (params.category) queryParams.append('category', params.category);
      if (params.topics) queryParams.append('topics', params.topics);
      if (params.sort) queryParams.append('sort', params.sort);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.creator) queryParams.append('creator', params.creator);
      if (params.duration) queryParams.append('duration', params.duration);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);

      const url = `${this.baseURL}/api/media/public?${queryParams.toString()}`;
      console.log(`🌐 Fetching public media with filters from: ${url}`);
      
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log(`✅ Successfully fetched ${data.media?.length || 0} filtered public media items`);
      
      // Validate response structure
      if (!data.success || !Array.isArray(data.media)) {
        console.warn('⚠️ Unexpected response structure:', data);
        return {
          success: false,
          media: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            pages: 0,
          },
        };
      }

      return data;
    } catch (error) {
      console.error('❌ Error fetching public media with filters:', error);
      
      // Return empty response instead of throwing to prevent app crashes
      return {
        success: false,
        media: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0,
        },
      };
    }
  }

  // Search public media
  async searchPublicMedia(searchTerm: string, filters: {
    contentType?: string;
    category?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<PublicMediaResponse> {
    return this.fetchPublicMedia({
      search: searchTerm,
      ...filters,
    });
  }

  // Get single public media item by ID
  async fetchPublicMediaById(mediaId: string): Promise<{ success: boolean; media?: PublicMediaItem }> {
    try {
      const url = `${this.baseURL}/api/media/public/${mediaId}`;
      console.log(`🌐 Fetching public media by ID from: ${url}`);
      
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log(`✅ Successfully fetched public media item: ${mediaId}`);
      
      return data;
    } catch (error) {
      console.error(`❌ Error fetching public media item ${mediaId}:`, error);
      
      return {
        success: false,
      };
    }
  }

  // Test connection to public endpoints
  async testPublicConnection(): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🔍 Testing public media connection to: ${this.baseURL}`);
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/media/public/all-content`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }, 10000);

      if (response.ok) {
        console.log('✅ Public media API connection test successful');
        return { success: true, message: 'Public media API connection successful' };
      } else {
        console.log(`⚠️ Public media API connection test failed with status: ${response.status}`);
        return { success: false, message: `Public media API returned status ${response.status}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ Public media API connection test failed: ${errorMessage}`);
      
      if (this.isNetworkError(error as Error)) {
        return { 
          success: false, 
          message: 'Network connection failed. Please check your internet connection.' 
        };
      } else {
        return { 
          success: false, 
          message: `Connection failed: ${errorMessage}` 
        };
      }
    }
  }

  // Helper function to transform backend response to match frontend MediaItem interface
  transformToMediaItem(publicItem: PublicMediaItem): any {
    return {
      _id: publicItem._id,
      title: publicItem.title,
      description: publicItem.description || '',
      contentType: publicItem.contentType,
      category: publicItem.category ? [publicItem.category] : [],
      type: publicItem.contentType,
      fileUrl: publicItem.fileUrl,
      fileMimeType: this.getMimeTypeFromContentType(publicItem.contentType),
      uploadedBy: publicItem.authorInfo?.fullName || 
                 `${publicItem.authorInfo?.firstName || ''} ${publicItem.authorInfo?.lastName || ''}`.trim() || 
                 'Unknown User',
      viewCount: publicItem.viewCount || publicItem.totalViews || 0,
      listenCount: publicItem.contentType === 'music' || publicItem.contentType === 'audio' ? (publicItem.viewCount || 0) : 0,
      readCount: publicItem.contentType === 'ebook' ? (publicItem.viewCount || 0) : 0,
      downloadCount: 0, // Not provided in public API
      isLive: publicItem.isLive || false,
      concurrentViewers: publicItem.concurrentViewers || 0,
      createdAt: publicItem.createdAt || new Date().toISOString(),
      updatedAt: publicItem.updatedAt || new Date().toISOString(),
      topics: publicItem.topics || [],
      thumbnailUrl: publicItem.thumbnailUrl || publicItem.thumbnail,
      speaker: publicItem.authorInfo?.fullName || 
               `${publicItem.authorInfo?.firstName || ''} ${publicItem.authorInfo?.lastName || ''}`.trim() || 
               'Unknown Speaker',
      speakerAvatar: publicItem.authorInfo?.avatar || require("../../assets/images/Avatar-1.png"),
      favorite: publicItem.likeCount || publicItem.totalLikes || 0,
      saved: 0, // Not provided in public API
      sheared: publicItem.shareCount || publicItem.totalShares || 0,
      comment: publicItem.commentCount || 0,
      comments: publicItem.commentCount || 0,
      shared: publicItem.shareCount || publicItem.totalShares || 0,
      imageUrl: publicItem.thumbnailUrl || publicItem.thumbnail ? 
        { uri: publicItem.thumbnailUrl || publicItem.thumbnail } : 
        { uri: publicItem.fileUrl },
      uri: publicItem.fileUrl,
      onPress: undefined,
    };
  }

  private getMimeTypeFromContentType(contentType: PublicContentType): string {
    const mimeTypes: Record<PublicContentType, string> = {
      'videos': 'video/mp4',
      'audio': 'audio/mpeg',
      'music': 'audio/mpeg',
      'ebook': 'application/pdf',
      'live': 'video/mp4',
    };
    return mimeTypes[contentType] || 'application/octet-stream';
  }
}

export default new PublicMediaService();
