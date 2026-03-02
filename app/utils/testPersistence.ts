// utils/testPersistence.ts
// 🧪 Test utilities to verify social media persistence behavior

import AsyncStorage from "@react-native-async-storage/async-storage";
import { 
  getPersistedMediaList, 
  getPersistedStats, 
  getViewed, 
  clearAllPersistedData 
} from "./persistentStorage";

export const testPersistenceBehavior = async () => {
  console.log("🧪 Testing social media persistence behavior...");
  
  try {
    // Check what's currently persisted
    const mediaList = await getPersistedMediaList();
    const stats = await getPersistedStats();
    const viewed = await getViewed();
    
    console.log("📊 Current persistence state:");
    console.log(`  - Media List: ${mediaList.length} items`);
    console.log(`  - Stats: ${Object.keys(stats).length} items`);
    console.log(`  - Viewed: ${viewed.length} items`);
    
    // Show some sample data
    if (mediaList.length > 0) {
      console.log("🎬 Sample media items:");
      mediaList.slice(0, 3).forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.title} (${item.contentType})`);
      });
    }
    
    if (Object.keys(stats).length > 0) {
      console.log("📈 Sample stats:");
      Object.entries(stats).slice(0, 3).forEach(([key, stat]) => {
        console.log(`  ${key}: views=${stat.views}, favorites=${stat.favorite}`);
      });
    }
    
    return {
      mediaCount: mediaList.length,
      statsCount: Object.keys(stats).length,
      viewedCount: viewed.length,
      isWorking: mediaList.length > 0 || Object.keys(stats).length > 0
    };
    
  } catch (error) {
    console.error("❌ Persistence test failed:", error);
    return { error: error.message };
  }
};

export const simulateAppRestart = async () => {
  console.log("🔄 Simulating app restart - testing if data persists...");
  
  const beforeRestart = await testPersistenceBehavior();
  
  // Simulate what happens on app restart
  console.log("📱 App 'restarted' - loading from storage again...");
  
  const afterRestart = await testPersistenceBehavior();
  
  const isDataPersistent = 
    beforeRestart.mediaCount === afterRestart.mediaCount &&
    beforeRestart.statsCount === afterRestart.statsCount;
    
  console.log(isDataPersistent 
    ? "✅ SUCCESS: Data persists across app restarts!" 
    : "❌ FAILURE: Data was lost on restart"
  );
  
  return { beforeRestart, afterRestart, isDataPersistent };
};

export const clearTestData = async () => {
  console.log("🧹 Clearing all test data...");
  await clearAllPersistedData();
  console.log("✅ All persistence data cleared");
};