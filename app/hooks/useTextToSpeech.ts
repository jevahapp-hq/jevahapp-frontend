import * as Speech from "expo-speech";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useGlobalVideoStore } from "@/store/useGlobalVideoStore";
import { pausePlaybackSession } from "../../src/shared/audio";
import { subscribeReadingDismiss } from "../../src/shared/audio/dismissReadingNarration";
import { hydrateFallbackKvFromAsyncStorage } from "../../src/shared/cache/mmkvStorage";
import { audioConfig } from "../utils/audioConfig";
import {
  ANDROID_SPEECH_MAX_CHARS,
  breathPauseMs,
  chunkWordsForCalmReading,
  chunkWordsForSpeech,
  splitWords,
  type SpeechChunk,
} from "../utils/chunkSpeechText";
import {
  READING_VOICE_SAMPLE,
  READING_VOICE_STORAGE_KEY,
  assignReadingVoices,
  getReadingVoice,
  isSiriVoice,
  type ReadingVoiceId,
  type ResolvedReadingVoice,
} from "../utils/readingVoices";
import {
  readSavedReadingVoiceId,
  saveReadingVoiceId,
} from "../utils/readingVoicePreference";

/**
 * Custom hook for Text-to-Speech functionality
 * Provides full control over ebook audio reading
 */

export interface TextToSpeechOptions {
  // Speech settings
  language?: string;
  pitch?: number; // 0.5 to 2.0 (default 1.0)
  rate?: number; // 0.5 to 2.0. 0.8 is a calm reading pace.
  voice?: string; // Voice identifier

  // Auto-play settings
  autoPlay?: boolean;

  // Callbacks
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: any) => void;
  onProgress?: (progress: { currentWord: number; totalWords: number }) => void;
}

export interface UseTextToSpeechReturn {
  // State
  isSpeaking: boolean;
  isPaused: boolean;
  currentWordIndex: number;
  totalWords: number;
  progress: number; // 0-100

  // Speech settings
  rate: number;
  pitch: number;
  readingVoiceId: ReadingVoiceId;

