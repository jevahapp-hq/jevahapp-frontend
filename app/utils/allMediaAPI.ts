import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8081';

export interface AllMediaItem {
  _id: string;
  title: string;
  description?: string;
  contentType: 'videos' | 'music' | 'books' | 'live';
  category?: string;
  topics?: string[];
  fileUrl: string;
  thumbnailUrl?: string;
  uploadedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  duration?: number;
  viewCount?: number;
  listenCount?: number;
  readCount?: number;
  downloadCount?: number;
  favoriteCount?: number;
  shareCount?: number;
  commentCount?: number;
}

export interface AllMediaResponse {
  success: boolean;
  media: AllMediaItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class AllMediaAPI {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
    console.log(`🌐 AllMediaAPI initialized with base URL: ${this.baseURL}`);
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

  private async getAuthHeaders(): Promise<HeadersInit> {
    try {
      let token = await AsyncStorage.getItem('userToken');
      if (!token) {
        token = await AsyncStorage.getItem('token');
      }
      if (!token) {
        try {
          const { default: SecureStore } = await import('expo-secure-store');
          token = await SecureStore.getItemAsync('jwt');
        } catch (secureStoreError) {
          console.log('SecureStore not available or no JWT token');
        }
      }
      
      if (token) {
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        };
      }
      
      return {
        'Content-Type': 'application/json',
      };
    } catch (error) {
      console.error('Error getting auth headers:', error);
      return {
        'Content-Type': 'application/json',
      };
    }
  }

  private async fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 10000): Promise<Response> {
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
        console.log(`🔄 Attempt ${attempt}/${retries} - Fetching from: ${url}`);
        const response = await this.fetchWithTimeout(url, options, 15000);
        
        if (response.ok) {
          console.log(`✅ Request successful on attempt ${attempt}`);
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

  async getAllMedia(params: {
    sort?: 'views' | 'comments' | 'likes' | 'reads' | 'createdAt' | 'updatedAt';
    contentType?: 'videos' | 'music' | 'books' | 'live';
    category?: string;
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<AllMediaResponse> {
    try {
      const headers = await this.getAuthHeaders();
      
      const queryParams = new URLSearchParams();
      if (params.sort) queryParams.append('sort', params.sort);
      if (params.contentType) queryParams.append('contentType', params.contentType);
      if (params.category) queryParams.append('category', params.category);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);

      const url = `${this.baseURL}/api/media?${queryParams.toString()}`;
      
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers,
      });

      const data = await response.json();
      console.log(`✅ Successfully fetched ${data.media?.length || 0} media items`);
      return data;
    } catch (error) {
      console.error('❌ Error fetching all media:', error);
      
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
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0,
        },
      };
    }
  }

  async getTrendingMedia(limit: number = 20): Promise<AllMediaResponse> {
    return this.getAllMedia({
      sort: 'views',
      limit,
    });
  }

  async getMostCommentedMedia(limit: number = 20): Promise<AllMediaResponse> {
    return this.getAllMedia({
      sort: 'comments',
      limit,
    });
  }

  async getMostLikedMedia(limit: number = 20): Promise<AllMediaResponse> {
    return this.getAllMedia({
      sort: 'likes',
      limit,
    });
  }

  async getLatestMedia(limit: number = 20): Promise<AllMediaResponse> {
    return this.getAllMedia({
      sort: 'createdAt',
      limit,
    });
  }

  async searchAllMedia(searchTerm: string, limit: number = 20): Promise<AllMediaResponse> {
    return this.getAllMedia({
      search: searchTerm,
      limit,
    });
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🔍 Testing connection to: ${this.baseURL}`);
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }, 5000);

      if (response.ok) {
        console.log('✅ API connection test successful');
        return { success: true, message: 'API connection successful' };
      } else {
        console.log(`⚠️ API connection test failed with status: ${response.status}`);
        return { success: false, message: `API returned status ${response.status}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ API connection test failed: ${errorMessage}`);
      
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
}

export default new AllMediaAPI();
