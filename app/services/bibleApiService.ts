// Bible API Service - Frontend Integration
// Connects to your backend Bible endpoints

import { BaseService } from "../../src/core/services/BaseService";
import {
  areBooksFresh,
  areChaptersFresh,
  areVersesFresh,
  getCachedBooks,
  getCachedChapters,
  getCachedVerses,
  setCachedBooks,
  setCachedChapters,
  setCachedVerses,
} from "./bibleCache";
import {
  getPackBookChapters,
  getPackBooks,
  getPackChapterVerses,
  installPackFromManifest,
  isPackInstalled,
  type PackInstallResult,
} from "./biblePack";
import {
  DEFAULT_TRANSLATION_ID,
  getSelectedTranslationId,
  isTranslationQueryEnabled,
  parseTranslationCatalog,
  parsePackManifest,
  setCachedCatalog,
  clearCatalogAvailability,
  canDownloadPack,
  type BiblePackManifest,
  type BibleTranslation,
  type BibleTranslationCatalog,
} from "./bibleTranslations";

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

interface BibleApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
}

class BibleApiService extends BaseService {
  /** Coalesces concurrent callers of the same endpoint onto one request. */
  private inFlight = new Map<string, Promise<any>>();

  private dedupe<T>(key: string, run: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing) return existing;
    const promise = run().finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, promise);
    return promise;
  }

  private translationQuery(path: string): string {
    if (!isTranslationQueryEnabled()) return path;
    const id = getSelectedTranslationId() || DEFAULT_TRANSLATION_ID;
    const sep = path.includes("?") ? "&" : "?";
    return `${path}${sep}translation=${encodeURIComponent(id)}`;
  }

  private async makeRequest<T>(endpoint: string): Promise<BibleApiResponse<T>> {
    const response = await this.get<T>(endpoint, undefined, { requireAuth: false });

    if (!response.success) {
      if (__DEV__) console.error(`❌ Bible API Error:`, response.error);
      throw new Error(response.error || "Bible API request failed");
    }

    // Transform ApiResponse to BibleApiResponse format for backward compatibility
    const data = this.extractData<T>(response);
    if (!data) {
      throw new Error("No data returned from Bible API");
    }

    return {
      success: true,
      data,
    };
  }

  // Books endpoints
  async getAllBooks(): Promise<BibleBook[]> {
    const translationId = getSelectedTranslationId();
    if (isPackInstalled(translationId)) {
      const packed = await getPackBooks(translationId);
      if (packed?.length) return packed;
    }
    const cached = getCachedBooks(translationId);
    if (cached) {
      if (!areBooksFresh(translationId)) {
        void this.fetchAllBooks().catch(() => {});
      }
      return cached;
    }
    return this.fetchAllBooks();
  }

  private fetchAllBooks(): Promise<BibleBook[]> {
    return this.dedupe(`books:${getSelectedTranslationId()}`, async () => {
    const response = await this.makeRequest<BibleBook[]>(
      this.translationQuery("/api/bible/books")
    );
    setCachedBooks(response.data, getSelectedTranslationId());
    return response.data;
    });
  }

  async getOldTestamentBooks(): Promise<BibleBook[]> {
    const response = await this.makeRequest<BibleBook[]>(
      this.translationQuery("/api/bible/books/testament/old")
    );
    return response.data;
  }

  async getNewTestamentBooks(): Promise<BibleBook[]> {
    const response = await this.makeRequest<BibleBook[]>(
      this.translationQuery("/api/bible/books/testament/new")
    );
    return response.data;
  }

  async getBook(bookName: string): Promise<BibleBook> {
    const response = await this.makeRequest<BibleBook>(
      this.translationQuery(`/api/bible/books/${encodeURIComponent(bookName)}`)
    );
    return response.data;
  }

  // Chapters endpoints
  async getBookChapters(bookName: string): Promise<BibleChapter[]> {
    const translationId = getSelectedTranslationId();
    if (isPackInstalled(translationId)) {
      const packed = await getPackBookChapters(translationId, bookName);
      if (packed?.length) return packed;
    }
    const cached = getCachedChapters(bookName, translationId);
    if (cached) {
      if (!areChaptersFresh(bookName, translationId)) {
        void this.fetchBookChapters(bookName).catch(() => {});
      }
      return cached;
    }
    return this.fetchBookChapters(bookName);
  }

  private fetchBookChapters(bookName: string): Promise<BibleChapter[]> {
    return this.dedupe(
      `chapters:${getSelectedTranslationId()}:${bookName}`,
      async () => {
        const response = await this.makeRequest<BibleChapter[]>(
          this.translationQuery(
            `/api/bible/books/${encodeURIComponent(bookName)}/chapters`
          )
        );
        setCachedChapters(bookName, response.data, getSelectedTranslationId());
        return response.data;
      }
    );
  }

  async getChapter(
    bookName: string,
    chapterNumber: number
  ): Promise<BibleChapter & { actualVerseCount?: number }> {
    const translationId = getSelectedTranslationId();
    if (isPackInstalled(translationId)) {
      const verses = await getPackChapterVerses(
        translationId,
        bookName,
        chapterNumber
      );
      if (verses?.length) {
        return {
          _id: `${bookName}-${chapterNumber}`,
          bookName,
          chapterNumber,
          verseCount: verses.length,
          actualVerseCount: verses.length,
        };
      }
    }
    const response = await this.makeRequest<
      BibleChapter & { actualVerseCount?: number }
    >(
      this.translationQuery(
        `/api/bible/books/${encodeURIComponent(
          bookName
        )}/chapters/${chapterNumber}`
      )
    );
    return response.data;
  }

  // Verses endpoints
  async getChapterVerses(
    bookName: string,
    chapterNumber: number
  ): Promise<BibleVerse[]> {
    const translationId = getSelectedTranslationId();
    if (isPackInstalled(translationId)) {
      const packed = await getPackChapterVerses(
        translationId,
        bookName,
        chapterNumber
      );
      if (packed?.length) return packed;
    }
    const cached = getCachedVerses(bookName, chapterNumber, translationId);
    if (cached) {
      if (!areVersesFresh(bookName, chapterNumber, translationId)) {
        void this.fetchChapterVerses(bookName, chapterNumber).catch(() => {});
      }
      return cached;
    }
    return this.fetchChapterVerses(bookName, chapterNumber);
  }

  private fetchChapterVerses(
    bookName: string,
    chapterNumber: number
  ): Promise<BibleVerse[]> {
    return this.dedupe(
      `verses:${getSelectedTranslationId()}:${bookName}:${chapterNumber}`,
      async () => {
    const response = await this.makeRequest<BibleVerse[]>(
      this.translationQuery(
        `/api/bible/books/${encodeURIComponent(
          bookName
        )}/chapters/${chapterNumber}/verses`
      )
    );
    setCachedVerses(
      bookName,
      chapterNumber,
      response.data,
      getSelectedTranslationId()
    );
    return response.data;
      }
    );
  }

  async getVerse(
    bookName: string,
    chapterNumber: number,
    verseNumber: number
  ): Promise<BibleVerse> {
    const response = await this.makeRequest<BibleVerse>(
      this.translationQuery(
        `/api/bible/books/${encodeURIComponent(
          bookName
        )}/chapters/${chapterNumber}/verses/${verseNumber}`
      )
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
        this.translationQuery(`/api/bible/verses/range/${encodedReference}`)
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
      this.translationQuery(`/api/bible/search?${params}`)
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
        this.translationQuery(`/api/bible/search/advanced?${params}`)
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
      this.translationQuery("/api/bible/verses/random")
    );
    return response.data;
  }

  async getDailyVerse(): Promise<BibleVerse> {
    const response = await this.makeRequest<BibleVerse>(
      this.translationQuery("/api/bible/verses/daily")
    );
    return response.data;
  }

  async getPopularVerses(limit: number = 10): Promise<BibleVerse[]> {
    const response = await this.makeRequest<BibleVerse[]>(
      this.translationQuery(`/api/bible/verses/popular?limit=${limit}`)
    );
    return response.data;
  }

  // Statistics
  async getBibleStats(): Promise<any> {
    const response = await this.makeRequest<any>(
      this.translationQuery("/api/bible/stats")
    );
    return response.data;
  }

  // Study tools
  async getCrossReferences(
    bookName: string,
    chapterNumber: number,
    verseNumber: number
  ): Promise<any> {
    const response = await this.makeRequest<any>(
      this.translationQuery(
        `/api/bible/books/${encodeURIComponent(
          bookName
        )}/chapters/${chapterNumber}/verses/${verseNumber}/cross-references`
      )
    );
    return response.data;
  }

  async getCommentary(
    bookName: string,
    chapterNumber: number,
    verseNumber: number
  ): Promise<any> {
    const response = await this.makeRequest<any>(
      this.translationQuery(
        `/api/bible/books/${encodeURIComponent(
          bookName
        )}/chapters/${chapterNumber}/verses/${verseNumber}/commentary`
      )
    );
    return response.data;
  }

  /**
   * Public catalog. 404/500 → hide picker and omit `?translation=`
   * (live corpus is WEB). Parses `data.defaultId` + `data.translations[]`.
   */
  async getTranslations(): Promise<BibleTranslationCatalog | null> {
    try {
      const response = await this.get<unknown>(
        "/api/bible/translations",
        undefined,
        { requireAuth: false }
      );
      if (!response.success) {
        clearCatalogAvailability();
        return null;
      }
      const catalog = parseTranslationCatalog(response.data);
      if (!catalog) {
        clearCatalogAvailability();
        return null;
      }
      setCachedCatalog(catalog);
      return catalog;
    } catch {
      clearCatalogAvailability();
      return null;
    }
  }

  async getPackManifest(
    translationId: string
  ): Promise<BiblePackManifest | null> {
    const result = await this.fetchPackManifest(translationId);
    return result.ok ? result.manifest : null;
  }

  async fetchPackManifest(
    translationId: string
  ): Promise<
    | { ok: true; manifest: BiblePackManifest }
    | PackInstallResult & { ok: false }
  > {
    try {
      const response = await this.get<unknown>(
        `/api/bible/translations/${encodeURIComponent(translationId)}/manifest`,
        undefined,
        { requireAuth: false }
      );
      if (!response.success) {
        const err = String(response.error || "");
        if (/requires license/i.test(err)) {
          return { ok: false, reason: "licensed" };
        }
        if (/too large for lite/i.test(err)) {
          return { ok: false, reason: "too-large" };
        }
        if (/pack unavailable|unknown translation/i.test(err)) {
          return { ok: false, reason: "unavailable" };
        }
        return { ok: false, reason: "unavailable" };
      }
      const manifest = parsePackManifest(response.data);
      if (!manifest) return { ok: false, reason: "unavailable" };
      return { ok: true, manifest };
    } catch {
      return { ok: false, reason: "unavailable" };
    }
  }

  async downloadTranslationPack(
    translation: BibleTranslation
  ): Promise<PackInstallResult> {
    if (translation.license === "licensed") {
      return { ok: false, reason: "licensed" };
    }
    if (!canDownloadPack(translation)) {
      return {
        ok: false,
        reason: translation.offline ? "too-large" : "unavailable",
      };
    }
    const fetched = await this.fetchPackManifest(translation.id);
    if (!fetched.ok) return fetched;
    return installPackFromManifest(fetched.manifest);
  }
}

export const bibleApiService = new BibleApiService();
