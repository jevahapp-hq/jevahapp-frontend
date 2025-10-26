// Bible API Service - Frontend Integration
// Connects to your backend Bible endpoints

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

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
  bookName: string;
  chapterNumber: number;
  verseNumber: number;
  text: string;
}

export interface SearchResult {
  verses: BibleVerse[];
  total: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class BibleApiService {
  private async makeRequest<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Request failed");
      }

      return data;
    } catch (error) {
      console.error("Bible API Error:", error);
      throw error;
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
  ): Promise<BibleChapter> {
    const response = await this.makeRequest<BibleChapter>(
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

  async getVerseRange(reference: string): Promise<BibleVerse[]> {
    const response = await this.makeRequest<BibleVerse[]>(
      `/api/bible/verses/range/${encodeURIComponent(reference)}`
    );
    return response.data;
  }

  // Search endpoints
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
    return response.data;
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


