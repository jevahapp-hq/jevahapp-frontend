/**
 * Isolated video tile — keeps expo-video out of the Upload cold path.
 */
import { useVideoPlayer, VideoView } from "expo-video";
import { StyleSheet } from "react-native";

type Props = {
  uri: string;
};

export function MediaVideoPreview({ uri }: Props) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = false;
  });

  return (
    <VideoView
      player={player}
      contentFit="cover"
      nativeControls
      allowsFullscreen={false}
      style={styles.fill}
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    width: "100%",
    height: "100%",
  },
});
