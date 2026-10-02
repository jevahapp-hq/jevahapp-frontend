import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useGlobalAudioPlayerStore } from "@/store/useGlobalAudioPlayerStore";
import { getAudioPlaybackClock } from "@/store/audioPlayer/audioProgressStore";
import {
  releaseReadingNarrationTrack,
  subscribeReadingDismiss,
} from "../../../src/shared/audio/dismissReadingNarration";
import { ensurePlayingTrack } from "../../../src/shared/audio/playOrToggleTrack";
import { mmkvGetJson, mmkvSetJson } from "../../../src/shared/cache/mmkvStorage";
import {
  BIBLE_NARRATORS,
  type BibleNarratorId,
} from "../../services/bibleNarrationApi";
import {
  synthesizeNarration,
  warmNarrationQueue,
} from "../../services/narratorSpeech";
import {
  blockIndexAtTime,
  blockMarks,
  blockStartMs,
  pageChunks,
  PLAYBACK_CHUNK_CHARS,
  type BlockMark,
} from "../../reader/ebookNarrationSync";
import { spokenChapterVerses } from "../../utils/bibleNarrationSync";

const READER_KEY = "bible-narrator-id";
const HIGHLIGHT_LEAD_MS = 200;

export type NarrationVerse = {
  bookName?: string;
  chapterNumber?: number;
  verseNumber: number;
  text: string;
  translation?: string;
};

type Options = {
  bookName: string;
  chapterNumber: number;
  translationId?: string;
  verses: NarrationVerse[];
  onChapterEnded?: () => void;
};

function savedReader(): BibleNarratorId {
  const saved = mmkvGetJson<unknown>(READER_KEY);
  if (saved === "david" || saved === "hays" || saved === "souer") return saved;
  return "david";
}

