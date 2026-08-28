import { create } from "zustand";

export type OverlayInitialAction = "options" | "playlist" | null;

/**
 * Which chrome is in front. Audio is owned by the global player store —
 * this only decides whether the user sees the full sheet or the mini bar.
 *
 * YouTube Music / Spotify contract:
 *   full  → sheet mounted on screen, mini bar hidden
 *   mini  → sheet unmounted, mini bar interactive. Audio keeps playing.
 */
export type PlayerSurface = "full" | "mini";

type OverlayOpenOpts = {
  initialAction?: OverlayInitialAction;
  queue?: any[];
};

type CopyrightFreeOverlayState = {
  surface: PlayerSurface;
  /** @deprecated use `surface === "full"`. Kept in sync so existing selectors work. */
  visible: boolean;
  song: any | null;
  songs: any[];
  initialAction: OverlayInitialAction;
  open: (song: any, opts?: OverlayOpenOpts) => void;
  minimize: () => void;
  expand: () => void;
  /** @deprecated use `minimize`. Swipe / chevron — does not stop audio. */
  close: () => void;
  /** @deprecated use `expand`. */
  reopen: () => void;
  warm: (song: any) => void;
  setSong: (song: any | null) => void;
  setQueue: (songs: any[]) => void;
};

function asFull(
  song: any,
  opts: OverlayOpenOpts | undefined,
  songs: any[]
): Pick<
  CopyrightFreeOverlayState,
  "surface" | "visible" | "song" | "initialAction" | "songs"
> {
  return {
    surface: "full",
    visible: true,
    song,
    initialAction: opts?.initialAction ?? null,
    songs: opts?.queue ?? songs,
  };
}

export const useCopyrightFreeOverlayStore = create<CopyrightFreeOverlayState>(
  (set, get) => ({
    surface: "mini",
    visible: false,
    song: null,
    songs: [],
    initialAction: null,
    open: (song, opts) => set((state) => asFull(song, opts, state.songs)),
    minimize: () =>
      set({ surface: "mini", visible: false, initialAction: null }),
    expand: () => {
      const { song } = get();
      if (!song) return;
      set({ surface: "full", visible: true, initialAction: null });
    },
    close: () => get().minimize(),
    reopen: () => get().expand(),
    warm: (song) =>
      set((state) => (state.song ? state : { ...state, song })),
    setSong: (song) => set({ song }),
    setQueue: (songs) => set({ songs }),
  })
);
