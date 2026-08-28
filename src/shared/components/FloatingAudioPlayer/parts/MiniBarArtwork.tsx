import React from "react";
import { Image, View } from "react-native";
import { resolveAlbumArtSource } from "../../../brand/albumArt";
import { floatingMiniBarStyles as styles } from "../floatingMiniBarStyles";

type Props = {
  thumbnailUrl: string | number;
};

/** Renders the image only; the pressable parent owns the sized container. */
export const MiniBarArtwork = React.memo(function MiniBarArtwork({
  thumbnailUrl,
}: Props) {
  return (
    <>
      <Image
        source={resolveAlbumArtSource(thumbnailUrl)}
        style={styles.artwork}
        resizeMode="cover"
      />
      <View style={styles.artworkRing} pointerEvents="none" />
    </>
  );
});
