import * as Speech from "expo-speech";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useGlobalVideoStore } from "@/store/useGlobalVideoStore";
import { pausePlaybackSession } from "../../src/shared/audio";
import { audioConfig } from "../utils/audioConfig";
import {
  ANDROID_SPEECH_MAX_CHARS,
  chunkWordsForSpeech,
  splitWords,
  type SpeechChunk,
} from "../utils/chunkSpeechText";

/**
 * Custom hook for Text-to-Speech functionality
 * Provides full control over ebook audio reading
 */

export interface TextToSpeechOptions {
  // Speech settings
  language?: string;
  pitch?: number; // 0.5 to 2.0 (default 1.0)
  rate?: number; // 0.01 to 16.0 (default 1.0) - speed
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
    rate: initialRate = 1.0,
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
  const settingsRef = useRef({ language, pitch, rate, selectedVoice });
  settingsRef.current = { language, pitch, rate, selectedVoice };

  // Calculate progress
  const progress = totalWords > 0 ? (currentWordIndex / totalWords) * 100 : 0;

  const speakChunkAt = useCallback((index: number, generation: number) => {
    if (!isMountedRef.current || generation !== utteranceRef.current) return;
    if (pausedRef.current) return;

    const chunks = chunksRef.current;
    if (index >= chunks.length) {
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
      voice,
      onStart: () => {
        console.log("▶️ Speech started");
      },
      onDone: () => {
        if (!isMountedRef.current || generation !== utteranceRef.current) return;
        if (pausedRef.current) return;
        speakChunkAt(index + 1, generation);
      },
      onStopped: () => {
        if (!isMountedRef.current || generation !== utteranceRef.current) return;
        if (suppressStoppedRef.current) {
          suppressStoppedRef.current = false;
          return;
        }
        if (pausedRef.current) return;
        setIsSpeaking(false);
        setIsPaused(false);
        callbacksRef.current.onStopped?.();
      },
      onError: (error) => {
        console.error("❌ Speech error:", error);
        if (generation !== utteranceRef.current) return;
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
      chunksRef.current = chunkWordsForSpeech(remaining, maxChars).map(
        (chunk) => ({
          ...chunk,
          startWord: chunk.startWord + offset,
        })
      );
      chunkIndexRef.current = 0;
      pausedRef.current = false;
      setIsPaused(false);
      setIsSpeaking(true);
      const generation = ++utteranceRef.current;
      speakChunkAt(0, generation);
    },
    [speakChunkAt]
  );

  const speak = useCallback(
    async (text: string) => {
      try {
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
          setIsSpeaking(false);
          return;
        }

        console.log(`🗣️ Starting speech: "${text.substring(0, 50)}..."`);
        console.log(`📊 Total words: ${words.length}`);

        callbacksRef.current.onStart?.();
        await startFromWord(0);
      } catch (error) {
        console.error("❌ Error in speak:", error);
        setIsSpeaking(false);
        callbacksRef.current.onError?.(error);
      }
    },
    [startFromWord]
  );

  const pause = useCallback(async () => {
    try {
      pausedRef.current = true;
      setIsPaused(true);
      if (Platform.OS === "android") {
        suppressStoppedRef.current = true;
        await Speech.stop();
        setIsSpeaking(false);
        console.log("⏸️ Speech paused (Android stop+resume)");
        return;
      }
      await Speech.pause();
      console.log("⏸️ Speech paused");
    } catch (error) {
      console.error("❌ Error pausing speech:", error);
    }
  }, []);

  const resume = useCallback(async () => {
    try {
      if (Platform.OS === "android") {
        const resumeAt = Math.max(0, currentWordIndexRef.current);
        console.log(`▶️ Resuming Android speech from word ${resumeAt}`);
        await startFromWord(resumeAt);
        return;
      }
      pausedRef.current = false;
      setIsPaused(false);
      await Speech.resume();
      setIsSpeaking(true);
      console.log("▶️ Speech resumed");
    } catch (error) {
      console.error("❌ Error resuming speech:", error);
    }
  }, [startFromWord]);

  const stop = useCallback(async () => {
    try {
      pausedRef.current = false;
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

  // Set voice
  const setVoice = useCallback((voiceIdentifier: string) => {
    setSelectedVoice(voiceIdentifier);
    console.log(`🎤 Voice changed to: ${voiceIdentifier}`);
  }, []);

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
      Speech.stop();
    };
  }, []);

  // Check if speech is available
  useEffect(() => {
    const checkSpeech = async () => {
      const available = await Speech.isSpeakingAsync();
      console.log(`🔊 Speech service available: ${available}`);
    };
    checkSpeech();
  }, []);

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

    // Advanced
    speakParagraph,
    speakChapter,
  };
}

export default useTextToSpeech;
