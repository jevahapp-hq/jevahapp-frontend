import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { useReelsStore } from "@/store/useReelsStore";
import {
  findMediaRowIndex,
  resolveFeedResumeKey,
} from "../../video-feed";
import type { FeedRow } from "../types";
import { scrollFeedToResume } from "../utils/scrollFeedToResume";

const RESUME_SCROLL_DELAYS_MS = [0, 16, 48, 160, 400];
const PENDING_RESUME_MS = 2500;
const RESUME_REVEAL_MS = 180;

export function useAllContentTikTokLifecycle(options: {
  pauseAllMedia: () => void;
  pauseAllAudio: () => void;
  setCurrentlyVisibleVideo: (key: string | null) => void;
  currentlyVisibleVideoRef?: MutableRefObject<string | null>;
  listRef?: MutableRefObject<any>;
  listDataRef?: MutableRefObject<FeedRow[]>;
  pendingResumeKeyRef?: MutableRefObject<string | null>;
  isFeedActive?: boolean;
}) {
  const {
    pauseAllMedia,
    pauseAllAudio,
    setCurrentlyVisibleVideo,
    currentlyVisibleVideoRef,
    listRef,
    listDataRef,
    pendingResumeKeyRef,
    isFeedActive = true,
  } = options;
  const isFeedActiveRef = useRef(isFeedActive);
  isFeedActiveRef.current = isFeedActive;
  const isMountedRef = useRef(true);
  /** Last feed video key before leaving (e.g. Reels) so we restore on return. */
  const resumeVideoKeyRef = useRef<string | null>(null);
  const resumeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [resumeCovered, setResumeCovered] = useState(false);

  const clearResumeTimers = useCallback(() => {
    resumeTimersRef.current.forEach((id) => clearTimeout(id));
    resumeTimersRef.current = [];
  }, []);

  const revealAfterResume = useCallback(() => {
    const id = setTimeout(() => {
      if (isMountedRef.current) setResumeCovered(false);
    }, RESUME_REVEAL_MS);
    resumeTimersRef.current.push(id);
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearResumeTimers();
      try {
        pauseAllMedia();
      } catch {
        /* ignore */
      }
    };
  }, [pauseAllMedia, clearResumeTimers]);

  const restoreFeedAfterFullscreen = useCallback(() => {
    const resume = useReelsStore.getState().resumePlayback;
    const listData = listDataRef?.current;
    const resumeKey = resolveFeedResumeKey({
      storeFeedKey: resume?.feedKey,
      blurFeedKey: resumeVideoKeyRef.current,
      contentId: resume?.contentId,
      listData,
    });

    const index = findMediaRowIndex(
      listData,
      resumeKey,
      resume?.contentId
    );

    if (index >= 0 && listData) {
      const key = listData[index]?.key || resumeKey;
      if (key && pendingResumeKeyRef) pendingResumeKeyRef.current = key;
      if (key) setCurrentlyVisibleVideo(key);
      resumeVideoKeyRef.current = null;
      clearResumeTimers();
      for (const delay of RESUME_SCROLL_DELAYS_MS) {
        const id = setTimeout(() => {
          scrollFeedToResume(listRef, listData, index);
        }, delay);
        resumeTimersRef.current.push(id);
      }
      revealAfterResume();
      return true;
    }

    // List may not be ready yet — keep a pending key so the listData
    // effect can scroll once rows exist. Do not mark the first row visible.
    const pending = resumeKey || (resume?.contentId ? String(resume.contentId) : null);
    if (pending && pendingResumeKeyRef) pendingResumeKeyRef.current = pending;
    if (!pending) setResumeCovered(false);
    return Boolean(pending);
  }, [
    listDataRef,
    listRef,
    pendingResumeKeyRef,
    setCurrentlyVisibleVideo,
    clearResumeTimers,
    revealAfterResume,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (!isFeedActiveRef.current) {
        setResumeCovered(false);
        return;
      }
      restoreFeedAfterFullscreen();
      const clearGuard = setTimeout(() => {
        if (pendingResumeKeyRef) pendingResumeKeyRef.current = null;
        if (isMountedRef.current) setResumeCovered(false);
      }, PENDING_RESUME_MS);

      return () => {
        clearTimeout(clearGuard);
        clearResumeTimers();
        if (__DEV__) console.log("📱 Pausing all media on focus loss");
        try {
          pauseAllMedia();
        } catch {
          /* ignore */
        }
        resumeVideoKeyRef.current =
          currentlyVisibleVideoRef?.current ?? resumeVideoKeyRef.current;
        if (
          isFeedActiveRef.current &&
          useReelsStore.getState().resumePlayback?.target === "reels"
        ) {
          setResumeCovered(true);
        }
        setCurrentlyVisibleVideo(null);
        pauseAllAudio();
      };
    }, [
      pauseAllMedia,
      pauseAllAudio,
      setCurrentlyVisibleVideo,
      currentlyVisibleVideoRef,
      pendingResumeKeyRef,
      restoreFeedAfterFullscreen,
      clearResumeTimers,
    ])
  );

  return { isMountedRef, restoreFeedAfterFullscreen, resumeCovered, revealAfterResume };
}
