import { mmkvGetJson, mmkvSetJson } from "../../src/shared/cache/mmkvStorage";
import {
  isReadingVoiceId,
  READING_VOICE_STORAGE_KEY,
  type ReadingVoiceId,
} from "./readingVoices";

export function readSavedReadingVoiceId(): ReadingVoiceId {
  const saved = mmkvGetJson<unknown>(READING_VOICE_STORAGE_KEY);
  return isReadingVoiceId(saved) ? saved : "maple";
}

export function saveReadingVoiceId(id: ReadingVoiceId): void {
  mmkvSetJson(READING_VOICE_STORAGE_KEY, id);
}