  // Controls
  speak: (text: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;

  // Settings
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;

  // Utilities
  getAvailableVoices: () => Promise<Speech.Voice[]>;
  setVoice: (voiceIdentifier: string) => void;
  setNarratorVoice: (voiceIdentifier: string) => void;
  setReadingVoice: (id: ReadingVoiceId) => Promise<void>;
  previewReadingVoice: (id: ReadingVoiceId) => Promise<void>;

  // Advanced
  speakParagraph: (paragraph: string, index: number) => Promise<void>;
  speakChapter: (chapter: { title: string; content: string }) => Promise<void>;
}

export function useTextToSpeech(
  options: TextToSpeechOptions = {}
): UseTextToSpeechReturn {
  const {
    language = "en-US",
    pitch: initialPitch = 1.0,
    rate: initialRate = Platform.OS === "ios" ? 1 : 0.8,
    voice: initialVoice,
    autoPlay = false,
    onStart,
    onDone,
    onStopped,
    onError,
    onProgress,
  } = options;

  // State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [rate, setRate] = useState(initialRate);
  const [pitch, setPitch] = useState(initialPitch);
  const [selectedVoice, setSelectedVoice] = useState<string | undefined>(
    initialVoice
  );
  const [readingVoiceId, setReadingVoiceId] = useState<ReadingVoiceId>(() =>
    readSavedReadingVoiceId()
  );

  // Refs
  const currentTextRef = useRef<string>("");
  const isMountedRef = useRef(true);
  const pausedRef = useRef(false);
  const suppressStoppedRef = useRef(false);
  const chunksRef = useRef<SpeechChunk[]>([]);
  const chunkIndexRef = useRef(0);
  const wordsRef = useRef<string[]>([]);
  const utteranceRef = useRef(0);
  const currentWordIndexRef = useRef(0);
  const callbacksRef = useRef({
    onStart,
    onDone,
    onStopped,
    onError,
    onProgress,
  });
  callbacksRef.current = {
    onStart,
    onDone,
    onStopped,
    onError,
    onProgress,
  };
  const voiceIdRef = useRef(readingVoiceId);
  const presetPitchRef = useRef(getReadingVoice(readingVoiceId).pitch);
  const voiceIdentifierRef = useRef<string | undefined>(initialVoice);
  const voiceLanguageRef = useRef<string | undefined>(undefined);
  const voiceMapRef = useRef<Record<
    ReadingVoiceId,
    ResolvedReadingVoice
  > | null>(null);
  const voiceLoadRef = useRef<Promise<void> | null>(null);
  const speakingRef = useRef(false);
  const previewTokenRef = useRef(0);
  const breathTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingChunkRef = useRef<number | null>(null);
  const narratorLockRef = useRef<string | null>(null);
  const baseLanguageRef = useRef(language);
  baseLanguageRef.current = language;
  const settingsRef = useRef({
    language,
    pitch: presetPitchRef.current,
    rate,
    selectedVoice,
  });
  settingsRef.current = {
    language: voiceLanguageRef.current || language,
    pitch: presetPitchRef.current,
    rate,
    selectedVoice: voiceIdentifierRef.current,
  };

  // Calculate progress
  const progress = totalWords > 0 ? (currentWordIndex / totalWords) * 100 : 0;

  const speakChunkAt = useCallback((index: number, generation: number) => {
    if (!isMountedRef.current || generation !== utteranceRef.current) return;
    if (pausedRef.current) return;

    const chunks = chunksRef.current;
    if (index >= chunks.length) {
      speakingRef.current = false;
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentWordIndex(wordsRef.current.length);
      callbacksRef.current.onDone?.();
      return;
    }

    chunkIndexRef.current = index;
    const chunk = chunks[index];
    const { language: lang, pitch: p, rate: r, selectedVoice: voice } =
      settingsRef.current;
    const total = wordsRef.current.length;

    Speech.speak(chunk.text, {
      language: lang,
      pitch: p,
      rate: r,
      ...(voice ? { voice } : {}),
      onStart: () => {
        console.log("▶️ Speech started");
      },
      onDone: () => {
        if (!isMountedRef.current || generation !== utteranceRef.current) return;
        if (pausedRef.current) return;
        const next = index + 1;
        const pauseMs = breathPauseMs(chunk.text);
        if (pauseMs <= 0) {
          speakChunkAt(next, generation);
          return;
        }
        pendingChunkRef.current = next;
        breathTimerRef.current = setTimeout(() => {
          breathTimerRef.current = null;
          if (!isMountedRef.current || generation !== utteranceRef.current) return;
          if (pausedRef.current) return;
          pendingChunkRef.current = null;
          speakChunkAt(next, generation);
        }, pauseMs);
      },
      onStopped: () => {
        if (!isMountedRef.current || generation !== utteranceRef.current) return;
        if (suppressStoppedRef.current) {
          suppressStoppedRef.current = false;
          return;
        }
        if (pausedRef.current) return;
        speakingRef.current = false;
        setIsSpeaking(false);
        setIsPaused(false);
        callbacksRef.current.onStopped?.();
      },
      onError: (error) => {
        console.error("❌ Speech error:", error);
        if (generation !== utteranceRef.current) return;
        speakingRef.current = false;
        setIsSpeaking(false);
        setIsPaused(false);
        callbacksRef.current.onError?.(error);
      },
      onBoundary: (event) => {
        if (!isMountedRef.current || event.charIndex === undefined) return;
        const textUpToNow = chunk.text.substring(0, event.charIndex);
        const wordsSpoken = textUpToNow.split(/\s+/).filter(Boolean).length;
        const currentWord = chunk.startWord + wordsSpoken;
        currentWordIndexRef.current = currentWord;
        setCurrentWordIndex(currentWord);
        callbacksRef.current.onProgress?.({
          currentWord,
          totalWords: total,
        });
      },
    });
  }, []);

  const startFromWord = useCallback(
    async (startWord: number) => {
      const words = wordsRef.current;
      if (words.length === 0) return;
      const offset = Math.max(0, Math.min(startWord, words.length - 1));
      const remaining = words.slice(offset);
      const maxChars =
        Platform.OS === "android" ? ANDROID_SPEECH_MAX_CHARS : Number.MAX_SAFE_INTEGER;
      const voiceId = voiceIdentifierRef.current || "";
      // Siri already pauses at punctuation. Splitting each sentence restarts
      // her intro tone and stops sounding like Siri.
      const chunk =
        Platform.OS === "ios" &&
        isSiriVoice({ identifier: voiceId, name: voiceId })
          ? chunkWordsForSpeech
          : chunkWordsForCalmReading;
      chunksRef.current = chunk(remaining, maxChars).map(
        (chunk) => ({
          ...chunk,
          startWord: chunk.startWord + offset,
        })
      );
      chunkIndexRef.current = 0;
      pausedRef.current = false;
      speakingRef.current = true;
      if (breathTimerRef.current) {
        clearTimeout(breathTimerRef.current);
        breathTimerRef.current = null;
      }
      pendingChunkRef.current = null;
      setIsPaused(false);
      setIsSpeaking(true);
      const generation = ++utteranceRef.current;
      speakChunkAt(0, generation);
    },
    [speakChunkAt]
  );

  const applyReadingVoice = useCallback((id: ReadingVoiceId) => {
    const preset = getReadingVoice(id);
    const resolved = voiceMapRef.current?.[id];
    voiceIdRef.current = id;
    presetPitchRef.current = preset.pitch;
    voiceIdentifierRef.current = resolved?.identifier;
    voiceLanguageRef.current = resolved?.language;
    setReadingVoiceId(id);
    setPitch(preset.pitch);
    setSelectedVoice(resolved?.identifier);
    settingsRef.current = {
      ...settingsRef.current,
      language: resolved?.language || baseLanguageRef.current,
      pitch: preset.pitch,
      selectedVoice: resolved?.identifier,
    };
    saveReadingVoiceId(id);
    if (narratorLockRef.current) {
      voiceIdentifierRef.current = narratorLockRef.current;
      settingsRef.current = {
        ...settingsRef.current,
        selectedVoice: narratorLockRef.current,
      };
      setSelectedVoice(narratorLockRef.current);
    }
  }, []);

  const ensureReadingVoices = useCallback(async () => {
    if (!voiceLoadRef.current) {
      voiceLoadRef.current = (async () => {
        try {
          const voices = await Speech.getAvailableVoicesAsync();
          voiceMapRef.current = assignReadingVoices(voices);
        } catch (error) {
          console.error("❌ Error getting voices:", error);
          voiceMapRef.current = { maple: {}, cove: {}, breeze: {} };
        }
      })();
    }
    await voiceLoadRef.current;
    applyReadingVoice(voiceIdRef.current);
  }, [applyReadingVoice]);

  const speak = useCallback(
    async (text: string) => {
      try {
        previewTokenRef.current += 1;
        await ensureReadingVoices();
        suppressStoppedRef.current = true;
        await Speech.stop();
        await new Promise((resolve) => setTimeout(resolve, 50));
        suppressStoppedRef.current = false;
        try {
          await pausePlaybackSession();
        } catch {
          // no-op
        }
        try {
          useGlobalVideoStore.getState().pauseAllVideos?.();
        } catch {
          // no-op
        }
        try {
          await audioConfig.configureForGeneralUse();
        } catch {
          // no-op
        }

        const words = splitWords(text);
        currentTextRef.current = words.join(" ");
        wordsRef.current = words;
        currentWordIndexRef.current = 0;
        setTotalWords(words.length);
        setCurrentWordIndex(0);

        if (words.length === 0) {
          speakingRef.current = false;
          setIsSpeaking(false);
          return;
        }

        console.log(`🗣️ Starting speech: "${text.substring(0, 50)}..."`);
        console.log(`📊 Total words: ${words.length}`);

        callbacksRef.current.onStart?.();
        await startFromWord(0);
      } catch (error) {
        console.error("❌ Error in speak:", error);
        speakingRef.current = false;
        setIsSpeaking(false);
        callbacksRef.current.onError?.(error);
      }
    },
    [ensureReadingVoices, startFromWord]
  );

  const pause = useCallback(async () => {
    try {
      pausedRef.current = true;
      speakingRef.current = false;
      setIsPaused(true);
      setIsSpeaking(false);
      if (breathTimerRef.current) {
        clearTimeout(breathTimerRef.current);
        breathTimerRef.current = null;
      }
      pendingChunkRef.current = null;
      // Speech.pause() is ignored by Siri and many iOS voices, so the
      // utterance keeps going. Stopping it is what actually holds the voice.
      utteranceRef.current += 1;
      suppressStoppedRef.current = true;
      await Speech.stop();
      console.log("⏸️ Speech paused");
    } catch (error) {
      console.error("❌ Error pausing speech:", error);
    }
  }, []);

  const resume = useCallback(async () => {
    try {
      const resumeAt = Math.max(0, currentWordIndexRef.current);
      pausedRef.current = false;
      setIsPaused(false);
      console.log(`▶️ Resuming speech from word ${resumeAt}`);
      await startFromWord(resumeAt);
    } catch (error) {
      console.error("❌ Error resuming speech:", error);
    }
  }, [startFromWord]);

  const stop = useCallback(async () => {
    try {
      pausedRef.current = false;
      speakingRef.current = false;
      previewTokenRef.current += 1;
      if (breathTimerRef.current) {
        clearTimeout(breathTimerRef.current);
        breathTimerRef.current = null;
      }
      pendingChunkRef.current = null;
      utteranceRef.current += 1;
      suppressStoppedRef.current = true;
      await Speech.stop();
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentWordIndex(0);
      currentWordIndexRef.current = 0;
      console.log("⏹️ Speech stopped");
    } catch (error) {
      console.error("❌ Error stopping speech:", error);
    }
  }, []);

  // Get available voices
  const getAvailableVoices = useCallback(async () => {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      console.log(`🎤 Available voices: ${voices.length}`);
      return voices;
    } catch (error) {
      console.error("❌ Error getting voices:", error);
      return [];
    }
  }, []);

