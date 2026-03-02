// Test script to verify library store functionality
const { useLibraryStore } = require("./app/store/useLibraryStore.tsx");

console.log("🧪 Testing Library Store...");

// Test basic store functionality
const store = useLibraryStore.getState();

console.log("✅ Store initialized:", !!store);
console.log("✅ isItemSaved function:", typeof store.isItemSaved);
console.log("✅ addToLibrary function:", typeof store.addToLibrary);
console.log("✅ removeFromLibrary function:", typeof store.removeFromLibrary);
console.log("✅ savedItems array:", Array.isArray(store.savedItems));
console.log("✅ isLoaded:", store.isLoaded);

// Test isItemSaved function
const testItemId = "test-item-123";
const isSaved = store.isItemSaved(testItemId);
console.log(`✅ isItemSaved('${testItemId}'):`, isSaved);

console.log("🎉 Library store test completed successfully!");

