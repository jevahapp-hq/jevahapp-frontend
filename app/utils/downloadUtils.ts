import { Alert } from "react-native";
import { useDownloadStore } from "../store/useDownloadStore";
import { downloadAPI } from "./downloadAPI";
import { DownloadProgressCallback, fileDownloadManager } from "./fileDownloadManager";

export interface DownloadableItem {
  id: string;
  title: string;
  description: string;
  author: string;
  contentType: 'video' | 'audio' | 'ebook' | 'live';
  fileUrl?: string;
  thumbnailUrl?: string;
  duration?: string;
  size?: string;
  fileSize?: number; // File size in bytes
}

export interface DownloadResult {
  success: boolean;
  message: string;
  localPath?: string;
}

export const useDownloadHandler = () => {
  const { addToDownloads, isItemDownloaded, updateDownloadItem } = useDownloadStore();

  /**
   * Handle download - Full flow:
   * 1. Call backend to initiate download (get downloadUrl)
   * 2. Download file to app storage
   * 3. Update backend with localPath and status
   * 4. Update local store
   */
  const handleDownload = async (
    item: DownloadableItem,
    onProgress?: DownloadProgressCallback
  ): Promise<DownloadResult> => {
    try {
      // Check if already downloaded
      const existing = isItemDownloaded(item.id);
      if (existing) {
        console.log(`📥 Item already downloaded: ${item.title}`);
        return { success: false, message: 'Already downloaded' };
      }

      console.log(`📥 Starting download for: ${item.title} (${item.id})`);
      console.log(`📥 Download item details:`, {
        id: item.id,
        contentType: item.contentType,
        fileSize: item.fileSize,
        fileUrl: item.fileUrl,
      });

      // Step 1: Initiate download with backend (get downloadUrl)
      console.log(`📥 Calling backend to initiate download...`);
      const initiateResult = await downloadAPI.initiateDownload(
        item.id,
        item.fileSize
      );
      console.log(`📥 Backend response:`, {
        success: initiateResult.success,
        hasDownloadUrl: !!initiateResult.downloadUrl,
        error: initiateResult.error,
      });

      if (!initiateResult.success || !initiateResult.downloadUrl) {
        const errorMsg = initiateResult.error || "Failed to get download URL";
        console.error("❌ Failed to initiate download:", errorMsg);
        
        // Handle specific backend error codes gracefully
        let friendlyMsg = errorMsg;
        let alertTitle = "Download Failed";
        
        if (errorMsg.includes("DOWNLOAD_NOT_ALLOWED") || errorMsg.includes("not available for download")) {
          friendlyMsg = "This content is not available for download";
          alertTitle = "Download Unavailable";
        } else if (errorMsg.includes("MEDIA_NOT_FOUND") || errorMsg.includes("Media not found")) {
          friendlyMsg = "Content not found";
          alertTitle = "Not Found";
        } else if (errorMsg.includes("UNAUTHORIZED") || errorMsg.includes("401") || errorMsg.includes("Authentication required")) {
          friendlyMsg = "Please log in to download content";
          alertTitle = "Authentication Required";
        } else if (errorMsg.includes("Invalid interaction type download")) {
          friendlyMsg = "This content cannot be downloaded at this time";
          alertTitle = "Download Unavailable";
        } else if (errorMsg.includes("INVALID_MEDIA_ID")) {
          friendlyMsg = "Invalid content ID";
          alertTitle = "Invalid Request";
        } else if (errorMsg.includes("Failed to record download") || errorMsg.includes("500") || errorMsg.includes("Internal Server Error")) {
          friendlyMsg = "Server error occurred. Please try again later or contact support if the issue persists.";
          alertTitle = "Server Error";
        } else if (errorMsg.includes("500")) {
          friendlyMsg = "A server error occurred. Please try again in a moment.";
          alertTitle = "Server Error";
        }
        
        Alert.alert(alertTitle, friendlyMsg);
        return { success: false, message: friendlyMsg };
      }

      console.log("✅ Got download URL from backend");

      // Step 2: Add to local store with "downloading" status
      await addToDownloads({
        id: item.id,
        title: item.title,
        description: item.description,
        author: item.author,
        contentType: item.contentType,
        fileUrl: initiateResult.downloadUrl, // Use backend-provided URL
        thumbnailUrl: item.thumbnailUrl,
        duration: item.duration,
        size: item.size || String(initiateResult.fileSize || 0),
      }, 'DOWNLOADING');

      // Step 2b: Update backend status to downloading (non-blocking)
      downloadAPI.updateDownloadStatus(item.id, {
        downloadStatus: "downloading",
        downloadProgress: 0,
      }).catch((err) => {
        console.warn("Failed to update initial download status (non-critical):", err);
      });

      // Step 3: Download actual file to app storage
      console.log(`📥 Starting file download to local storage...`);
      const downloadResult = await fileDownloadManager.downloadFile(
        item.id,
        initiateResult.downloadUrl,
        initiateResult.fileName,
        initiateResult.contentType,
        onProgress
      );
      console.log(`📥 File download result:`, {
        success: downloadResult.success,
        hasLocalPath: !!downloadResult.localPath,
        error: downloadResult.error,
      });

      if (!downloadResult.success || !downloadResult.localPath) {
        const errorMsg = downloadResult.error || "File download failed";
        console.error("❌ File download failed:", errorMsg);
        
        // Update status to failed (if item exists in store)
        const store = useDownloadStore.getState();
        if (store.downloadedItems.find(d => d.id === item.id)) {
          await updateDownloadItem(item.id, {
            status: 'FAILED',
          });
        }

        Alert.alert("Download Failed", errorMsg);
        return { success: false, message: errorMsg };
      }

      console.log(`✅ File downloaded successfully: ${downloadResult.localPath}`);

      // Step 4: Update local store with local path
      await updateDownloadItem(item.id, {
        status: 'DOWNLOADED',
        localPath: downloadResult.localPath,
      });

      return {
        success: true,
        message: 'Downloaded successfully',
        localPath: downloadResult.localPath,
      };
    } catch (error) {
      console.error('❌ Download failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Download failed';
      
      // Update status to failed (if item exists in store)
      const store = useDownloadStore.getState();
      if (store.downloadedItems.find(d => d.id === item.id)) {
        await updateDownloadItem(item.id, {
          status: 'FAILED',
        });
      }

      Alert.alert("Download Failed", errorMsg);
      return { success: false, message: errorMsg };
    }
  };

  /**
   * Cancel active download
   */
  const cancelDownload = async (itemId: string): Promise<void> => {
    try {
      await fileDownloadManager.cancelDownload(itemId);
      updateDownloadItem(itemId, {
        status: 'FAILED',
      });
    } catch (error) {
      console.error("Error canceling download:", error);
    }
  };

  /**
   * Check if item is downloaded (has local file)
   */
  const checkIfDownloaded = (itemId: string): boolean => {
    return isItemDownloaded(itemId);
  };

  /**
   * Get local file path for downloaded item
   */
  const getLocalPath = (itemId: string): string | undefined => {
    const store = useDownloadStore.getState();
    const item = store.downloadedItems.find((d) => d.id === itemId);
    return item?.localPath;
  };

  /**
   * Get download status from backend
   */
  const getDownloadStatus = async (itemId: string) => {
    try {
      const result = await downloadAPI.getDownloadStatus(itemId);
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.error("Error getting download status:", error);
      return null;
    }
  };

  /**
   * Delete downloaded file
   */
  const deleteDownload = async (itemId: string): Promise<boolean> => {
    try {
      const store = useDownloadStore.getState();
      const item = store.downloadedItems.find((d) => d.id === itemId);

      if (item?.localPath) {
        // Delete local file
        await fileDownloadManager.deleteFile(item.localPath);
      }

      // Remove from backend
      await downloadAPI.removeDownload(itemId);

      // Remove from local store
      await store.removeFromDownloads(itemId);

      return true;
    } catch (error) {
      console.error("Error deleting download:", error);
      return false;
    }
  };

  return {
    handleDownload,
    cancelDownload,
    checkIfDownloaded,
    getLocalPath,
    deleteDownload,
    getDownloadStatus,
  };
};

// Helper function to parse file size from various formats to bytes
const parseFileSizeToBytes = (size: any): number | undefined => {
  if (size === undefined || size === null) return undefined;
  
  // If it's already a number, return it (assuming it's in bytes)
  if (typeof size === 'number' && size > 0) {
    return size;
  }
  
  // If it's a string, try to parse it
  if (typeof size === 'string') {
    const trimmed = size.trim();
    
    // Check if it's a number string (bytes)
    const numericMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/);
    if (numericMatch) {
      const num = parseFloat(numericMatch[1]);
      return num > 0 ? num : undefined;
    }
    
    // Try to parse size strings like "10MB", "5.5GB", etc.
    const sizeMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB|TB|bytes?)?$/i);
    if (sizeMatch) {
      const num = parseFloat(sizeMatch[1]);
      const unit = (sizeMatch[2] || 'bytes').toLowerCase();
      
      const multipliers: { [key: string]: number } = {
        'byte': 1,
        'bytes': 1,
        'kb': 1024,
        'mb': 1024 * 1024,
        'gb': 1024 * 1024 * 1024,
        'tb': 1024 * 1024 * 1024 * 1024,
      };
      
      const multiplier = multipliers[unit] || 1;
      return num * multiplier;
    }
  }
  
  return undefined;
};

// Helper function to convert different content types to DownloadableItem
export const convertToDownloadableItem = (item: any, contentType: 'video' | 'audio' | 'ebook' | 'live'): DownloadableItem => {
  // Try to extract fileSize from various possible fields
  const fileSize = parseFileSizeToBytes(
    item.fileSize || item.file_size || item.size || item.fileSizeBytes
  );
  
  return {
    id: item._id || item.id || String(Math.random()),
    title: item.title || item.name || 'Untitled',
    description: item.description || item.summary || '',
    author: item.author || item.speaker || item.creator || 'Unknown',
    contentType,
    fileUrl: item.fileUrl || item.videoUrl || item.audioUrl || item.downloadUrl,
    thumbnailUrl: item.thumbnailUrl || item.imageUrl || item.coverImage,
    duration: item.duration || item.length,
    size: item.size || item.fileSize,
    fileSize, // Include parsed fileSize as number
  };
};
