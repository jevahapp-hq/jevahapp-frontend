// Bible API Service - Frontend Integration
// Connects to your backend Bible endpoints

import { getApiBaseUrl } from "../utils/api";

const API_BASE_URL = getApiBaseUrl();

export interface BibleBook {
  _id: string;
  name: string;
  testament: "old" | "new";
  chapterCount: number;
  verseCount: number;
}

export interface BibleChapter {
  _id: string;
  bookName: string;
  chapterNumber: number;
  verseCount: number;
}

export interface BibleVerse {
  _id: string;
  bookId?: string;
  bookName: string;
  chapterNumber: number;
  verseNumber: number;
  text: string;
  translation?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VerseRangeResponse {
  success: boolean;
  data: BibleVerse[];
  count?: number;
  reference?: {
    bookName: string;
    startChapter: number;
    startVerse: number;
    endVerse: number;
  };
}

export interface SearchResult {
  verses: BibleVerse[];
  total: number;
  hasMore: boolean;
  query?: string;
  limit?: number;
  offset?: number;
}

export interface AdvancedSearchVerse extends BibleVerse {
  highlightedText?: string;
  relevanceScore?: number;
  matchedTerms?: string[];
  explanation?: string;
}

export interface AdvancedSearchResult {
  success: boolean;
  data: AdvancedSearchVerse[];
  count?: number;
  queryInterpretation?: string;
  suggestedVerses?: string[];
  searchTerms?: string[];
  isAIEnhanced?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
}

class BibleApiService {
  private async makeRequest<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log(`📖 Bible API Request: ${url}`);

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = {
            message:
              errorText || `HTTP ${response.status}: ${response.statusText}`,
          };
        }
        console.error(`❌ Bible API Error [${response.status}]:`, errorData);
        throw new Error(
          errorData.message || `Request failed with status ${response.status}`
        );
      }

      const data = await response.json();
      console.log(`✅ Bible API Success: ${url}`);
      return data;
    } catch (error) {
      console.error("Bible API Error:", error);
      // Re-throw with more context
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Bible API request failed: ${error}`);
    }
  }

  // Books endpoints
  async getAllBooks(): Promise<BibleBook[]> {
    const response = await this.makeRequest<BibleBook[]>("/api/bible/books");
    return response.data;
  }

  async getOldTestamentBooks(): Promise<BibleBook[]> {
    const response = await this.makeRequest<BibleBook[]>(
      "/api/bible/books/testament/old"
    );
    return response.data;
  }

  async getNewTestamentBooks(): Promise<BibleBook[]> {
    const response = await this.makeRequest<BibleBook[]>(
      "/api/bible/books/testament/new"
    );
    return response.data;
  }

  async getBook(bookName: string): Promise<BibleBook> {
    const response = await this.makeRequest<BibleBook>(
      `/api/bible/books/${encodeURIComponent(bookName)}`
    );
    return response.data;
  }

  // Chapters endpoints
  async getBookChapters(bookName: string): Promise<BibleChapter[]> {
    const response = await this.makeRequest<BibleChapter[]>(
      `/api/bible/books/${encodeURIComponent(bookName)}/chapters`
    );
    return response.data;
  }

  async getChapter(
    bookName: string,
    chapterNumber: number
  ): Promise<BibleChapter & { actualVerseCount?: number }> {
    const response = await this.makeRequest<
      BibleChapter & { actualVerseCount?: number }
    >(
      `/api/bible/books/${encodeURIComponent(
        bookName
      )}/chapters/${chapterNumber}`
    );
    return response.data;
  }

  // Verses endpoints
  async getChapterVerses(
    bookName: string,
    chapterNumber: number
  ): Promise<BibleVerse[]> {
    const response = await this.makeRequest<BibleVerse[]>(
      `/api/bible/books/${encodeURIComponent(
        bookName
      )}/chapters/${chapterNumber}/verses`
    );
    return response.data;
  }

  async getVerse(
    bookName: string,
    chapterNumber: number,
    verseNumber: number
  ): Promise<BibleVerse> {
    const response = await this.makeRequest<BibleVerse>(
      `/api/bible/books/${encodeURIComponent(
        bookName
      )}/chapters/${chapterNumber}/verses/${verseNumber}`
    );
    return response.data;
  }

  /**
   * Get a range of Bible verses
   * @param reference - Bible reference like "John 3:16-18" or "Romans 8:28-31"
   * @returns Array of verses in the range with metadata
   * @example
   * const verses = await bibleApiService.getVerseRange("Romans 8:28-31");
   */
  async getVerseRange(reference: string): Promise<VerseRangeResponse> {
    try {
      const encodedReference = encodeURIComponent(reference);
      const response = await this.makeRequest<VerseRangeResponse>(
        `/api/bible/verses/range/${encodedReference}`
      );

      // Return full response including metadata (count, reference info)
      return response;
    } catch (error) {
      console.error(`❌ Error fetching verse range "${reference}":`, error);
      throw error;
    }
  }

  /**
   * Get verse range as a simple array (backward compatibility)
   * @param reference - Bible reference like "John 3:16-18"
   * @returns Array of verses
   */
  async getVerseRangeArray(reference: string): Promise<BibleVerse[]> {
    const response = await this.getVerseRange(reference);
    return response.data;
  }

  // Search endpoints
  /**
   * Search Bible text
   * @param query - Search query string
   * @param options - Search filters (book, testament, limit, offset)
   * @returns Search results with verses matching the query
   * @example
   * const results = await bibleApiService.searchBible("love", { limit: 10 });
   */
  async searchBible(
    query: string,
    options?: {
      book?: string;
      testament?: "old" | "new";
      limit?: number;
      offset?: number;
    }
  ): Promise<SearchResult> {
    const params = new URLSearchParams({
      q: query,
      ...(options?.book && { book: options.book }),
      ...(options?.testament && { testament: options.testament }),
      ...(options?.limit && { limit: options.limit.toString() }),
      ...(options?.offset && { offset: options.offset.toString() }),
    });

    const response = await this.makeRequest<SearchResult>(
      `/api/bible/search?${params}`
    );

    // Map response data to SearchResult format
    return {
      verses: Array.isArray(response.data) ? response.data : [],
      total: response.total || response.data.length || 0,
      hasMore: options?.offset
        ? (response.total || 0) > options.offset + (options.limit || 50)
        : false,
      query,
      limit: options?.limit,
      offset: options?.offset,
    };
  }

  /**
   * Advanced AI-powered Bible search with natural language processing
   * @param query - Natural language query (e.g., "verse about love", "Pro")
   * @param options - Search filters
   * @returns AI-enhanced search results with highlighting and explanations
   */
  async searchBibleAdvanced(
    query: string,
    options?: {
      book?: string;
      testament?: "old" | "new";
      limit?: number;
    }
  ): Promise<AdvancedSearchResult> {
    try {
      const params = new URLSearchParams({
        q: query,
        limit: (options?.limit || 20).toString(),
        ...(options?.book && { book: options.book }),
        ...(options?.testament && { testament: options.testament }),
      });

      const response = await this.makeRequest<AdvancedSearchResult>(
        `/api/bible/search/advanced?${params}`
      );

      return response;
    } catch (error) {
      console.warn(
        "⚠️ Advanced search failed, will use regular search fallback"
      );
      // Re-throw so component can handle fallback
      throw error;
    }
  }

  async getRandomVerse(): Promise<BibleVerse> {
    const response = await this.makeRequest<BibleVerse>(
      "/api/bible/verses/random"
    );
    return response.data;
  }

  async getDailyVerse(): Promise<BibleVerse> {
    const response = await this.makeRequest<BibleVerse>(
      "/api/bible/verses/daily"
    );
    return response.data;
  }

  async getPopularVerses(limit: number = 10): Promise<BibleVerse[]> {
    const response = await this.makeRequest<BibleVerse[]>(
      `/api/bible/verses/popular?limit=${limit}`
    );
    return response.data;
  }

  // Statistics
  async getBibleStats(): Promise<any> {
    const response = await this.makeRequest<any>("/api/bible/stats");
    return response.data;
  }

  // Study tools
  async getCrossReferences(
    bookName: string,
    chapterNumber: number,
    verseNumber: number
  ): Promise<any> {
    const response = await this.makeRequest<any>(
      `/api/bible/books/${encodeURIComponent(
        bookName
      )}/chapters/${chapterNumber}/verses/${verseNumber}/cross-references`
    );
    return response.data;
  }

  async getCommentary(
    bookName: string,
    chapterNumber: number,
    verseNumber: number
  ): Promise<any> {
    const response = await this.makeRequest<any>(
      `/api/bible/books/${encodeURIComponent(
        bookName
      )}/chapters/${chapterNumber}/verses/${verseNumber}/commentary`
    );
    return response.data;
  }
}

export const bibleApiService = new BibleApiService();