  // Set a raw device voice identifier.
  const setVoice = useCallback((voiceIdentifier: string) => {
    voiceIdentifierRef.current = voiceIdentifier;
    setSelectedVoice(voiceIdentifier);
    settingsRef.current = {
      ...settingsRef.current,
      selectedVoice: voiceIdentifier,
    };
    console.log(`🎤 Voice changed to: ${voiceIdentifier}`);
  }, []);

  const setNarratorVoice = useCallback((voiceIdentifier: string) => {
    narratorLockRef.current = voiceIdentifier;
    setVoice(voiceIdentifier);
  }, [setVoice]);

  const restartWithVoice = useCallback(
    async (id: ReadingVoiceId) => {
      await ensureReadingVoices();
      applyReadingVoice(id);
      const active =
        (speakingRef.current || pausedRef.current) &&
        wordsRef.current.length > 0;
      if (!active) return;
      const at = currentWordIndexRef.current;
      utteranceRef.current += 1;
      suppressStoppedRef.current = true;
      await Speech.stop();
      await new Promise((resolve) => setTimeout(resolve, 50));
      suppressStoppedRef.current = false;
      await startFromWord(at);
    },
    [applyReadingVoice, ensureReadingVoices, startFromWord]
  );

  const setReadingVoice = useCallback(
    async (id: ReadingVoiceId) => {
      await restartWithVoice(id);
    },
    [restartWithVoice]
  );

