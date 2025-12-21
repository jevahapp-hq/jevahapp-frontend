import { Dimensions, PixelRatio } from 'react-native';

/**
 * Image optimization utility for mobile data savings
 * Generates optimized image URLs based on device capabilities
 * Works with cdn.jevahapp.com and other CDNs
 */

export interface ImageSize {
  width: number;
  height: number;
  quality?: number; // 0-100
}

/**
 * Get optimal image size based on device pixel ratio and screen size
 */
export const getOptimalImageSize = (
  containerWidth: number,
  containerHeight?: number
): ImageSize => {
  const pixelRatio = PixelRatio.get();
  const screenWidth = Dimensions.get('window').width;
  
  // Calculate optimal width (don't exceed screen width)
  let optimalWidth = Math.min(containerWidth * pixelRatio, screenWidth * pixelRatio);
  
  // For thumbnails in lists, use smaller sizes
  if (containerWidth <= 150) {
    optimalWidth = Math.min(optimalWidth, 300); // Max 300px for small thumbnails
  } else if (containerWidth <= 300) {
    optimalWidth = Math.min(optimalWidth, 600); // Max 600px for medium thumbnails
  }
  
  // Calculate height if provided
  const optimalHeight = containerHeight 
    ? Math.min(containerHeight * pixelRatio, optimalWidth * (containerHeight / containerWidth))
    : optimalWidth;
  
  return {
    width: Math.round(optimalWidth),
    height: Math.round(optimalHeight),
    quality: 85, // Good balance between quality and file size
  };
};

/**
 * Optimize image URL for mobile data savings
 * 
 * Strategy:
 * 1. If Cloudflare Images is available, use transformation parameters
 * 2. If Cloudflare R2/CDN supports query params, add optimization params
 * 3. If not, return original URL (no breaking changes)
 * 4. For very small containers, use lower quality
 * 
 * @param originalUrl - Original image URL from API
 * @param containerWidth - Width of the container displaying the image
 * @param containerHeight - Optional height of the container
 * @param options - Additional optimization options
 */
export const optimizeImageUrl = (
  originalUrl: string | undefined | null,
  containerWidth: number,
  containerHeight?: number,
  options?: {
    quality?: number;
    format?: 'webp' | 'jpg' | 'png';
    blur?: boolean; // For placeholder blur effect
  }
): string | undefined => {
  if (!originalUrl) return undefined;
  
  // If URL is invalid, return as-is
  if (!originalUrl.startsWith('http') && !originalUrl.startsWith('file://') && !originalUrl.startsWith('content://')) {
    return originalUrl;
  }
  
  const { width, height, quality } = getOptimalImageSize(containerWidth, containerHeight);
  const finalQuality = options?.quality || quality;
  const format = options?.format || 'webp'; // WebP is 30% smaller than JPEG
  
  try {
    const url = new URL(originalUrl);
    
    // Strategy 1: Cloudflare Images (if using Cloudflare Images service)
    // Format: https://imagedelivery.net/{account_hash}/{image_id}/{variant_name}
    if (url.hostname.includes('imagedelivery.net')) {
      // Cloudflare Images supports automatic optimization
      // Just return the URL - Cloudflare handles optimization automatically
      return originalUrl;
    }
    
    // Strategy 2: Jevah CDN (cdn.jevahapp.com) or Cloudflare R2 with Transformations
    // Check if Cloudflare Transform is available or use query params
    if (url.hostname.includes('cdn.jevahapp.com') || 
        url.hostname.includes('r2.dev') || 
        url.hostname.includes('pub-') ||
        url.hostname.includes('cloudflare')) {
      
      // Add Cloudflare Transform parameters or generic CDN params
      const transformParams = new URLSearchParams();
      
      // Use Cloudflare Transform format if available
      if (url.hostname.includes('cdn.jevahapp.com')) {
        // For Jevah CDN, add width/height/quality params
        transformParams.set('width', width.toString());
        if (containerHeight) {
          transformParams.set('height', height.toString());
        }
        transformParams.set('quality', finalQuality.toString());
        transformParams.set('format', format);
      } else {
        // Generic CDN parameters
        transformParams.set('w', width.toString());
        if (containerHeight) {
          transformParams.set('h', height.toString());
        }
        transformParams.set('q', finalQuality.toString());
      }
      
      // For placeholder blur effect
      if (options?.blur) {
        transformParams.set('blur', '20');
      }
      
      // Append or create query string
      const separator = url.search ? '&' : '?';
      return `${originalUrl}${separator}${transformParams.toString()}`;
    }
    
    // Strategy 3: Generic CDN optimization (works with most CDNs)
    // Many CDNs support width/height parameters
    const cdnParams = new URLSearchParams();
    cdnParams.set('w', width.toString());
    if (containerHeight) {
      cdnParams.set('h', height.toString());
    }
    cdnParams.set('q', finalQuality.toString());
    
    // Check if URL already has query params
    const separator = url.search ? '&' : '?';
    const optimizedUrl = `${originalUrl}${separator}${cdnParams.toString()}`;
    
    // For placeholder blur effect
    if (options?.blur) {
      const blurParams = new URLSearchParams(cdnParams);
      blurParams.set('blur', '20');
      return `${originalUrl}${separator}${blurParams.toString()}`;
    }
    
    return optimizedUrl;
    
  } catch (error) {
    // If URL parsing fails, return original (no breaking changes)
    if (__DEV__) {
      console.warn('Image URL optimization failed, using original:', error);
    }
    return originalUrl;
  }
};

/**
 * Get thumbnail URL with optimization
 * Use this for list views, cards, and previews
 */
export const getOptimizedThumbnail = (
  thumbnailUrl: string | undefined | null,
  size: 'small' | 'medium' | 'large' = 'medium'
): string | undefined => {
  if (!thumbnailUrl) return undefined;
  
  const sizes = {
    small: 150,   // For list items, avatars
    medium: 300, // For cards, previews
    large: 600,  // For detail views
  };
  
  return optimizeImageUrl(thumbnailUrl, sizes[size], sizes[size], {
    quality: size === 'small' ? 75 : 85,
    format: 'webp',
  });
};

/**
 * Get placeholder image URL (for lazy loading blur effect)
 */
export const getPlaceholderImage = (width: number, height?: number): string => {
  // Use a 1x1 transparent pixel or a blur placeholder
  // Option 1: Transparent pixel (minimal data)
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height || width}'%3E%3C/svg%3E`;
  
  // Option 2: Blur placeholder (better UX, slightly more data)
  // return optimizeImageUrl(originalUrl, 20, 20, { blur: true, quality: 20 });
};
