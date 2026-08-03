export type SongItemProps = {
  item: any;
  onOpenPlayer: (item: any) => void;
  onPlayPress: (item: any) => Promise<void>;
  onOpenOptions?: (item: any) => void;
  onOpenArtistProfile?: (slug?: string) => void;
  screenWidth?: number;
};

export function getThumbnailSource(thumbnailUrl: any) {
  return typeof thumbnailUrl === "string"
    ? { uri: thumbnailUrl }
    : thumbnailUrl;
}