  const previewReadingVoice = useCallback(
    async (id: ReadingVoiceId) => {
      if (
        (speakingRef.current || pausedRef.current) &&
        wordsRef.current.length > 0
      ) {
        await restartWithVoice(id);
        return;
      }
      await ensureReadingVoices();
      applyReadingVoice(id);
      try {
        await pausePlaybackSession();
      } catch {
        // no-op
      }
      const token = ++previewTokenRef.current;
      const preset = getReadingVoice(id);
      const resolved = voiceMapRef.current?.[id];
      try {
        await Speech.stop();
      } catch {
        // no-op
      }
      if (previewTokenRef.current !== token) return;
      Speech.speak(READING_VOICE_SAMPLE, {
        language: resolved?.language || baseLanguageRef.current,
        pitch: preset.pitch,
        rate: settingsRef.current.rate || 1,
        ...(resolved?.identifier ? { voice: resolved.identifier } : {}),
      });
    },
    [applyReadingVoice, ensureReadingVoices, restartWithVoice]
  );

  // Speak a single paragraph with context
  const speakParagraph = useCallback(
    async (paragraph: string, index: number) => {
      console.log(`📖 Speaking paragraph ${index}`);
      await speak(paragraph);
    },
    [speak]
  );

  // Speak entire chapter with pauses between paragraphs
  const speakChapter = useCallback(
    async (chapter: { title: string; content: string }) => {
      try {
        console.log(`📚 Speaking chapter: ${chapter.title}`);

        // Speak chapter title first
        await speak(`Chapter: ${chapter.title}`);

        // Wait a bit
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Speak content
        await speak(chapter.content);
      } catch (error) {
        console.error("❌ Error speaking chapter:", error);
        onError?.(error);
      }
    },
    [speak, onError]
  );

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (breathTimerRef.current) clearTimeout(breathTimerRef.current);
      Speech.stop();
    };
  }, []);

  useEffect(() => subscribeReadingDismiss(() => {
    void stop();
  }), [stop]);

  // Check if speech is available and resolve the saved reading voice.
  useEffect(() => {
    let cancelled = false;
    const prepare = async () => {
      const savedAtStart = voiceIdRef.current;
      try {
        await hydrateFallbackKvFromAsyncStorage([READING_VOICE_STORAGE_KEY]);
      } catch {
        // no-op
      }
      if (cancelled || voiceIdRef.current !== savedAtStart) return;
      const saved = readSavedReadingVoiceId();
      voiceIdRef.current = saved;
      setReadingVoiceId(saved);
      await ensureReadingVoices();
      const available = await Speech.isSpeakingAsync();
      console.log(`🔊 Speech service available: ${available}`);
    };
    prepare();
    return () => {
      cancelled = true;
    };
  }, [ensureReadingVoices]);

  return {
    // State
    isSpeaking,
    isPaused,
    currentWordIndex,
    totalWords,
    progress,

    // Speech settings
    rate,
    pitch,
    readingVoiceId,

    // Controls
    speak,
    pause,
    resume,
    stop,

    // Settings
    setRate,
    setPitch,

    // Utilities
    getAvailableVoices,
    setVoice,
    setNarratorVoice,
    setReadingVoice,
    previewReadingVoice,

    // Advanced
    speakParagraph,
    speakChapter,
  };
}

export default useTextToSpeech;
