import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useGlobalAudioPlayerStore } from "@/store/useGlobalAudioPlayerStore";
import { getAudioPlaybackClock } from "@/store/audioPlayer/audioProgressStore";
import {
  releaseReadingNarrationTrack,
  subscribeReadingDismiss,
} from "../../src/shared/audio/dismissReadingNarration";
import { ensurePlayingTrack } from "../../src/shared/audio/playOrToggleTrack";
import { mmkvGetJson, mmkvSetJson } from "../../src/shared/cache/mmkvStorage";
import {
  BIBLE_NARRATORS,
  type BibleNarratorId,
} from "../services/bibleNarrationApi";
import {
  synthesizeNarration,
  warmNarrationQueue,
} from "../services/narratorSpeech";
import {
  blockIndexAtTime,
  blockMarks,
  blockStartMs,
  pageChunks,
  type BlockMark,
  type PageChunk,
} from "./ebookNarrationSync";

const READER_KEY = "bible-narrator-id";

type Options = {
  blocks: string[];
  chapterNumber: number;
  onChapterEnded?: () => void;
};

function savedReader(): BibleNarratorId {
  const saved = mmkvGetJson<unknown>(READER_KEY);
  if (saved === "david" || saved === "hays" || saved === "souer") return saved;
  return "david";
}

