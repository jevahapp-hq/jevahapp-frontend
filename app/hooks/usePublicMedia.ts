import { useCallback, useEffect, useState } from 'react';
import publicMediaService, { AllPublicContentResponse, PublicMediaItem } from '../services/publicMediaService';
import { MediaItem, useMediaStore } from '../store/useUploadStore';

interface UsePublicMediaOptions {
  autoFetch?: boolean;
  transformToStore?: boolean;
}

interface UsePublicMediaReturn {
  publicMedia: PublicMediaItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  total: number;
  success: boolean;
}

export const usePublicMedia = (options: UsePublicMediaOptions = {}): UsePublicMediaReturn => {
  const { autoFetch = true, transformToStore = true } = options;
  const [publicMedia, setPublicMedia] = useState<PublicMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [success, setSuccess] = useState(false);

  const mediaStore = useMediaStore();

  const fetchPublicMedia = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Fetching all public media...');
      const response: AllPublicContentResponse = await publicMediaService.fetchAllPublicContent();
      
      if (response.success && Array.isArray(response.media)) {
        setPublicMedia(response.media);
        setTotal(response.total || response.media.length);
        setSuccess(true);
        
        console.log(`✅ Successfully loaded ${response.media.length} public media items`);
        
        // Transform and add to media store if requested
        if (transformToStore) {
          const transformedMedia: MediaItem[] = response.media.map(item => 
            publicMediaService.transformToMediaItem(item)
          );
          
          console.log(`🔄 Adding ${transformedMedia.length} items to media store...`);
          mediaStore.setMediaList(transformedMedia);
        }
      } else {
        console.warn('⚠️ Public media response was not successful:', response);
        setPublicMedia([]);
        setTotal(0);
        setSuccess(false);
        setError('Failed to fetch public media');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Error fetching public media:', errorMessage);
      setError(errorMessage);
      setPublicMedia([]);
      setTotal(0);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }, [transformToStore, mediaStore]);

  useEffect(() => {
    if (autoFetch) {
      fetchPublicMedia();
    }
  }, [autoFetch, fetchPublicMedia]);

  return {
    publicMedia,
    loading,
    error,
    refetch: fetchPublicMedia,
    total,
    success,
  };
};

// Hook for filtered public media
export const useFilteredPublicMedia = (filters: {
  contentType?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}) => {
  const [publicMedia, setPublicMedia] = useState<PublicMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  const fetchFilteredMedia = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Fetching filtered public media with filters:', filters);
      const response = await publicMediaService.fetchPublicMedia(filters);
      
      if (response.success && Array.isArray(response.media)) {
        setPublicMedia(response.media);
        setPagination(response.pagination);
        console.log(`✅ Successfully loaded ${response.media.length} filtered media items`);
      } else {
        console.warn('⚠️ Filtered media response was not successful:', response);
        setPublicMedia([]);
        setError('Failed to fetch filtered media');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Error fetching filtered media:', errorMessage);
      setError(errorMessage);
      setPublicMedia([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchFilteredMedia();
  }, [fetchFilteredMedia]);

  return {
    publicMedia,
    loading,
    error,
    refetch: fetchFilteredMedia,
    pagination,
  };
};

// Hook for testing public media connection
export const usePublicMediaConnection = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testConnection = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await publicMediaService.testPublicConnection();
      setIsConnected(result.success);
      if (!result.success) {
        setError(result.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    testConnection();
  }, [testConnection]);

  return {
    isConnected,
    isLoading,
    error,
    testConnection,
  };
};
