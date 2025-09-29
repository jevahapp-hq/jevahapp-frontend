/**
 * Test Script for Comment Modal System
 * Run this to verify the comment system is working
 */

// Test the CommentService directly
const testCommentService = async () => {
  console.log("🧪 Testing Comment Service...");

  try {
    // Import the CommentService (you'll need to run this in your app context)
    const CommentService = require("./app/services/commentService.ts").default;
    const commentService = CommentService.getInstance();

    const testContentId = "test-content-123";

    // Test 1: Get Comments
    console.log("📝 Test 1: Getting comments...");
    const comments = await commentService.getComments(testContentId);
    console.log("✅ Comments loaded:", comments.length);

    // Test 2: Post Comment
    console.log("📝 Test 2: Posting comment...");
    const newComment = await commentService.postComment(testContentId, {
      text: "Test comment from automated test",
      userId: "test-user-123",
      userName: "Test User",
      userAvatar: "",
    });

    if (newComment) {
      console.log("✅ Comment posted successfully:", newComment.id);
    } else {
      console.log("❌ Failed to post comment");
    }

    // Test 3: Get Comments Again
    console.log("📝 Test 3: Getting comments after posting...");
    const updatedComments = await commentService.getComments(testContentId);
    console.log("✅ Updated comments count:", updatedComments.length);

    console.log("🎉 All tests completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
};

// Test the API endpoints directly
const testAPIEndpoints = async () => {
  console.log("🌐 Testing API Endpoints...");

  const baseURL = "https://your-backend-url.com"; // Replace with your actual backend URL

  try {
    // Test 1: Get Comments
    console.log("📝 Testing GET /api/content/media/{contentId}/comments");
    const response = await fetch(
      `${baseURL}/api/content/media/test-content-123/comments`
    );
    console.log("Status:", response.status);

    if (response.ok) {
      const data = await response.json();
      console.log("✅ API Response:", data);
    } else {
      console.log("❌ API Error:", await response.text());
    }
  } catch (error) {
    console.error("❌ API Test failed:", error);
  }
};

// Export for use in your app
module.exports = {
  testCommentService,
  testAPIEndpoints,
};

// Run tests if this file is executed directly
if (require.main === module) {
  console.log("🚀 Running Comment System Tests...");
  testCommentService();
  testAPIEndpoints();
}
