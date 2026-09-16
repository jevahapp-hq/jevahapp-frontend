export type SongItemProps = {
  item: any;
  onOpenPlayer: (item: any) => void;
  onPlayPress: (item: any) => Promise<void>;
  onOpenOptions?: (item: any) => void;
  onOpenArtistProfile?: (slug?: string) => void;
  screenWidth?: number;
};

/** Equal left/right inset for grid and small tiles. */
export const MUSIC_TILE_PAD = 16;
/** Space between tiles in a row. */
export const MUSIC_TILE_GAP = 12;

export function musicTileWidth(screenWidth: number, columns: 2 | 3): number {
  const gaps = MUSIC_TILE_GAP * (columns - 1);
  return (screenWidth - MUSIC_TILE_PAD * 2 - gaps) / columns;
}

export function getThumbnailSource(thumbnailUrl: any) {
  return typeof thumbnailUrl === "string"
    ? { uri: thumbnailUrl }
    : thumbnailUrl;
}
