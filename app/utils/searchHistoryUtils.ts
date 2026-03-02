import AsyncStorage from '@react-native-async-storage/async-storage';
import unifiedSearchAPI from '../services/unifiedSearchAPI';

const SEARCH_HISTORY_KEY = 'search_history';
const TRENDING_SEARCHES_KEY = 'trending_searches';
const MAX_HISTORY_ITEMS = 20;

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
  resultCount?: number;
}

export interface TrendingSearch {
  query: string;
  count: number;
  category?: string;
}

/**
 * Add a search query to the search history
 */
export const addToSearchHistory = async (query: string, resultCount?: number): Promise<void> => {
  try {
    if (!query.trim()) return;
    
    const history = await getSearchHistory();
    const newItem: SearchHistoryItem = {
      query: query.trim(),
      timestamp: Date.now(),
      resultCount
    };
    
    // Remove existing entry if it exists
    const filteredHistory = history.filter(item => item.query.toLowerCase() !== query.toLowerCase());
    
    // Add new item to the beginning
    const updatedHistory = [newItem, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
    
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error adding to search history:', error);
  }
};

/**
 * Get the search history
 */
export const getSearchHistory = async (): Promise<SearchHistoryItem[]> => {
  try {
    const historyString = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
    if (!historyString) return [];
    
    const history = JSON.parse(historyString) as SearchHistoryItem[];
    return history.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error getting search history:', error);
    return [];
  }
};

/**
 * Remove a specific item from search history
 */
export const removeFromSearchHistory = async (query: string): Promise<void> => {
  try {
    const history = await getSearchHistory();
    const filteredHistory = history.filter(item => item.query.toLowerCase() !== query.toLowerCase());
    
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filteredHistory));
  } catch (error) {
    console.error('Error removing from search history:', error);
  }
};

/**
 * Clear all search history
 */
export const clearSearchHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch (error) {
    console.error('Error clearing search history:', error);
  }
};

/**
 * Get trending searches from unified search API
 */
export const getTrendingSearches = async (): Promise<TrendingSearch[]> => {
  try {
    // Check if we have cached trending searches
    const cachedString = await AsyncStorage.getItem(TRENDING_SEARCHES_KEY);
    if (cachedString) {
      const cached = JSON.parse(cachedString) as { data: TrendingSearch[], timestamp: number };
      // Return cached data if it's less than 1 hour old
      if (Date.now() - cached.timestamp < 3600000) {
        return cached.data;
      }
    }
    
    // Fetch trending searches from API
    try {
      const response = await unifiedSearchAPI.getTrending(10, 'week');
      if (response.success && response.data?.trending) {
        const trending = response.data.trending;
        
        // Cache the trending searches
        await AsyncStorage.setItem(TRENDING_SEARCHES_KEY, JSON.stringify({
          data: trending,
          timestamp: Date.now()
        }));
        
        return trending;
      }
    } catch (apiError) {
      console.warn('Failed to fetch trending searches from API, using fallback:', apiError);
    }
    
    // Fallback to mock trending searches if API fails
    const mockTrending: TrendingSearch[] = [
      { query: 'worship music', count: 1250, category: 'music' },
      { query: 'bible study', count: 980, category: 'education' },
      { query: 'prayer', count: 850, category: 'spiritual' },
      { query: 'sermon', count: 720, category: 'video' },
      { query: 'christian podcast', count: 650, category: 'audio' },
      { query: 'devotional', count: 580, category: 'reading' },
      { query: 'hymn', count: 520, category: 'music' },
      { query: 'testimony', count: 480, category: 'video' },
      { query: 'bible verse', count: 420, category: 'reading' },
      { query: 'praise and worship', count: 380, category: 'music' }
    ];
    
    return mockTrending;
  } catch (error) {
    console.error('Error getting trending searches:', error);
    return [];
  }
};

/**
 * Update trending searches (call this periodically or when new searches are made)
 */
export const updateTrendingSearches = async (): Promise<void> => {
  try {
    // This would typically make an API call to get real trending data
    // For now, we'll just refresh the cache
    await AsyncStorage.removeItem(TRENDING_SEARCHES_KEY);
    await getTrendingSearches();
  } catch (error) {
    console.error('Error updating trending searches:', error);
  }
};

/**
 * Search within history
 */
export const searchInHistory = async (query: string): Promise<SearchHistoryItem[]> => {
  try {
    const history = await getSearchHistory();
    const searchTerm = query.toLowerCase();
    
    return history.filter(item => 
      item.query.toLowerCase().includes(searchTerm)
    );
  } catch (error) {
    console.error('Error searching in history:', error);
    return [];
  }
};

/**
 * Get search suggestions based on history and trending
 */
export const getSearchSuggestions = async (query: string): Promise<string[]> => {
  try {
    if (!query.trim()) return [];
    
    const searchTerm = query.toLowerCase();
    const history = await getSearchHistory();
    const trending = await getTrendingSearches();
    
    const suggestions = new Set<string>();
    
    // Add matching history items
    history.forEach(item => {
      if (item.query.toLowerCase().includes(searchTerm)) {
        suggestions.add(item.query);
      }
    });
    
    // Add matching trending searches
    trending.forEach(item => {
      if (item.query.toLowerCase().includes(searchTerm)) {
        suggestions.add(item.query);
      }
    });
    
    return Array.from(suggestions).slice(0, 10);
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    return [];
  }
};
