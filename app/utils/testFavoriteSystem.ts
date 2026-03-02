// Test script for the new favorite system
import AsyncStorage from "@react-native-async-storage/async-storage";
import { 
  toggleFavorite, 
  getFavoriteState, 
  persistUserFavorites, 
  getUserFavorites,
  persistGlobalFavoriteCounts,
  getGlobalFavoriteCounts,
  clearAllPersistedData 
} from "./persistentStorage";

// Simulate different users
const testUsers = [
  { _id: "user1", email: "user1@test.com" },
  { _id: "user2", email: "user2@test.com" },
  { _id: "user3", email: "user3@test.com" }
];

const testContent = [
  "video-content1",
  "video-content2", 
  "video-content3"
];

export const testFavoriteSystem = async () => {
  console.log("🧪 Starting favorite system test...");
  
  try {
    // Clear all data first
    await clearAllPersistedData();
    console.log("✅ Cleared all data");
    
    // Test 1: Initial state should be empty
    console.log("\n🧪 Test 1: Initial empty state");
    const initialState = await getFavoriteState(testContent[0]);
    console.log("Initial state:", initialState);
    console.assert(initialState.isUserFavorite === false, "Initial user favorite should be false");
    console.assert(initialState.globalCount === 0, "Initial global count should be 0");
    
    // Test 2: User 1 favorites video 1
    console.log("\n🧪 Test 2: User 1 favorites content");
    await AsyncStorage.setItem("user", JSON.stringify(testUsers[0]));
    const result1 = await toggleFavorite(testContent[0]);
    console.log("User 1 toggle result:", result1);
    console.assert(result1.isUserFavorite === true, "User 1 should have favorited");
    console.assert(result1.globalCount === 1, "Global count should be 1");
    
    // Test 3: User 2 sees the global count but not the red heart
    console.log("\n🧪 Test 3: User 2 sees global count, not red heart");
    await AsyncStorage.setItem("user", JSON.stringify(testUsers[1]));
    const stateForUser2 = await getFavoriteState(testContent[0]);
    console.log("State for User 2:", stateForUser2);
    console.assert(stateForUser2.isUserFavorite === false, "User 2 should not see red heart");
    console.assert(stateForUser2.globalCount === 1, "User 2 should see global count of 1");
    
    // Test 4: User 2 also favorites the same content
    console.log("\n🧪 Test 4: User 2 also favorites");
    const result2 = await toggleFavorite(testContent[0]);
    console.log("User 2 toggle result:", result2);
    console.assert(result2.isUserFavorite === true, "User 2 should have favorited");
    console.assert(result2.globalCount === 2, "Global count should be 2");
    
    // Test 5: User 1 still sees their favorite and updated global count
    console.log("\n🧪 Test 5: User 1 sees updated global count");
    await AsyncStorage.setItem("user", JSON.stringify(testUsers[0]));
    const stateForUser1Again = await getFavoriteState(testContent[0]);
    console.log("State for User 1 again:", stateForUser1Again);
    console.assert(stateForUser1Again.isUserFavorite === true, "User 1 should still see red heart");
    console.assert(stateForUser1Again.globalCount === 2, "User 1 should see global count of 2");
    
    // Test 6: User 3 has not favorited anything
    console.log("\n🧪 Test 6: User 3 fresh state");
    await AsyncStorage.setItem("user", JSON.stringify(testUsers[2]));
    const stateForUser3 = await getFavoriteState(testContent[0]);
    console.log("State for User 3:", stateForUser3);
    console.assert(stateForUser3.isUserFavorite === false, "User 3 should not see red heart");
    console.assert(stateForUser3.globalCount === 2, "User 3 should see global count of 2");
    
    // Test 7: User 1 unfavorites
    console.log("\n🧪 Test 7: User 1 unfavorites");
    await AsyncStorage.setItem("user", JSON.stringify(testUsers[0]));
    const unfavoriteResult = await toggleFavorite(testContent[0]);
    console.log("User 1 unfavorite result:", unfavoriteResult);
    console.assert(unfavoriteResult.isUserFavorite === false, "User 1 should have unfavorited");
    console.assert(unfavoriteResult.globalCount === 1, "Global count should be 1");
    
    // Test 8: User 2 still sees their favorite
    console.log("\n🧪 Test 8: User 2 still favorited");
    await AsyncStorage.setItem("user", JSON.stringify(testUsers[1]));
    const finalStateUser2 = await getFavoriteState(testContent[0]);
    console.log("Final state for User 2:", finalStateUser2);
    console.assert(finalStateUser2.isUserFavorite === true, "User 2 should still see red heart");
    console.assert(finalStateUser2.globalCount === 1, "User 2 should see global count of 1");
    
    console.log("\n✅ All favorite system tests passed!");
    
    // Show final storage state for debugging
    console.log("\n📊 Final storage state:");
    const globalCounts = await getGlobalFavoriteCounts();
    console.log("Global counts:", globalCounts);
    
    for (const user of testUsers) {
      const userFavs = await getUserFavorites(user._id);
      console.log(`User ${user._id} favorites:`, userFavs);
    }
    
  } catch (error) {
    console.error("❌ Favorite system test failed:", error);
  }
};

// Test the storage functions individually
export const testStorageFunctions = async () => {
  console.log("🧪 Testing storage functions...");
  
  // Test user favorites
  const testUserFavorites = { "video1": true, "video2": false, "video3": true };
  await persistUserFavorites("testUser", testUserFavorites);
  const retrievedUserFavs = await getUserFavorites("testUser");
  console.log("User favorites test:", { stored: testUserFavorites, retrieved: retrievedUserFavs });
  
  // Test global counts
  const testGlobalCounts = { "video1": 5, "video2": 3, "video3": 8 };
  await persistGlobalFavoriteCounts(testGlobalCounts);
  const retrievedGlobalCounts = await getGlobalFavoriteCounts();
  console.log("Global counts test:", { stored: testGlobalCounts, retrieved: retrievedGlobalCounts });
  
  console.log("✅ Storage functions test completed");
};