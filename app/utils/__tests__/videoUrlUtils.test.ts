/**
 * Tests for videoUrlUtils
 * Note: These are basic unit tests for the utility functions
 */

import {
  createSafeVideoSource,
  extractContentIdFromUrl,
  getSafeVideoUrl,
  isCloudflareR2Url,
  validateVideoUrl,
} from "../videoUrlUtils";

// Mock fetch for testing
global.fetch = jest.fn();

describe("videoUrlUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validateVideoUrl", () => {
    it("should return invalid for empty URL", async () => {
      const result = await validateVideoUrl("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Empty or invalid URL");
    });

    it("should return invalid for non-HTTP URL", async () => {
      const result = await validateVideoUrl("invalid-url");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid URL format");
    });

    it("should return valid for accessible URL", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await validateVideoUrl("https://example.com/video.mp4");
      expect(result.isValid).toBe(true);
      expect(result.needsRefresh).toBe(false);
    });

    it("should return invalid for 404 URL", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const result = await validateVideoUrl("https://example.com/missing.mp4");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Video not found (404)");
      expect(result.needsRefresh).toBe(true);
    });
  });

  describe("getSafeVideoUrl", () => {
    it("should return fallback for empty URL", async () => {
      const result = await getSafeVideoUrl("");
      expect(result).toBe(
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      );
    });

    it("should return original URL if valid", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const originalUrl = "https://example.com/video.mp4";
      const result = await getSafeVideoUrl(originalUrl);
      expect(result).toBe(originalUrl);
    });

    it("should return fallback for invalid URL", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await getSafeVideoUrl("https://example.com/missing.mp4");
      expect(result).toBe(
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      );
    });
  });

  describe("createSafeVideoSource", () => {
    it("should return fallback source for empty URI", async () => {
      const result = await createSafeVideoSource("");
      expect(result.uri).toBe(
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      );
    });

    it("should return custom fallback if provided", async () => {
      const customFallback = "https://custom-fallback.com/video.mp4";
      const result = await createSafeVideoSource("", undefined, customFallback);
      expect(result.uri).toBe(customFallback);
    });
  });

  describe("isCloudflareR2Url", () => {
    it("should return true for Cloudflare R2 URL", () => {
      const url =
        "https://870e0e55f75d0d9434531d7518f57e92.r2.cloudflarestorage.com/jevah/jevah/media-videos/video.mp4";
      expect(isCloudflareR2Url(url)).toBe(true);
    });

    it("should return false for non-Cloudflare URL", () => {
      const url = "https://example.com/video.mp4";
      expect(isCloudflareR2Url(url)).toBe(false);
    });
  });

  describe("extractContentIdFromUrl", () => {
    it("should extract content ID from URL", () => {
      const url = "https://example.com/videos/content123.mp4";
      const result = extractContentIdFromUrl(url);
      expect(result).toBe("content123");
    });

    it("should return null for URL without file extension", () => {
      const url = "https://example.com/videos/content";
      const result = extractContentIdFromUrl(url);
      expect(result).toBe(null);
    });
  });
});
