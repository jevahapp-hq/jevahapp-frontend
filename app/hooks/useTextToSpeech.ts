import * as Speech from "expo-speech";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

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

  // Calculate progress
  const progress = totalWords > 0 ? (currentWordIndex / totalWords) * 100 : 0;

  // Speak text
  const speak = useCallback(
    async (text: string) => {
      try {
        // Stop any ongoing speech
        await Speech.stop();

        // Store text for reference
        currentTextRef.current = text;
        const words = text.split(/\s+/);
        setTotalWords(words.length);
        setCurrentWordIndex(0);

        console.log(`🗣️ Starting speech: "${text.substring(0, 50)}..."`);
        console.log(`📊 Total words: ${words.length}`);

        setIsSpeaking(true);
        setIsPaused(false);
        onStart?.();

        // Speech options
        const speechOptions: Speech.SpeechOptions = {
          language,
          pitch,
          rate,
          voice: selectedVoice,
          onStart: () => {
            console.log("▶️ Speech started");
          },
          onDone: () => {
            if (isMountedRef.current) {
              console.log("✅ Speech completed");
              setIsSpeaking(false);
              setIsPaused(false);
              setCurrentWordIndex(totalWords);
              onDone?.();
            }
          },
          onStopped: () => {
            if (isMountedRef.current) {
              console.log("⏹️ Speech stopped");
              setIsSpeaking(false);
              setIsPaused(false);
              onStopped?.();
            }
          },
          onError: (error) => {
            console.error("❌ Speech error:", error);
            setIsSpeaking(false);
            setIsPaused(false);
            onError?.(error);
          },
          // Word boundary callback for progress tracking
          onBoundary: (event) => {
            if (isMountedRef.current && event.charIndex !== undefined) {
              // Estimate word index from character index
              const textUpToNow = text.substring(0, event.charIndex);
              const wordsSpoken = textUpToNow.split(/\s+/).length;
              setCurrentWordIndex(wordsSpoken);
              onProgress?.({
                currentWord: wordsSpoken,
                totalWords: words.length,
              });
            }
          },
        };

        await Speech.speak(text, speechOptions);
      } catch (error) {
        console.error("❌ Error in speak:", error);
        setIsSpeaking(false);
        onError?.(error);
      }
    },
    [
      language,
      pitch,
      rate,
      selectedVoice,
      totalWords,
      onStart,
      onDone,
      onStopped,
      onError,
      onProgress,
    ]
  );

  // Pause speech
  const pause = useCallback(async () => {
    try {
      if (Platform.OS === "android") {
        // expo-speech pause is not supported on Android; gracefully fallback
        setIsPaused(true);
        console.log(
          "⏸️ Pause not supported on Android - state flagged as paused"
        );
        return;
      }
      await Speech.pause();
      setIsPaused(true);
      console.log("⏸️ Speech paused");
    } catch (error) {
      console.error("❌ Error pausing speech:", error);
    }
  }, []);

  // Resume speech
  const resume = useCallback(async () => {
    try {
      if (Platform.OS === "android") {
        // expo-speech resume is not supported on Android; simply clear paused state
        setIsPaused(false);
        console.log("▶️ Resume not supported on Android - state unpaused");
        return;
      }
      await Speech.resume();
      setIsPaused(false);
      console.log("▶️ Speech resumed");
    } catch (error) {
      console.error("❌ Error resuming speech:", error);
    }
  }, []);

  // Stop speech
  const stop = useCallback(async () => {
    try {
      await Speech.stop();
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentWordIndex(0);
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
