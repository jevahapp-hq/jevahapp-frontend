import { apiClient } from "../ApiClient";
import { Result, unwrap } from "./envelope";

/**
 * Start a playback session for a media item.
 * Backend will automatically pause any existing active session for this user.
 */
export async function startPlaybackSession(
  mediaId: string,
  payload: {
    duration: number; // total duration in seconds
    position?: number; // optional resume position in seconds
    deviceInfo?: string;
  }
): Promise<Result> {
  return unwrap(
    await apiClient.post<any>(`/api/media/${mediaId}/playback/start`, payload),
    "Failed to start playback session"
  );
}

/**
 * Update playback progress for an active session.
 * Should be called every 5–10 seconds while playing.
 */
export async function updatePlaybackProgress(payload: {
  sessionId: string;
  position: number; // seconds
  duration: number; // seconds
  progressPercentage: number; // 0–100
}): Promise<Result> {
  return unwrap(
    await apiClient.post<any>(`/api/media/playback/progress`, payload),
    "Failed to update playback progress"
  );
}

export async function pausePlayback(sessionId: string): Promise<Result> {
  return unwrap(
    await apiClient.post<any>(`/api/media/playback/pause`, { sessionId }),
    "Failed to pause playback"
  );
}

export async function resumePlayback(sessionId: string): Promise<Result> {
  return unwrap(
    await apiClient.post<any>(`/api/media/playback/resume`, { sessionId }),
    "Failed to resume playback"
  );
}

/** End a playback session when the user stops or the media finishes. */
export async function endPlaybackSession(payload: {
  sessionId: string;
  reason: "completed" | "stopped" | "error";
  finalPosition?: number; // seconds
}): Promise<Result> {
  return unwrap(
    await apiClient.post<any>(`/api/media/playback/end`, payload),
    "Failed to end playback session"
  );
}

export async function getActivePlaybackSession(): Promise<Result> {
  return unwrap(
    await apiClient.get<any>(`/api/media/playback/active`),
    "Failed to get active playback session"
  );
}
