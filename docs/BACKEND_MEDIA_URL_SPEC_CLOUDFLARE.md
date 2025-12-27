# Backend Media URL Specification - Cloudflare Integration
## Complete Guide for TikTok-Style Media App (Video, Music, Ebooks)

**Version:** 1.0  
**Last Updated:** 2024  
**Target Platform:** Cloudflare (R2, Stream, CDN)

---

## Table of Contents

1. [Overview](#overview)
2. [Cloudflare Services Architecture](#cloudflare-services-architecture)
3. [Media URL Structure & Requirements](#media-url-structure--requirements)
4. [Video Media Specifications](#video-media-specifications)
5. [Audio/Music Specifications](#audiomusic-specifications)
6. [Ebook/Document Specifications](#ebookdocument-specifications)
7. [Thumbnails & Previews](#thumbnails--previews)
8. [Signed URLs & Security](#signed-urls--security)
9. [API Response Structure](#api-response-structure)
10. [Caching & Performance](#caching--performance)
11. [Error Handling](#error-handling)
12. [Upload & Processing Workflow](#upload--processing-workflow)
13. [Best Practices](#best-practices)

---

## Overview

This document specifies how media URLs and media handling should be implemented in the backend for a TikTok-style media application supporting **videos**, **music**, and **ebooks**, using **Cloudflare** infrastructure.

### Key Requirements

- ✅ **Public URLs** (preferred) - No signed URLs for playback
- ✅ **Multiple URL formats** - Support for progressive download, HLS streaming, and CDN delivery
- ✅ **Cloudflare R2** - Object storage for all media files
- ✅ **Cloudflare Stream** - Video streaming service (optional, for advanced features)
- ✅ **Cloudflare CDN** - Global content delivery
- ✅ **Consistent URL structure** - Predictable, cacheable URLs
- ✅ **Fast delivery** - Optimized for mobile networks

---

## Cloudflare Services Architecture

### Recommended Stack

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend App                          │
└────────────────────┬──────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              Cloudflare CDN (Edge Cache)                 │
│  - Caches media at edge locations globally              │
│  - Reduces latency for users worldwide                  │
└────────────────────┬──────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │
        ▼                           ▼
┌──────────────────┐      ┌──────────────────┐
│  Cloudflare R2   │      │ Cloudflare Stream│
│  (Object Storage)│      │  (Video Streaming)│
│                  │      │                  │
│  - Videos (.mp4)  │      │  - HLS streams   │
│  - Audio (.mp3)   │      │  - Adaptive bitrate│
│  - Ebooks (.pdf) │      │  - Transcoding    │
│  - Thumbnails     │      │                  │
└──────────────────┘      └──────────────────┘
```

### Service Selection Guide

| Media Type | Primary Storage | Delivery Method | Notes |
|------------|----------------|-----------------|-------|
| **Short Videos** (< 60s) | R2 | Direct CDN | Use R2 + CDN for cost efficiency |
| **Long Videos** (> 60s) | Stream (optional) | HLS via Stream | Better for adaptive streaming |
| **Music/Audio** | R2 | Direct CDN | Progressive download |
| **Ebooks/PDFs** | R2 | Direct CDN | Direct download |
| **Thumbnails** | R2 | Direct CDN | Optimized images |

---

## Media URL Structure & Requirements

### URL Priority Order (Frontend Expects)

The frontend uses this priority order when selecting URLs:

1. **`fileUrl`** - Primary playback URL (MUST be provided)
2. **`playbackUrl`** - Alternative playback URL (fallback)
3. **`hlsUrl`** - HLS streaming URL (for long videos)
4. **`thumbnailUrl`** - Thumbnail/preview image (NEVER used for video playback)
5. **`imageUrl`** - Cover/artwork image (NEVER used for video playback)

### URL Format Requirements

#### ✅ **REQUIRED: Public URLs (Preferred)**

```javascript
// ✅ GOOD - Public R2 URL via CDN
"https://cdn.yourdomain.com/media/videos/abc123/video.mp4"
"https://r2.yourdomain.com/media/audio/xyz789/song.mp3"
"https://cdn.yourdomain.com/media/ebooks/book456/document.pdf"

// ✅ GOOD - Cloudflare Stream URL
"https://customer-{account_hash}.cloudflarestream.com/{video-id}/manifest/video.m3u8"
```

#### ❌ **AVOID: Signed URLs**

```javascript
// ❌ BAD - Signed URLs expire and cause playback failures
"https://bucket.s3.amazonaws.com/video.mp4?X-Amz-Algorithm=..."
"https://r2.yourdomain.com/file.mp4?X-Amz-Credential=..."
```

**Why avoid signed URLs?**
- They expire, causing playback failures
- Frontend has to handle expiration logic
- Poor caching behavior
- Slower playback startup

**If you MUST use signed URLs:**
- Minimum expiration: **24 hours** (preferably 7 days)
- Provide a refresh endpoint: `GET /api/media/:id/refresh-url`
- Include expiration timestamp in API response

### URL Structure Examples

#### Video URLs

```javascript
{
  "fileUrl": "https://cdn.yourdomain.com/media/videos/{contentId}/video.mp4",
  "playbackUrl": "https://cdn.yourdomain.com/media/videos/{contentId}/video_720p.mp4", // Optional: lower quality
  "hlsUrl": "https://stream.yourdomain.com/{contentId}/manifest.m3u8", // Optional: for long videos
  "thumbnailUrl": "https://cdn.yourdomain.com/media/thumbnails/{contentId}/thumb.jpg"
}
```

#### Audio URLs

```javascript
{
  "fileUrl": "https://cdn.yourdomain.com/media/audio/{contentId}/audio.mp3",
  "thumbnailUrl": "https://cdn.yourdomain.com/media/thumbnails/{contentId}/cover.jpg"
}
```

#### Ebook URLs

```javascript
{
  "fileUrl": "https://cdn.yourdomain.com/media/ebooks/{contentId}/book.pdf",
  "thumbnailUrl": "https://cdn.yourdomain.com/media/thumbnails/{contentId}/cover.jpg"
}
```

---

## Video Media Specifications

### Supported Formats

| Format | Extension | Use Case | Priority |
|--------|-----------|----------|----------|
| **MP4 (H.264)** | `.mp4` | Primary format | ⭐⭐⭐ Highest |
| **HLS** | `.m3u8` | Long videos, adaptive streaming | ⭐⭐ Medium |
| **WebM** | `.webm` | Alternative | ⭐ Low |

### Video Encoding Requirements

#### For R2 Storage (Direct Playback)

```yaml
Codec: H.264 (AVC)
Container: MP4
Resolution: 
  - 1080p (1920x1080) - Primary
  - 720p (1280x720) - Fallback (playbackUrl)
  - 480p (854x480) - Mobile fallback
Bitrate:
  - 1080p: 5-8 Mbps
  - 720p: 2.5-4 Mbps
  - 480p: 1-2 Mbps
Frame Rate: 30 fps (60 fps optional for high-quality content)
Audio: AAC, 128-192 kbps, 44.1kHz or 48kHz
```

#### For Cloudflare Stream (HLS)

```yaml
Format: HLS (.m3u8)
Adaptive Bitrate: Enabled
Quality Levels:
  - 1080p: 5-8 Mbps
  - 720p: 2.5-4 Mbps
  - 480p: 1-2 Mbps
  - 360p: 0.5-1 Mbps (mobile)
```

### Video URL Response Structure

```typescript
interface VideoMediaUrls {
  // PRIMARY - Always required
  fileUrl: string; // Direct MP4 URL for playback
  
  // OPTIONAL - Fallbacks
  playbackUrl?: string; // Lower quality version (720p)
  hlsUrl?: string; // HLS stream URL (for long videos)
  
  // METADATA - Never used for playback
  thumbnailUrl: string; // Video thumbnail
  imageUrl?: string; // Cover/artwork image
  
  // METADATA
  duration?: number; // Duration in seconds
  fileSize?: number; // File size in bytes
  width?: number; // Video width in pixels
  height?: number; // Video height in pixels
  bitrate?: number; // Bitrate in bps
}
```

### Example API Response

```json
{
  "_id": "video123",
  "title": "Sample Video",
  "contentType": "video",
  "fileUrl": "https://cdn.yourdomain.com/media/videos/video123/video.mp4",
  "playbackUrl": "https://cdn.yourdomain.com/media/videos/video123/video_720p.mp4",
  "hlsUrl": "https://stream.yourdomain.com/video123/manifest.m3u8",
  "thumbnailUrl": "https://cdn.yourdomain.com/media/thumbnails/video123/thumb.jpg",
  "duration": 120,
  "fileSize": 15728640,
  "width": 1920,
  "height": 1080,
  "bitrate": 5000000
}
```

---

## Audio/Music Specifications

### Supported Formats

| Format | Extension | Use Case | Priority |
|--------|-----------|----------|----------|
| **MP3** | `.mp3` | Primary format | ⭐⭐⭐ Highest |
| **AAC** | `.m4a` | iOS optimized | ⭐⭐ Medium |
| **OGG Vorbis** | `.ogg` | Alternative | ⭐ Low |

### Audio Encoding Requirements

```yaml
Codec: MP3 or AAC
Bitrate: 128-192 kbps (128 kbps minimum)
Sample Rate: 44.1 kHz or 48 kHz
Channels: Stereo (2 channels)
Container: MP3 or M4A
```

### Audio URL Response Structure

```typescript
interface AudioMediaUrls {
  // PRIMARY - Always required
  fileUrl: string; // Direct audio file URL
  
  // METADATA - Never used for playback
  thumbnailUrl: string; // Album/cover art
  imageUrl?: string; // High-res cover art
  
  // METADATA
  duration?: number; // Duration in seconds
  fileSize?: number; // File size in bytes
  bitrate?: number; // Bitrate in bps
}
```

### Example API Response

```json
{
  "_id": "audio456",
  "title": "Sample Song",
  "contentType": "music",
  "fileUrl": "https://cdn.yourdomain.com/media/audio/audio456/song.mp3",
  "thumbnailUrl": "https://cdn.yourdomain.com/media/thumbnails/audio456/cover.jpg",
  "imageUrl": "https://cdn.yourdomain.com/media/thumbnails/audio456/cover_hd.jpg",
  "duration": 240,
  "fileSize": 3840000,
  "bitrate": 128000
}
```

---

## Ebook/Document Specifications

### Supported Formats

| Format | Extension | Use Case | Priority |
|--------|-----------|----------|----------|
| **PDF** | `.pdf` | Primary format | ⭐⭐⭐ Highest |
| **EPUB** | `.epub` | E-reader format | ⭐⭐ Medium |
| **MOBI** | `.mobi` | Kindle format | ⭐ Low |

### Ebook Requirements

```yaml
Format: PDF (primary)
Max File Size: 50 MB per book
Page Count: Include in metadata
Language: Include in metadata
```

### Ebook URL Response Structure

```typescript
interface EbookMediaUrls {
  // PRIMARY - Always required
  fileUrl: string; // Direct PDF/EPUB file URL
  
  // METADATA - Never used for playback
  thumbnailUrl: string; // Book cover thumbnail
  imageUrl?: string; // High-res book cover
  
  // METADATA
  fileSize?: number; // File size in bytes
  pageCount?: number; // Number of pages
  language?: string; // Language code (e.g., "en", "es")
}
```

### Example API Response

```json
{
  "_id": "ebook789",
  "title": "Sample Book",
  "contentType": "e-books",
  "fileUrl": "https://cdn.yourdomain.com/media/ebooks/ebook789/book.pdf",
  "thumbnailUrl": "https://cdn.yourdomain.com/media/thumbnails/ebook789/cover.jpg",
  "imageUrl": "https://cdn.yourdomain.com/media/thumbnails/ebook789/cover_hd.jpg",
  "fileSize": 5242880,
  "pageCount": 250,
  "language": "en"
}
```

---

## Thumbnails & Previews

### Thumbnail Requirements

```yaml
Format: JPEG or WebP
Dimensions:
  - Thumbnail: 320x320px (square) or 320x180px (16:9)
  - Cover Art: 800x800px (square) or 1280x720px (16:9)
Quality: 80-85% JPEG quality
Max File Size: 200 KB per thumbnail
```

### Thumbnail URL Structure

```javascript
// Thumbnails should be separate from media files
"https://cdn.yourdomain.com/media/thumbnails/{contentId}/thumb.jpg"
"https://cdn.yourdomain.com/media/thumbnails/{contentId}/cover.jpg"
```

### Important: Never Use Thumbnails for Video Playback

```javascript
// ❌ WRONG - Frontend will reject this
{
  "fileUrl": "https://cdn.yourdomain.com/thumbnails/video.jpg" // This is an image!
}

// ✅ CORRECT
{
  "fileUrl": "https://cdn.yourdomain.com/media/videos/video123/video.mp4",
  "thumbnailUrl": "https://cdn.yourdomain.com/media/thumbnails/video123/thumb.jpg"
}
```

---

## Signed URLs & Security

### ⚠️ **Avoid Signed URLs When Possible**

**Problems with Signed URLs:**
- Expire and cause playback failures
- Poor caching behavior
- Require refresh logic in frontend
- Slower initial playback

### ✅ **Recommended: Public URLs with Access Control**

Instead of signed URLs, use:

1. **Public URLs** with Cloudflare Access Rules
2. **Token-based authentication** in API requests
3. **CDN-level access control** via Cloudflare Workers

### If Signed URLs Are Required

If you MUST use signed URLs (e.g., for private content):

```yaml
Minimum Expiration: 24 hours (preferably 7 days)
Refresh Endpoint: GET /api/media/:id/refresh-url
Include in Response:
  - expiresAt: ISO 8601 timestamp
  - refreshUrl: URL to refresh the signed URL
```

#### Example with Signed URLs

```json
{
  "_id": "video123",
  "fileUrl": "https://r2.yourdomain.com/video.mp4?X-Amz-Algorithm=...",
  "expiresAt": "2024-12-31T23:59:59Z",
  "refreshUrl": "/api/media/video123/refresh-url"
}
```

---

## API Response Structure

### Standard Media Response

```typescript
interface MediaItem {
  // IDENTIFICATION
  _id: string;
  id?: string; // Alias for _id
  
  // CONTENT INFO
  title: string;
  description?: string;
  contentType: "video" | "music" | "e-books" | "sermon" | "hymns";
  
  // MEDIA URLS (Priority: fileUrl > playbackUrl > hlsUrl)
  fileUrl: string; // PRIMARY - Always required
  playbackUrl?: string; // OPTIONAL - Fallback quality
  hlsUrl?: string; // OPTIONAL - HLS stream
  
  // THUMBNAILS (Never used for playback)
  thumbnailUrl: string; // Required
  imageUrl?: string; // Optional - High-res cover
  
  // METADATA
  duration?: number; // Duration in seconds
  fileSize?: number; // File size in bytes
  width?: number; // Video width (videos only)
  height?: number; // Video height (videos only)
  bitrate?: number; // Bitrate in bps
  
  // USER INFO
  uploadedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  
  // TIMESTAMPS
  createdAt: string; // ISO 8601
  updatedAt?: string; // ISO 8601
}
```

### Example Complete Response

```json
{
  "_id": "video123",
  "title": "Sample Video Title",
  "description": "Video description here",
  "contentType": "video",
  
  "fileUrl": "https://cdn.yourdomain.com/media/videos/video123/video.mp4",
  "playbackUrl": "https://cdn.yourdomain.com/media/videos/video123/video_720p.mp4",
  "hlsUrl": "https://stream.yourdomain.com/video123/manifest.m3u8",
  "thumbnailUrl": "https://cdn.yourdomain.com/media/thumbnails/video123/thumb.jpg",
  "imageUrl": "https://cdn.yourdomain.com/media/thumbnails/video123/cover_hd.jpg",
  
  "duration": 120,
  "fileSize": 15728640,
  "width": 1920,
  "height": 1080,
  "bitrate": 5000000,
  
  "uploadedBy": {
    "_id": "user456",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://cdn.yourdomain.com/avatars/user456/avatar.jpg"
  },
  
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

---

## Caching & Performance

### Cloudflare CDN Caching

```yaml
Cache-Control Headers:
  - Videos: "public, max-age=31536000, immutable" (1 year)
  - Audio: "public, max-age=31536000, immutable" (1 year)
  - Ebooks: "public, max-age=31536000, immutable" (1 year)
  - Thumbnails: "public, max-age=2592000, immutable" (30 days)

Edge Cache:
  - Cache at edge locations globally
  - Reduce latency for users worldwide
  - Automatic cache invalidation on update
```

### URL Immutability

**Critical:** URLs should be **immutable** (never change) for the same content.

```javascript
// ✅ GOOD - Immutable URL
"https://cdn.yourdomain.com/media/videos/video123/video.mp4"

// ❌ BAD - URL changes on update
"https://cdn.yourdomain.com/media/videos/video123/video_v2.mp4"
```

**Why?**
- Better caching behavior
- No broken links
- Predictable URLs

**If content is updated:**
- Use **versioning in metadata**, not in URL
- Or use **content hash** in URL: `/media/videos/video123/{hash}/video.mp4`

### Cache Headers Example

```http
HTTP/1.1 200 OK
Content-Type: video/mp4
Cache-Control: public, max-age=31536000, immutable
ETag: "abc123def456"
Last-Modified: Mon, 15 Jan 2024 10:30:00 GMT
```

---

## Error Handling

### URL Validation

Backend should validate URLs before returning:

```typescript
// ✅ Valid URL checks
- URL is accessible (HEAD request succeeds)
- Content-Type matches media type
- File exists and is readable
- File size matches metadata
```

### Error Response Structure

```json
{
  "success": false,
  "error": "Media file not found",
  "errorCode": "MEDIA_NOT_FOUND",
  "mediaId": "video123",
  "suggestedAction": "refresh_url"
}
```

### Common Error Codes

| Error Code | Description | Suggested Action |
|------------|-------------|------------------|
| `MEDIA_NOT_FOUND` | File doesn't exist | Return 404, don't include fileUrl |
| `MEDIA_EXPIRED` | Signed URL expired | Return refreshUrl |
| `MEDIA_INACCESSIBLE` | File exists but can't be accessed | Check permissions |
| `INVALID_FORMAT` | File format not supported | Re-encode media |

---

## Upload & Processing Workflow

### Upload Flow

```
1. User uploads media file
   ↓
2. Backend stores in R2 (temporary location)
   ↓
3. Backend processes media:
   - Video: Transcode to MP4 (H.264)
   - Audio: Convert to MP3/AAC
   - Generate thumbnails
   ↓
4. Backend moves to final location:
   /media/{type}/{contentId}/{filename}
   ↓
5. Backend returns public URLs in API response
```

### Processing Requirements

#### Video Processing

```yaml
Transcode to:
  - Primary: 1080p MP4 (H.264)
  - Fallback: 720p MP4 (H.264) - optional
  - HLS: If video > 60 seconds - optional

Generate:
  - Thumbnail: Extract frame at 10% of duration
  - Cover: Extract frame at 50% of duration
```

#### Audio Processing

```yaml
Convert to:
  - Primary: MP3, 128-192 kbps
  - Fallback: AAC (M4A) - optional

Extract:
  - Album art: From metadata or generate
  - Duration: From file metadata
```

#### Ebook Processing

```yaml
Validate:
  - File is valid PDF/EPUB
  - File size < 50 MB
  - No malicious content

Generate:
  - Cover thumbnail: First page or cover image
  - Page count: Extract from metadata
```

---

## Best Practices

### ✅ DO

1. **Use Public URLs** - Avoid signed URLs when possible
2. **Provide Multiple Formats** - fileUrl, playbackUrl, hlsUrl
3. **Include Metadata** - duration, fileSize, dimensions
4. **Use Immutable URLs** - Never change URLs for same content
5. **Set Proper Cache Headers** - Enable CDN caching
6. **Validate URLs** - Ensure files exist before returning URLs
7. **Provide Fallbacks** - Lower quality versions for slow networks
8. **Include Thumbnails** - Always provide thumbnailUrl

### ❌ DON'T

1. **Don't Use Signed URLs** - Unless absolutely necessary
2. **Don't Use Thumbnails for Playback** - Never return thumbnailUrl as fileUrl
3. **Don't Change URLs** - URLs should be immutable
4. **Don't Skip Metadata** - Always include duration, fileSize
5. **Don't Use Expired URLs** - Validate before returning
6. **Don't Mix Content Types** - Keep video/audio/ebook URLs separate
7. **Don't Skip Validation** - Always validate files exist

### Performance Optimization

```yaml
CDN Configuration:
  - Enable Cloudflare CDN for all media
  - Set long cache times (1 year for immutable content)
  - Use edge caching globally

Compression:
  - Enable gzip/brotli for API responses
  - Optimize images (WebP for thumbnails)
  - Compress video/audio appropriately

Delivery:
  - Use HTTP/2 or HTTP/3
  - Enable HTTP/2 Server Push for critical resources
  - Use CDN for all static media
```

---

## Cloudflare R2 Configuration

### R2 Bucket Structure

```
r2-bucket/
├── media/
│   ├── videos/
│   │   └── {contentId}/
│   │       ├── video.mp4
│   │       └── video_720p.mp4 (optional)
│   ├── audio/
│   │   └── {contentId}/
│   │       └── audio.mp3
│   └── ebooks/
│       └── {contentId}/
│           └── book.pdf
└── thumbnails/
    └── {contentId}/
        ├── thumb.jpg
        └── cover.jpg
```

### R2 Public Access

```yaml
Public Access: Enabled for media files
CORS Configuration:
  - Allow-Origin: *
  - Allow-Methods: GET, HEAD
  - Allow-Headers: Range, Content-Type
  - Max-Age: 3600

Custom Domain:
  - cdn.yourdomain.com → R2 bucket
  - Enables CDN caching
  - Better performance
```

### R2 CDN Integration

```yaml
Custom Domain Setup:
  1. Create R2 bucket
  2. Enable public access
  3. Add custom domain: cdn.yourdomain.com
  4. Configure DNS (CNAME to R2)
  5. Enable Cloudflare CDN caching

Result:
  - Files accessible via: https://cdn.yourdomain.com/media/...
  - Automatic CDN caching
  - Global edge delivery
```

---

## Cloudflare Stream (Optional)

### When to Use Stream

- Videos longer than 60 seconds
- Need adaptive bitrate streaming
- Want automatic transcoding
- Need analytics and insights

### Stream Integration

```yaml
Upload Flow:
  1. Upload video to Stream
  2. Stream processes and transcodes
  3. Stream returns video ID
  4. Use Stream URLs in API response

URL Format:
  - HLS: https://customer-{hash}.cloudflarestream.com/{video-id}/manifest/video.m3u8
  - MP4: https://customer-{hash}.cloudflarestream.com/{video-id}/video.mp4

Response:
  {
    "fileUrl": "https://customer-{hash}.cloudflarestream.com/{video-id}/video.mp4",
    "hlsUrl": "https://customer-{hash}.cloudflarestream.com/{video-id}/manifest/video.m3u8"
  }
```

---

## Testing Checklist

### URL Validation

- [ ] All URLs are public (no signed URLs)
- [ ] URLs are accessible via HTTP GET
- [ ] Content-Type headers are correct
- [ ] File sizes match metadata
- [ ] Thumbnails are separate from media files

### Performance

- [ ] CDN caching is enabled
- [ ] Cache headers are set correctly
- [ ] URLs are immutable
- [ ] Multiple quality options available (for videos)

### Error Handling

- [ ] 404 errors handled gracefully
- [ ] Expired URLs return refresh endpoint
- [ ] Invalid formats return clear errors
- [ ] Network errors are retryable

---

## Summary

### Key Takeaways

1. **Use Public URLs** - Avoid signed URLs for better performance
2. **Multiple Formats** - Provide fileUrl, playbackUrl, hlsUrl
3. **Separate Thumbnails** - Never use thumbnails for playback
4. **Include Metadata** - Always include duration, fileSize
5. **Immutable URLs** - Never change URLs for same content
6. **CDN Caching** - Enable Cloudflare CDN for all media
7. **Validate URLs** - Ensure files exist before returning

### Priority Order (Frontend Expects)

```
fileUrl → playbackUrl → hlsUrl
```

### Required Fields

```typescript
{
  fileUrl: string;        // REQUIRED - Primary playback URL
  thumbnailUrl: string;   // REQUIRED - Thumbnail/preview
  contentType: string;    // REQUIRED - "video" | "music" | "e-books"
}
```

### Optional Fields

```typescript
{
  playbackUrl?: string;   // OPTIONAL - Lower quality fallback
  hlsUrl?: string;       // OPTIONAL - HLS stream
  imageUrl?: string;     // OPTIONAL - High-res cover
  duration?: number;     // OPTIONAL - Duration in seconds
  fileSize?: number;     // OPTIONAL - File size in bytes
}
```

---

**Questions or Issues?**

If you have questions about this specification or encounter issues, please:
1. Check the error handling section
2. Review the best practices
3. Contact the frontend team for clarification

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Maintained By:** Frontend Team


