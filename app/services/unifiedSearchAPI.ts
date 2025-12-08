import { getApiBaseUrl } from "../utils/api";
import TokenUtils from "../utils/tokenUtils";

export interface UnifiedSearchItem {
  id: string;
  _id?: string;
  type: "media" | "copyright-free";
  contentType: string;
  title: string;
  description?: string;
  artist?: string;
  speaker?: string;
  category?: string;
  thumbnailUrl?: string;
  audioUrl?: string;
  fileUrl?: string;
  duration?: number;
  viewCount?: number;
  views?: number;
  likeCount?: number;
  likes?: number;
  listenCount?: number;
  readCount?: number;
  createdAt: string;
  year?: number;
  isLiked?: boolean;
  isInLibrary?: boolean;
  isPublicDomain?: boolean;
  uploadedBy?: string;
}

export interface UnifiedSearchResponse {
  success: boolean;
  data: {
    results: UnifiedSearchItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
    breakdown: {
      media: number;
      copyrightFree: number;
    };
    query: string;
    searchTime: number;
  };
}

export interface SearchSuggestionsResponse {
  success: boolean;
  data: {
    suggestions: string[];
  };
}

export interface TrendingSearchItem {
  query: string;
  count: number;
  category?: string;
}

export interface TrendingSearchesResponse {
  success: boolean;
  data: {
    trending: TrendingSearchItem[];
  };
}

class UnifiedSearchAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${getApiBaseUrl()}/api/search`;
  }

  /**
   * Unified search across all content types
   */
  async search(
    query: string,
    options: {
      contentType?: "all" | "media" | "copyright-free";
      mediaType?: string;
      category?: string;
      limit?: number;
      page?: number;
      sort?: "relevance" | "popular" | "newest" | "oldest" | "title";
    } = {}
  ): Promise<UnifiedSearchResponse> {
    try {
      const {
        contentType = "all",
        mediaType,
        category,
        limit = 20,
        page = 1,
        sort = "relevance",
      } = options;

      const params = new URLSearchParams({
        q: query.trim(),
        page: page.toString(),
        limit: limit.toString(),
        contentType,
        sort,
      });

      if (mediaType) {
        params.append("mediaType", mediaType);
      }
      if (category) {
        params.append("category", category);
      }

      const token = await TokenUtils.getAuthToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: UnifiedSearchResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Error performing unified search:", error);
      throw error;
    }
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(
    query: string,
    limit: number = 10
  ): Promise<SearchSuggestionsResponse> {
    try {
      const params = new URLSearchParams({
        q: query.trim(),
        limit: limit.toString(),
      });

      const token = await TokenUtils.getAuthToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(
        `${this.baseUrl}/suggestions?${params.toString()}`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SearchSuggestionsResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching search suggestions:", error);
      throw error;
    }
  }

  /**
   * Get trending searches
   */
  async getTrending(
    limit: number = 10,
    period: string = "week"
  ): Promise<TrendingSearchesResponse> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        period,
      });

      const token = await TokenUtils.getAuthToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(
        `${this.baseUrl}/trending?${params.toString()}`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: TrendingSearchesResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching trending searches:", error);
      throw error;
    }
  }
}

const unifiedSearchAPI = new UnifiedSearchAPI();
export default unifiedSearchAPI;

