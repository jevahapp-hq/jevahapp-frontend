#!/usr/bin/env node

/**
 * Demo script to test video URL utilities
 * Run with: node scripts/test-video-urls.js
 */

// Mock the React Native environment for testing
global.fetch = require("node-fetch");

// Import our utilities (we'll need to transpile or use a different approach for Node.js)
console.log("🎬 Video URL Utilities Demo");
console.log("==========================");

// Test URLs
const testUrls = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", // Valid
  "https://870e0e55f75d0d9434531d7518f57e92.r2.cloudflarestorage.com/jevah/jevah/media-videos/missing.mp4", // 404
  "", // Empty
  "invalid-url", // Invalid format
  "https://httpstat.us/500", // Server error
];

console.log("\n📋 Test URLs:");
testUrls.forEach((url, index) => {
  console.log(`${index + 1}. ${url || "(empty)"}`);
});

console.log("\n🔍 Testing URL validation...");

// Simple validation function for demo
async function validateUrl(url) {
  if (!url || typeof url !== "string" || !url.trim()) {
    return { isValid: false, error: "Empty or invalid URL" };
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return { isValid: false, error: "Invalid URL format" };
  }

  try {
    const response = await fetch(url, { method: "HEAD", timeout: 5000 });
    return {
      isValid: response.ok,
      status: response.status,
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return { isValid: false, error: error.message };
  }
}

// Test each URL
async function runTests() {
  for (let i = 0; i < testUrls.length; i++) {
    const url = testUrls[i];
    console.log(`\n${i + 1}. Testing: ${url || "(empty)"}`);

    const result = await validateUrl(url);

    if (result.isValid) {
      console.log("   ✅ Valid - Video should load successfully");
    } else {
      console.log(`   ❌ Invalid - ${result.error}`);
      console.log("   🔄 Would attempt URL refresh or use fallback");
    }
  }

  console.log("\n🎯 Summary:");
  console.log("- Valid URLs will load normally");
  console.log("- Invalid URLs will trigger retry mechanism");
  console.log("- Failed URLs will show user-friendly error UI");
  console.log("- All videos will have a working fallback");
}

runTests().catch(console.error);
