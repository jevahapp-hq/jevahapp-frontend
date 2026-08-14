import { create } from "zustand";

export type OverlayInitialAction = "options" | "playlist" | null;

type OverlayOpenOpts = {
  initialAction?: OverlayInitialAction;
  queue?: any[];
};

type CopyrightFreeOverlayState = {
  visible: boolean;
  song: any | null;
  songs: any[];
  initialAction: OverlayInitialAction;
  open: (song: any, opts?: OverlayOpenOpts) => void;
  close: () => void;
  /** Mount player chrome off-screen so the first tap only animates. */
  warm: (song: any) => void;
  setSong: (song: any | null) => void;
  setQueue: (songs: any[]) => void;
};

export const useCopyrightFreeOverlayStore = create<CopyrightFreeOverlayState>(
  (set) => ({
    visible: false,
    song: null,
    songs: [],
    initialAction: null,
    open: (song, opts) =>
      set((state) => ({
        visible: true,
        song,
        initialAction: opts?.initialAction ?? null,
        songs: opts?.queue ?? state.songs,
      })),
    close: () => set({ visible: false, initialAction: null }),
    warm: (song) =>
      set((state) => (state.song ? state : { ...state, song })),
    setSong: (song) => set({ song }),
    setQueue: (songs) => set({ songs }),
  })
);