export function useEbookNarration({
  blocks,
  chapterNumber,
  onChapterEnded,
}: Options) {
  const [readerId, setReaderIdState] = useState<BibleNarratorId>(savedReader);
  const [rate, setRateState] = useState(1);
  const [held, setHeld] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
  const [hasMoved, setHasMoved] = useState(false);
  const heldRef = useRef(false);
  const continueRef = useRef(false);
  const heardRef = useRef<string | null>(null);
  const advancedRef = useRef<string | null>(null);
  const endedRef = useRef(onChapterEnded);
  endedRef.current = onChapterEnded;
  const readerIdRef = useRef(readerId);
  readerIdRef.current = readerId;
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const marksRef = useRef<BlockMark[]>([]);
  const chunksRef = useRef<PageChunk[]>([]);
  const chunkIndexRef = useRef(0);
  const trackIdRef = useRef<string | null>(null);
  const playChunkRef = useRef<(index: number, localBlock: number) => Promise<void>>(
    async () => {}
  );
  const prefetchToken = useRef(0);
  const activeRef = useRef<number | null>(null);
  activeRef.current = activeBlockIndex;

  const currentTrackId = useGlobalAudioPlayerStore((s) => s.currentTrack?.id);
  const sessionPlaying = useGlobalAudioPlayerStore((s) => s.isPlaying);
  const isCurrent = !!trackIdRef.current && currentTrackId === trackIdRef.current;
  const isPlaying = isCurrent && sessionPlaying && !held && !preparing;
  const isPaused = held || (isCurrent && !sessionPlaying && hasMoved);

  useEffect(() => {
    if (!isCurrent) return;
    const trackId = trackIdRef.current;
    const tick = () => {
      if (!trackId) return;
      const store = useGlobalAudioPlayerStore.getState();
      if (store.currentTrack?.id !== trackId) return;
      const clock = getAudioPlaybackClock();
      if (clock.trackId !== trackId) return;
      const playing = store.isPlaying && !heldRef.current;
      if (playing && clock.progress < 0.98) heardRef.current = trackId;
      if (
        clock.duration >= 1000 &&
        heardRef.current === trackId &&
        clock.progress >= 0.995 &&
        !playing &&
        advancedRef.current !== trackId
      ) {
        advancedRef.current = trackId;
        heardRef.current = null;
        const nextChunk = chunkIndexRef.current + 1;
        if (nextChunk < chunksRef.current.length) {
          void playChunkRef.current(nextChunk, 0);
          return;
        }
        continueRef.current = true;
        endedRef.current?.();
      }
      const moved = clock.position > 250 && clock.progress < 0.995;
      setHasMoved((prev) => (prev === moved ? prev : moved));
      const local = blockIndexAtTime(
        marksRef.current,
        clock.position + 250 * Math.max(rateRef.current, 1)
      );
      const offset = chunksRef.current[chunkIndexRef.current]?.blockOffset ?? 0;
      const next = local == null ? null : local + offset;
      setActiveBlockIndex((prev) => (prev === next ? prev : next));
    };
    tick();
    const timer = setInterval(tick, 400);
    return () => clearInterval(timer);
  }, [isCurrent, currentTrackId]);

  const playChunk = useCallback(
    async (chunkIndex: number, localBlock: number, narrator?: BibleNarratorId) => {
      const chunk = chunksRef.current[chunkIndex];
      if (!chunk || chunk.blocks.length === 0) return;
      const id = narrator || readerIdRef.current;
      heldRef.current = false;
      setHeld(false);
      setPreparing(true);
      setError(null);
      continueRef.current = false;
      chunkIndexRef.current = chunkIndex;
      const token = prefetchToken.current;
      const audioPromise = synthesizeNarration(id, chunk.blocks);
      warmNarrationQueue(
        id,
        chunksRef.current.slice(chunkIndex + 1).map((item) => item.blocks),
        () => prefetchToken.current === token
      );
      try {
        const audio = await audioPromise;
        if (prefetchToken.current !== token || heldRef.current) return;
        const marks = blockMarks(chunk.blocks, audio.words);
        marksRef.current = marks;
        const trackId = `ebook-narration-${audio.id}`;
        trackIdRef.current = trackId;
        advancedRef.current = null;
        heardRef.current = null;
        const narratorName =
          BIBLE_NARRATORS.find((item) => item.id === id)?.name || "Narrator";
        const track = {
          id: trackId,
          title: `Page ${chapterNumber}`,
          artist: narratorName,
          audioUrl: audio.uri,
          thumbnailUrl: "",
          duration: 0,
          source: "ebook" as const,
        };
        const store = useGlobalAudioPlayerStore.getState();
        if (store.currentTrack?.id !== track.id) {
          await ensurePlayingTrack(track, { queue: [track] });
        }
        const start = blockStartMs(marks, localBlock);
        for (let attempt = 0; attempt < 10; attempt += 1) {
          const duration =
            getAudioPlaybackClock().duration ||
            useGlobalAudioPlayerStore.getState().duration;
          if (duration > 0) {
            await useGlobalAudioPlayerStore.getState().seek(start);
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        await useGlobalAudioPlayerStore.getState().setRate(rateRef.current);
        if (prefetchToken.current !== token || heldRef.current) {
          releaseReadingNarrationTrack();
          return;
        }
        const player = useGlobalAudioPlayerStore.getState();
        if (!player.isPlaying || player.currentTrack?.id !== track.id) {
          await player.play();
        }
        setActiveBlockIndex(chunk.blockOffset + localBlock);
        console.log(`📖 Ebook narrator ${narratorName} page ${chapterNumber}`);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Could not start the narrator";
        console.warn("Ebook narrator failed", message);
        setError(message);
      } finally {
        setPreparing(false);
      }
    },
    [chapterNumber]
  );
  playChunkRef.current = playChunk;

  const playFromBlock = useCallback(
    async (blockIndex: number, narrator?: BibleNarratorId) => {
      const page = blocksRef.current;
      if (page.length === 0) return;
      const chunks = pageChunks(page);
      chunksRef.current = chunks;
      prefetchToken.current += 1;
      let chunkIndex = chunks.findIndex(
        (chunk) =>
          blockIndex >= chunk.blockOffset &&
          blockIndex < chunk.blockOffset + chunk.blocks.length
      );
      if (chunkIndex < 0) chunkIndex = 0;
      const localBlock = Math.max(0, blockIndex - chunks[chunkIndex].blockOffset);
      await playChunk(chunkIndex, localBlock, narrator);
    },
    [playChunk]
  );

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
      // the next tick pauses again if the recording is still going
    }
    await store.pause();
  }, []);

  useEffect(() => {
    if (!held) return;
    const timer = setInterval(() => {
      if (!heldRef.current) return;
      const store = useGlobalAudioPlayerStore.getState();
      if (store.currentTrack?.id !== trackIdRef.current) return;
      if (store.soundInstance?.playing) {
        try {
          store.soundInstance.pause();
        } catch {
          // keep the recording held
        }
      }
      if (store.isPlaying) void store.pause();
    }, 200);
    return () => clearInterval(timer);
  }, [held]);

  const togglePlayback = useCallback(async () => {
    const store = useGlobalAudioPlayerStore.getState();
    const onThis =
      !!trackIdRef.current && store.currentTrack?.id === trackIdRef.current;
    const playingNow =
      onThis && !!(store.isPlaying || store.soundInstance?.playing);
    if (onThis && heldRef.current && !playingNow) {
      releaseHold();
      const clock = getAudioPlaybackClock();
      const pos = clock.trackId === trackIdRef.current ? clock.position : 0;
      if (pos > 250) {
        await store.play();
        return;
      }
    }
    if (playingNow || (onThis && heldRef.current)) {
      await holdPlayback();
      return;
    }
    const clock = getAudioPlaybackClock();
    const pos = clock.trackId === trackIdRef.current ? clock.position : 0;
    if (onThis && pos > 250) {
      releaseHold();
      await store.play();
      return;
    }
    await playFromBlock(activeRef.current || 0);
  }, [holdPlayback, playFromBlock, releaseHold]);

  const stop = useCallback(async () => {
    prefetchToken.current += 1;
    continueRef.current = false;
    advancedRef.current = trackIdRef.current;
    heldRef.current = true;
    setHeld(true);
    setActiveBlockIndex(null);
    const store = useGlobalAudioPlayerStore.getState();
    if (store.currentTrack?.id !== trackIdRef.current) return;
    try {
      store.soundInstance?.pause();
    } catch {
      // stop still returns to the start
    }
    await store.stop();
  }, []);

  const setReader = useCallback(
    (id: string) => {
      if (id !== "david" && id !== "hays" && id !== "souer") return;
      readerIdRef.current = id;
      setReaderIdState(id);
      mmkvSetJson(READER_KEY, id);
      const current = useGlobalAudioPlayerStore.getState().currentTrack?.id || "";
      if (current.startsWith("ebook-narration-")) {
        void playFromBlock(activeRef.current || 0, id);
      }
    },
    [playFromBlock]
  );

  const setRate = useCallback(async (next: number) => {
    const clamped = Math.max(0.5, Math.min(2, next));
    rateRef.current = clamped;
    setRateState(clamped);
    const store = useGlobalAudioPlayerStore.getState();
    if (store.currentTrack?.id === trackIdRef.current) await store.setRate(clamped);
  }, []);

  const abandonPlayback = useCallback(() => {
    prefetchToken.current += 1;
    continueRef.current = false;
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

  return {
    readerId,
    setReader,
    rate,
    setRate,
    isPlaying,
    isPaused,
    preparing,
    error,
    activeBlockIndex,
    playFromBlock,
    togglePlayback,
    stop,
  };
}
