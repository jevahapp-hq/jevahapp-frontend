import { create } from "zustand";

interface VideoItem {
  title: string;
  speaker: string;
  timeAgo: string;
  views: number;
  sheared: number;
  saved: number;
  favorite: number;
  fileUrl: string;
  imageUrl: string;
  speakerAvatar: string;
  _id: string;
  contentType: string;
  description?: string;
  createdAt: string;
  uploadedBy?: string;
}

/** Cross-surface resume (feed ↔ Reels) keyed by media id, not player key. */
export type ResumePlayback = {
  contentId: string;
  positionMs: number;
  /** Feed FlashList/player key to restore visibility after Reels. */
  feedKey?: string;
  /** Reels list index at exit — independent of whether fullscreen is open. */
  reelsIndex?: number;
  /**
   * Which surface may apply this seek.
   * Prevents background feed cards from consuming resume while Reels is open.
   */
  target: "reels" | "feed";
};

interface ReelsState {
  videoList: VideoItem[];
  currentIndex: number;
  resumePlayback: ResumePlayback | null;
  setVideoList: (videos: VideoItem[]) => void;
  removeVideoById: (id: string) => void;
  setCurrentIndex: (index: number) => void;
  setResumePlayback: (resume: ResumePlayback | null) => void;
  /** Read-and-clear when the matching feed surface has applied the seek. */
  consumeResumePlayback: (
    contentId: string,
    target?: ResumePlayback["target"]
  ) => ResumePlayback | null;
  clearResumePlayback: () => void;
  clearReelsData: () => void;
}

export const useReelsStore = create<ReelsState>((set, get) => ({
  videoList: [],
  currentIndex: 0,
  resumePlayback: null,
  setVideoList: (videos) => set({ videoList: videos }),
  removeVideoById: (id) =>
    set((state) => {
      const next = state.videoList.filter((v) => String(v._id) !== String(id));
      const currentIndex = Math.min(
        state.currentIndex,
        Math.max(0, next.length - 1)
      );
      return { videoList: next, currentIndex };
    }),
  setCurrentIndex: (index) => set({ currentIndex: index }),
  setResumePlayback: (resume) => set({ resumePlayback: resume }),
  consumeResumePlayback: (contentId, target = "feed") => {
    const resume = get().resumePlayback;
    if (!resume || String(resume.contentId) !== String(contentId)) return null;
    if (resume.target !== target) return null;
    if (!(resume.positionMs > 400)) {
      return null;
    }
    // Keep feedKey / contentId so exiting fullscreen can restore the same
    // row even if a still-mounted card applies the seek first.
    set({
      resumePlayback: {
        ...resume,
        positionMs: 0,
      },
    });
    return resume;
  },
  clearResumePlayback: () => set({ resumePlayback: null }),
  clearReelsData: () =>
    set({ videoList: [], currentIndex: 0, resumePlayback: null }),
}));
