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
