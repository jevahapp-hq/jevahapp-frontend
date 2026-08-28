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

interface ReelsState {
  videoList: VideoItem[];
  currentIndex: number;
  setVideoList: (videos: VideoItem[]) => void;
  removeVideoById: (id: string) => void;
  setCurrentIndex: (index: number) => void;
  clearReelsData: () => void;
}

export const useReelsStore = create<ReelsState>((set) => ({
  videoList: [],
  currentIndex: 0,
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
  clearReelsData: () => set({ videoList: [], currentIndex: 0 }),
}));

