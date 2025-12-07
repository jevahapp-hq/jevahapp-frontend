# Backend Audio Playback Tracking Documentation

## Overview

This document outlines the optional backend implementation for tracking audio playback in the Jevah App. The frontend audio player works independently, but backend tracking enables analytics, recommendations, and user engagement features.

## Purpose

- **Analytics**: Track which songs users listen to most
- **Recommendations**: Suggest songs based on listening history
- **Engagement Metrics**: Measure user engagement with audio content
- **Playback History**: Allow users to see their listening history
- **Resume Playback**: Resume from where user left off (optional)

## API Endpoints

### 1. Track Playback Start

**Endpoint**: `POST /api/audio/playback/start`

**Description**: Record when a user starts playing an audio track.

**Request Body**:
```json
{
  "trackId": "song-in-the-name-of-jesus",
  "trackType": "copyright-free-music", // or "music", "audio", "sermon"
  "userId": "user_123", // Optional if using auth token
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "playbackId": "playback_abc123",
  "message": "Playback tracking started"
}
```

### 2. Track Playback Progress

**Endpoint**: `POST /api/audio/playback/progress`

**Description**: Update playback position periodically (every 10-30 seconds).

**Request Body**:
```json
{
  "playbackId": "playback_abc123",
  "position": 45000, // Position in milliseconds
  "duration": 180000, // Total duration in milliseconds
  "progress": 0.25, // 0-1 ratio
  "timestamp": "2024-01-15T10:30:45Z"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Progress updated"
}
```

### 3. Track Playback Complete

**Endpoint**: `POST /api/audio/playback/complete`

**Description**: Record when a track finishes playing.

**Request Body**:
```json
{
  "playbackId": "playback_abc123",
  "completed": true,
  "totalPlayTime": 180000, // Total time played in milliseconds
  "timestamp": "2024-01-15T10:33:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Playback completed"
}
```

### 4. Track Playback Pause/Resume

**Endpoint**: `POST /api/audio/playback/pause` or `POST /api/audio/playback/resume`

**Request Body**:
```json
{
  "playbackId": "playback_abc123",
  "position": 45000,
  "timestamp": "2024-01-15T10:31:00Z"
}
```

### 5. Get User Playback History

**Endpoint**: `GET /api/audio/playback/history`

**Query Parameters**:
- `limit`: Number of records to return (default: 50)
- `offset`: Pagination offset (default: 0)
- `trackType`: Filter by track type (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "playbacks": [
      {
        "id": "playback_abc123",
        "trackId": "song-in-the-name-of-jesus",
        "trackTitle": "In The Name of Jesus",
        "trackArtist": "Tadashikeiji",
        "startedAt": "2024-01-15T10:30:00Z",
        "completedAt": "2024-01-15T10:33:00Z",
        "totalPlayTime": 180000,
        "completed": true
      }
    ],
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

### 6. Get Most Played Tracks

**Endpoint**: `GET /api/audio/analytics/most-played`

**Query Parameters**:
- `limit`: Number of tracks to return (default: 20)
- `timeframe`: "day", "week", "month", "all" (default: "all")

**Response**:
```json
{
  "success": true,
  "data": {
    "tracks": [
      {
        "trackId": "song-in-the-name-of-jesus",
        "trackTitle": "In The Name of Jesus",
        "playCount": 1250,
        "totalPlayTime": 225000000 // Total milliseconds
      }
    ]
  }
}
```

## Database Schema

### `audio_playbacks` Table

```sql
CREATE TABLE audio_playbacks (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  track_id VARCHAR(255) NOT NULL,
  track_type VARCHAR(50) NOT NULL,
  playback_id VARCHAR(255) UNIQUE NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  last_position INTEGER, -- Position in milliseconds
  total_duration INTEGER, -- Duration in milliseconds
  total_play_time INTEGER, -- Total time played in milliseconds
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_track_id (track_id),
  INDEX idx_started_at (started_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### `audio_playback_progress` Table (Optional - for detailed tracking)

```sql
CREATE TABLE audio_playback_progress (
  id VARCHAR(255) PRIMARY KEY,
  playback_id VARCHAR(255) NOT NULL,
  position INTEGER NOT NULL, -- Position in milliseconds
  progress DECIMAL(5,4) NOT NULL, -- 0-1 ratio
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_playback_id (playback_id),
  FOREIGN KEY (playback_id) REFERENCES audio_playbacks(playback_id) ON DELETE CASCADE
);
```

## Implementation Notes

### 1. Authentication
- All endpoints require authentication (Bearer token)
- User ID can be extracted from the token

### 2. Rate Limiting
- Progress updates should be rate-limited (e.g., max 1 update per 10 seconds)
- Use debouncing on the frontend to avoid excessive API calls

### 3. Error Handling
- All endpoints should return consistent error responses
- Frontend should handle errors gracefully (don't interrupt playback)

### 4. Privacy
- Consider GDPR/privacy requirements
- Allow users to opt-out of tracking
- Provide option to delete playback history

### 5. Performance
- Use batch inserts for progress updates if using detailed tracking
- Consider using a time-series database for analytics
- Implement caching for frequently accessed data

## Frontend Integration

The frontend will call these endpoints asynchronously (non-blocking):

```typescript
// Example integration in useGlobalAudioPlayerStore
const trackPlaybackStart = async (track: AudioTrack) => {
  try {
    await fetch(`${API_BASE_URL}/api/audio/playback/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trackId: track.id,
        trackType: 'copyright-free-music',
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    // Don't interrupt playback if tracking fails
    console.warn('Failed to track playback start:', error);
  }
};
```

## Optional Features

### 1. Resume Playback
Store the last position and allow users to resume:
- `GET /api/audio/playback/last-position/:trackId` - Get last playback position
- Frontend can seek to this position on track load

### 2. Playback Recommendations
Based on listening history:
- `GET /api/audio/recommendations` - Get recommended tracks

### 3. Playlists from History
- Auto-generate playlists based on frequently played tracks
- "Recently Played" playlist

## Testing

1. Test with multiple concurrent playbacks
2. Test with network interruptions
3. Test with invalid/missing data
4. Test rate limiting
5. Test authentication/authorization

## Notes

- **This is optional**: The frontend audio player works without backend tracking
- **Non-blocking**: All tracking calls should be async and not block playback
- **Graceful degradation**: If backend is unavailable, playback should continue
- **Privacy-first**: Respect user privacy preferences