export function useBibleNarration({
  bookName,
  chapterNumber,
  translationId,
  verses,
  onChapterEnded,
}: Options) {
  const [readerId, setReaderIdState] = useState<BibleNarratorId>(savedReader);
  const [rate, setRateState] = useState(1);
  const [held, setHeld] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const heldRef = useRef(false);
  const continueRef = useRef(false);
  const advancedRef = useRef<string | null>(null);
  const heardRef = useRef<string | null>(null);
  const endedRef = useRef(onChapterEnded);
  endedRef.current = onChapterEnded;
  const readerIdRef = useRef(readerId);
  readerIdRef.current = readerId;
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const versesRef = useRef(verses);
  versesRef.current = verses;
  const translationRef = useRef(translationId);
  translationRef.current = translationId;
  const bookRef = useRef(bookName);
  bookRef.current = bookName;
  const chapterRef = useRef(chapterNumber);
  chapterRef.current = chapterNumber;

  const chunkRef = useRef<{
    blockOffset: number;
    marks: BlockMark[];
    numbers: number[];
  } | null>(null);
  const trackIdRef = useRef<string | null>(null);
  const playGeneration = useRef(0);
  const prefetchToken = useRef(0);
  const pendingVerseRef = useRef<number | null>(null);

  const readers = useMemo(
    () =>
      BIBLE_NARRATORS.map((narrator) => ({
        id: narrator.id,
        name: narrator.name,
      })),
    []
  );

  const reader = readers.find((item) => item.id === readerId) || readers[0];

  const currentTrackId = useGlobalAudioPlayerStore((s) => s.currentTrack?.id);
  const sessionPlaying = useGlobalAudioPlayerStore((s) => s.isPlaying);
  const isCurrent =
    !!trackIdRef.current && currentTrackId === trackIdRef.current;
  const isPlaying = isCurrent && sessionPlaying && !held;
  const [activeVerseNumber, setActiveVerseNumber] = useState<number | null>(
    null
  );
  const [hasMoved, setHasMoved] = useState(false);
  const isPaused = held || (isCurrent && !sessionPlaying && hasMoved);

  const scriptNow = useCallback(() => {
    return spokenChapterVerses(
      versesRef.current,
      bookRef.current,
      chapterRef.current
    );
  }, []);

  useEffect(() => {
    if (!isCurrent) {
      setActiveVerseNumber(null);
      setHasMoved(false);
      return;
    }
    const tick = () => {
      const id = trackIdRef.current;
      const store = useGlobalAudioPlayerStore.getState();
      if (!id || store.currentTrack?.id !== id) return;
      const clock = getAudioPlaybackClock();
      if (clock.trackId !== id) return;
      const playing = store.isPlaying && !heldRef.current;
      if (playing && clock.progress < 0.98) heardRef.current = id;
      const chunk = chunkRef.current;
      if (
        chunk &&
        clock.duration >= 1000 &&
        heardRef.current === id &&
        clock.progress >= 0.995 &&
        !playing &&
        advancedRef.current !== id
      ) {
        const spoken = scriptNow();
        const nextOffset = chunk.blockOffset + chunk.marks.length;
        if (nextOffset < spoken.length) {
          advancedRef.current = id;
          void playChunk(readerIdRef.current, nextOffset, 0);
          return;
        }
        advancedRef.current = id;
        continueRef.current = true;
        endedRef.current?.();
        return;
      }
      const moved = clock.position > 250 && clock.progress < 0.995;
      setHasMoved((prev) => (prev === moved ? prev : moved));
      if (!chunk || chunk.marks.length === 0) return;
      const local = blockIndexAtTime(
        chunk.marks,
        clock.position + HIGHLIGHT_LEAD_MS * Math.max(rateRef.current, 1)
      );
      if (local == null) return;
      const nextVerse = chunk.numbers[local] ?? null;
      setActiveVerseNumber((prev) => (prev === nextVerse ? prev : nextVerse));
    };
    tick();
    const timer = setInterval(tick, 400);
    return () => clearInterval(timer);
  }, [isCurrent, currentTrackId, scriptNow]);

  const playChunk = useCallback(
    async (id: BibleNarratorId, blockOffset: number, localStart: number) => {
      const spoken = scriptNow();
      if (spoken.length === 0) return;
      const chunks = pageChunks(
        spoken.map((verse) => verse.text),
        PLAYBACK_CHUNK_CHARS
      );
      const chunk =
        chunks.find(
          (item) =>
            blockOffset >= item.blockOffset &&
            blockOffset < item.blockOffset + item.blocks.length
        ) || chunks[0];
      if (!chunk) return;
      const generation = ++playGeneration.current;
      heldRef.current = false;
      setHeld(false);
      setPreparing(true);
      const chunkIndex = Math.max(0, chunks.indexOf(chunk));
      const token = prefetchToken.current;
      const audioPromise = synthesizeNarration(id, chunk.blocks);
      warmNarrationQueue(
        id,
        chunks.slice(chunkIndex + 1).map((item) => item.blocks),
        () => prefetchToken.current === token
      );
      try {
        const audio = await audioPromise;
        if (generation !== playGeneration.current) return;
        if (!audio.uri) return;
        const numbers = spoken
          .slice(chunk.blockOffset, chunk.blockOffset + chunk.blocks.length)
          .map((verse) => verse.verseNumber);
        const marks = blockMarks(chunk.blocks, audio.words);
        chunkRef.current = {
          blockOffset: chunk.blockOffset,
          marks,
          numbers,
        };
        const narrator =
          BIBLE_NARRATORS.find((item) => item.id === id)?.name || "Bible";
        const version = translationRef.current || "selected";
        const track = {
          id: `bible-narration-${audio.id}`,
          title: `${bookRef.current} ${chapterRef.current}`,
          artist: narrator,
          audioUrl: audio.uri,
          thumbnailUrl: "",
          duration: 0,
          source: "ebook" as const,
        };
        trackIdRef.current = track.id;
        advancedRef.current = null;
        heardRef.current = null;
        const store = useGlobalAudioPlayerStore.getState();
        if (store.currentTrack?.id !== track.id) {
          await ensurePlayingTrack(track, { queue: [track] });
        }
        if (generation !== playGeneration.current) {
          releaseReadingNarrationTrack();
          return;
        }
        const localIndex = Math.max(
          0,
          Math.min(chunk.blocks.length - 1, blockOffset - chunk.blockOffset + localStart)
        );
        const start = blockStartMs(marks, localIndex);
        for (let attempt = 0; attempt < 10; attempt += 1) {
          const duration =
            getAudioPlaybackClock().duration ||
            useGlobalAudioPlayerStore.getState().duration;
          if (duration > 0) {
            if (start > 0) {
              await useGlobalAudioPlayerStore.getState().seek(start);
            }
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        if (generation !== playGeneration.current) {
          releaseReadingNarrationTrack();
          return;
        }
        await useGlobalAudioPlayerStore.getState().setRate(rateRef.current);
        if (generation !== playGeneration.current) {
          releaseReadingNarrationTrack();
          return;
        }
        if (!useGlobalAudioPlayerStore.getState().isPlaying) {
          await useGlobalAudioPlayerStore.getState().play();
        }
        console.log(
          `📖 Bible narration ${narrator} ${version} ${bookRef.current} ${chapterRef.current}`
        );
      } catch (error) {
        console.warn("Bible narrator failed", error);
      } finally {
        if (generation === playGeneration.current) setPreparing(false);
      }
    },
    [scriptNow]
  );

  const playFromVerse = useCallback(
    async (verseNumber: number) => {
      const spoken = scriptNow();
      if (spoken.length === 0) {
        pendingVerseRef.current = verseNumber;
        return;
      }
      pendingVerseRef.current = null;
      prefetchToken.current += 1;
      const index = spoken.findIndex((verse) => verse.verseNumber >= verseNumber);
      const start = index >= 0 ? index : 0;
      await playChunk(readerIdRef.current, start, 0);
    },
    [playChunk, scriptNow]
  );

  useEffect(() => {
    const pending = pendingVerseRef.current;
    if (pending == null) return;
    if (scriptNow().length === 0) return;
    const verse = pending;
    pendingVerseRef.current = null;
    continueRef.current = false;
    void playFromVerse(verse);
  }, [verses, bookName, chapterNumber, translationId, playFromVerse, scriptNow]);

  useEffect(() => {
    return () => {
      playGeneration.current += 1;
      prefetchToken.current += 1;
      if (continueRef.current) return;
      pendingVerseRef.current = null;
      chunkRef.current = null;
      trackIdRef.current = null;
      const store = useGlobalAudioPlayerStore.getState();
      if (store.currentTrack?.id?.startsWith("bible-narration-")) {
        releaseReadingNarrationTrack();
      }
    };
  }, [bookName, chapterNumber, translationId]);

  useEffect(() => {
    const shouldContinue = continueRef.current;
    if (!shouldContinue) return;
    continueRef.current = false;
    pendingVerseRef.current = 1;
    void playFromVerse(1);
  }, [bookName, chapterNumber, playFromVerse]);

  const abandonPlayback = useCallback(() => {
    playGeneration.current += 1;
    prefetchToken.current += 1;
    continueRef.current = false;
    pendingVerseRef.current = null;
    heldRef.current = true;
    releaseReadingNarrationTrack();
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        abandonPlayback();
      };
    }, [abandonPlayback])
  );

  useEffect(() => subscribeReadingDismiss(abandonPlayback), [abandonPlayback]);

  useEffect(() => {
    return () => {
      abandonPlayback();
    };
  }, [abandonPlayback]);

  const releaseHold = useCallback(() => {
    heldRef.current = false;
    setHeld(false);
  }, []);

  const holdPlayback = useCallback(async () => {
    heldRef.current = true;
    setHeld(true);
    continueRef.current = false;
    const store = useGlobalAudioPlayerStore.getState();
    if (store.currentTrack?.id !== trackIdRef.current) return;
    try {
      store.soundInstance?.pause();
    } catch {
      // pause again on the next tick
    }
    await store.pause();
  }, []);

  useEffect(() => {
    if (!held) return;
    const timer = setInterval(() => {
      if (!heldRef.current) return;
      const store = useGlobalAudioPlayerStore.getState();
      if (store.currentTrack?.id !== trackIdRef.current) return;
      const player = store.soundInstance;
      if (player?.playing) {
        try {
          player.pause();
        } catch {
          // keep trying while the reader is paused
        }
      }
      if (store.isPlaying) void store.pause();
    }, 200);
    return () => clearInterval(timer);
  }, [held]);

  const togglePlayback = useCallback(
    async (verseNumber: number) => {
      const store = useGlobalAudioPlayerStore.getState();
      const id = trackIdRef.current;
      const onThis = !!id && store.currentTrack?.id === id;
      const playingNow =
        onThis && !!(store.isPlaying || store.soundInstance?.playing);
      if (heldRef.current && onThis && !playingNow) {
        releaseHold();
        const seconds = store.soundInstance?.currentTime;
        const playerMs =
          typeof seconds === "number" && Number.isFinite(seconds)
            ? seconds * 1000
            : 0;
        const clock = getAudioPlaybackClock();
        const pos = Math.max(
          playerMs,
          clock.trackId === id ? clock.position : 0
        );
        if (pos > 250) {
          await store.play();
          return;
        }
        await playFromVerse(verseNumber);
        return;
      }
      if (playingNow || (heldRef.current && onThis)) {
        await holdPlayback();
        return;
      }
      if (onThis) {
        const seconds = store.soundInstance?.currentTime;
        const playerMs =
          typeof seconds === "number" && Number.isFinite(seconds)
            ? seconds * 1000
            : 0;
        const clock = getAudioPlaybackClock();
        const pos = Math.max(
          playerMs,
          clock.trackId === id ? clock.position : 0
        );
        if (pos > 250) {
          releaseHold();
          await store.play();
          return;
        }
      }
      await playFromVerse(verseNumber);
    },
    [holdPlayback, playFromVerse, releaseHold]
  );

  const pause = useCallback(async () => {
    await holdPlayback();
  }, [holdPlayback]);

  const resume = useCallback(async () => {
    const store = useGlobalAudioPlayerStore.getState();
    if (store.currentTrack?.id === trackIdRef.current) await store.play();
  }, []);

  const stop = useCallback(async () => {
    playGeneration.current += 1;
    prefetchToken.current += 1;
    continueRef.current = false;
    pendingVerseRef.current = null;
    advancedRef.current = trackIdRef.current;
    heldRef.current = true;
    setHeld(true);
    setPreparing(false);
    const store = useGlobalAudioPlayerStore.getState();
    if (store.currentTrack?.id !== trackIdRef.current) return;
    try {
      store.soundInstance?.pause();
    } catch {
      // stop still seeks back to the start
    }
    await store.stop();
  }, []);

  const setReader = useCallback(
    (id: string) => {
      if (id !== "david" && id !== "hays" && id !== "souer") return;
      readerIdRef.current = id;
      setReaderIdState(id);
      mmkvSetJson(READER_KEY, id);
      prefetchToken.current += 1;
      const current = useGlobalAudioPlayerStore.getState().currentTrack?.id || "";
      if (!current.startsWith("bible-narration-")) return;
      const numbers = chunkRef.current?.numbers || [];
      const verse = activeVerseNumber || numbers[0] || 1;
      void playChunk(id, Math.max(0, scriptNow().findIndex((item) => item.verseNumber === verse)), 0);
    },
    [activeVerseNumber, playChunk, scriptNow]
  );

  const setRate = useCallback(async (next: number) => {
    const clamped = Math.max(0.5, Math.min(2, next));
    rateRef.current = clamped;
    setRateState(clamped);
    const store = useGlobalAudioPlayerStore.getState();
    if (store.currentTrack?.id === trackIdRef.current) await store.setRate(clamped);
  }, []);

  return {
    readers,
    spokenVerses: [] as { verseNumber: number; text: string }[],
    readerId: reader?.id || readerId,
    setReader,
    rate,
    setRate,
    isPlaying,
    isPaused,
    preparing,
    hasStarted: isPlaying || isPaused || held,
    activeVerseNumber,
    playFromVerse,
    togglePlayback,
    pause,
    resume,
    stop,
    available: readers.length > 0,
  };
}
