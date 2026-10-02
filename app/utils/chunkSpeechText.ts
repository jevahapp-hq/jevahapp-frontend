/** Android TTS engines reject long utterances (often ~4000 chars). */
export const ANDROID_SPEECH_MAX_CHARS = 2800;

export type SpeechChunk = {
  text: string;
  startWord: number;
};

export function splitWords(text: string): string[] {
  return String(text || "")
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

/** A full stop gets a short breath so the next sentence does not run on. */
export const SENTENCE_BREATH_MS = 320;
/** Semicolons and colons get a smaller pause. */
export const CLAUSE_BREATH_MS = 140;

export function breathPauseMs(text: string): number {
  const trimmed = text.trim();
  if (/[.!?…]["')\]]*$/.test(trimmed)) return SENTENCE_BREATH_MS;
  if (/[;:]["')\]]*$/.test(trimmed)) return CLAUSE_BREATH_MS;
  return 0;
}

/**
 * At a verse or paragraph boundary, end the phrase so the voice can fall
 * and pause the way a person does. Does not add or remove words.
 */
export function markBreathAtBoundary(word: string, boundary: boolean): string {
  if (!boundary) return word;
  if (/[.!?…]["')\]]*$/.test(word)) return word;
  return `${word.replace(/[,;:]+$/, "")}.`;
}

/** Pack words into TTS-safe chunks without splitting mid-word. */
export function chunkWordsForSpeech(
  words: string[],
  maxChars: number = ANDROID_SPEECH_MAX_CHARS
): SpeechChunk[] {
  const chunks: SpeechChunk[] = [];
  let start = 0;
  let current: string[] = [];
  let len = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const add = (current.length ? 1 : 0) + word.length;
    if (current.length > 0 && len + add > maxChars) {
      chunks.push({ text: current.join(" "), startWord: start });
      start = i;
      current = [word];
      len = word.length;
    } else {
      current.push(word);
      len += add;
    }
  }

  if (current.length > 0) {
    chunks.push({ text: current.join(" "), startWord: start });
  }
  return chunks;
}

/**
 * Same as a length cap, but also ends a chunk at a sentence or clause so
 * the voice can finish the phrase instead of reading a whole chapter flat.
 */
export function chunkWordsForCalmReading(
  words: string[],
  maxChars: number = ANDROID_SPEECH_MAX_CHARS
): SpeechChunk[] {
  const chunks: SpeechChunk[] = [];
  let start = 0;
  let current: string[] = [];
  let len = 0;

  const flush = (nextStart: number) => {
    if (current.length === 0) return;
    chunks.push({ text: current.join(" "), startWord: start });
    start = nextStart;
    current = [];
    len = 0;
  };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const add = (current.length ? 1 : 0) + word.length;
    if (current.length > 0 && len + add > maxChars) {
      flush(i);
    }
    current.push(word);
    len += (current.length > 1 ? 1 : 0) + word.length;
    if (breathPauseMs(word) > 0) flush(i + 1);
  }

  flush(words.length);
  return chunks;
}
