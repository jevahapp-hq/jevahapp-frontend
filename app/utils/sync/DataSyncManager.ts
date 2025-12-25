import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiClient } from "../api/ApiClient";

// Data synchronization utilities
export class DataSyncManager {
  private static instance: DataSyncManager;
  private syncQueue: Array<() => Promise<void>> = [];
  private isSyncing = false;

  static getInstance(): DataSyncManager {
    if (!DataSyncManager.instance) {
      DataSyncManager.instance = new DataSyncManager();
    }
    return DataSyncManager.instance;
  }

  async queueSync(syncFunction: () => Promise<void>): Promise<void> {
    this.syncQueue.push(syncFunction);
    await this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) return;

    this.isSyncing = true;

    try {
      while (this.syncQueue.length > 0) {
        const syncFunction = this.syncQueue.shift();
        if (syncFunction) {
          await syncFunction();
        }
      }
    } catch (error) {
      console.error("Data sync error:", error);
    } finally {
      this.isSyncing = false;
    }
  }

  async syncUserData(): Promise<void> {
    await this.queueSync(async () => {
      const apiClient = new ApiClient();
      const userData = await apiClient.getUserProfile();
      await AsyncStorage.setItem("user", JSON.stringify(userData.user));
    });
  }

  async syncMediaData(): Promise<void> {
    await this.queueSync(async () => {
      const apiClient = new ApiClient();
      const mediaData = await apiClient.getMediaList();
      await AsyncStorage.setItem("mediaList", JSON.stringify(mediaData.media));
    });
  }
}

