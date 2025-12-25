// File Download Manager - Handles actual file downloads to app storage
// NOTE: We use the **legacy** expo-file-system API so existing methods like
// getInfoAsync/makeDirectoryAsync keep working on newer SDKs.
// Expo's warning suggests either migrating to the new File/Directory API
// or importing from "expo-file-system/legacy" – we choose the latter here
// to avoid breaking the current implementation.
import * as FileSystem from "expo-file-system/legacy";
import { downloadAPI } from "./downloadAPI";

export interface DownloadProgress {
  mediaId: string;
  progress: number; // 0-100
  bytesWritten: number;
  totalBytes: number;
}

export interface DownloadResult {
  success: boolean;
  localPath?: string;
  error?: string;
}

export type DownloadProgressCallback = (progress: DownloadProgress) => void;

class FileDownloadManager {
  private downloadDir: string;
  private activeDownloads: Map<string, FileSystem.DownloadResumable> = new Map();

  constructor() {
    // Use app-specific directory (not accessible via Files app or Gallery)
    this.downloadDir = `${FileSystem.documentDirectory}downloads/`;
    this.ensureDownloadDirectory();
  }

  /**
   * Ensure download directory exists
   */
  private async ensureDownloadDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.downloadDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.downloadDir, {
          intermediates: true,
        });
        console.log("✅ Created download directory:", this.downloadDir);
      }
    } catch (error) {
      console.error("❌ Error creating download directory:", error);
    }
  }

  /**
   * Get file extension from URL or contentType
   */
  private getFileExtension(
    url: string,
    contentType?: string
  ): string {
    // Try to get extension from URL
    const urlMatch = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
    if (urlMatch) {
      return urlMatch[1];
    }

    // Fallback to contentType
    if (contentType) {
      const typeMap: Record<string, string> = {
        "video/mp4": "mp4",
        "video/quicktime": "mov",
        "audio/mpeg": "mp3",
        "audio/mp3": "mp3",
        "audio/wav": "wav",
        "application/pdf": "pdf",
        "application/epub+zip": "epub",
      };
      return typeMap[contentType] || "bin";
    }

    return "bin";
  }

  /**
   * Generate local file path
   */
  private getLocalFilePath(
    mediaId: string,
    extension: string
  ): string {
    return `${this.downloadDir}${mediaId}.${extension}`;
  }

  /**
   * Download file from URL to app storage
   */
  async downloadFile(
    mediaId: string,
    downloadUrl: string,
    fileName?: string,
    contentType?: string,
    onProgress?: DownloadProgressCallback
  ): Promise<DownloadResult> {
    try {
      // Ensure download directory exists before starting
      await this.ensureDownloadDirectory();

      // Cancel existing download if any
      if (this.activeDownloads.has(mediaId)) {
        const existing = this.activeDownloads.get(mediaId);
        if (existing) {
          await existing.pauseAsync();
        }
        this.activeDownloads.delete(mediaId);
      }

      // Get file extension
      const extension = this.getFileExtension(downloadUrl, contentType);
      const localPath = this.getLocalFilePath(mediaId, extension);

      // Update backend: status = downloading
      await downloadAPI.updateDownloadStatus(mediaId, {
        downloadStatus: "downloading",
        downloadProgress: 0,
      });

      // Create download resumable
      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        localPath,
        {},
        (downloadProgress) => {
          const progress =
            downloadProgress.totalBytesExpectedToWrite > 0
              ? (downloadProgress.totalBytesWritten /
                  downloadProgress.totalBytesExpectedToWrite) *
                100
              : 0;

          // Call progress callback
          if (onProgress) {
            onProgress({
              mediaId,
              progress,
              bytesWritten: downloadProgress.totalBytesWritten,
              totalBytes: downloadProgress.totalBytesExpectedToWrite,
            });
          }

          // Update backend progress (throttle to every 10% or at completion)
          const progressFloor = Math.floor(progress);
          const lastUpdate = this.lastProgressUpdate.get(mediaId) || -1;
          
          // Update every 10% or at 100%
          if ((progressFloor % 10 === 0 && progressFloor !== lastUpdate) || progress === 100) {
            this.lastProgressUpdate.set(mediaId, progressFloor);
            
            // Non-blocking status update (don't await)
            downloadAPI.updateDownloadStatus(mediaId, {
              downloadProgress: progressFloor,
            }).catch((err) => {
              console.warn("Failed to update download progress (non-critical):", err);
            });
          }
        }
      );

      // Store active download
      this.activeDownloads.set(mediaId, downloadResumable);

      // Start download
      const result = await downloadResumable.downloadAsync();

      if (!result) {
        throw new Error("Download returned no result");
      }

      // Remove from active downloads and progress tracking
      this.activeDownloads.delete(mediaId);
      this.lastProgressUpdate.delete(mediaId);

      // Verify file exists
      const fileInfo = await FileSystem.getInfoAsync(result.uri);
      if (!fileInfo.exists) {
        throw new Error("Downloaded file does not exist");
      }

      // Update backend: status = completed
      await downloadAPI.updateDownloadStatus(mediaId, {
        localPath: result.uri,
        isDownloaded: true,
        downloadStatus: "completed",
        downloadProgress: 100,
      });

      console.log(`✅ File downloaded successfully: ${result.uri}`);

      return {
        success: true,
        localPath: result.uri,
      };
    } catch (error) {
      console.error(`❌ Download failed for ${mediaId}:`, error);

      // Remove from active downloads and progress tracking
      this.activeDownloads.delete(mediaId);
      this.lastProgressUpdate.delete(mediaId);

      // Update backend: status = failed
      await downloadAPI.updateDownloadStatus(mediaId, {
        downloadStatus: "failed",
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Cancel active download
   */
  async cancelDownload(mediaId: string): Promise<void> {
    try {
      const download = this.activeDownloads.get(mediaId);
      if (download) {
        await download.pauseAsync();
        this.activeDownloads.delete(mediaId);

        // Update backend
        await downloadAPI.updateDownloadStatus(mediaId, {
          downloadStatus: "failed",
        });
      }
    } catch (error) {
      console.error("Error canceling download:", error);
    }
  }

  /**
   * Check if file exists locally
   */
  async fileExists(localPath: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      return fileInfo.exists;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete local file
   */
  async deleteFile(localPath: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(localPath, { idempotent: true });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting file:", error);
      return false;
    }
  }

  /**
   * Get download directory path
   */
  getDownloadDirectory(): string {
    return this.downloadDir;
  }

  /**
   * Get file size
   */
  async getFileSize(localPath: string): Promise<number | null> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists && "size" in fileInfo) {
        return fileInfo.size;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

export const fileDownloadManager = new FileDownloadManager();
export default fileDownloadManager;

