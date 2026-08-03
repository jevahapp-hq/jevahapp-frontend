import type { DisplayMode } from "../../types";
import { SongGridItem } from "./SongGridItem";
import { SongLargeItem } from "./SongLargeItem";
import { SongListItem } from "./SongListItem";
import { SongSmallItem } from "./SongSmallItem";
import type { SongItemProps } from "./songItemShared";

type RenderSongItemArgs = SongItemProps & {
  displayMode: DisplayMode;
};

/**
 * Render songs based on display mode
 */
export function renderSongItem({
  item,
  displayMode,
  onOpenPlayer,
  onPlayPress,
  onOpenOptions,
  onOpenArtistProfile,
  screenWidth,
}: RenderSongItemArgs) {
  const shared: SongItemProps = {
    item,
    onOpenPlayer,
    onPlayPress,
    onOpenOptions,
    onOpenArtistProfile,
    screenWidth,
  };

  switch (displayMode) {
    case "list":
      return <SongListItem {...shared} />;
    case "grid":
      return <SongGridItem {...shared} />;
    case "small":
      return <SongSmallItem {...shared} />;
    case "large":
      return <SongLargeItem {...shared} />;
    default:
      return <SongListItem {...shared} />;
  }
}

export { SongGridItem } from "./SongGridItem";
export { SongLargeItem } from "./SongLargeItem";
export { SongListItem } from "./SongListItem";
export { SongSmallItem } from "./SongSmallItem";
export type { SongItemProps } from "./songItemShared";
export { getThumbnailSource } from "./songItemShared";
