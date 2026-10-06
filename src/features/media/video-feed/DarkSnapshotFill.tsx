import { BlurTargetView, BlurView } from "expo-blur";
import { Image, type ImageSource } from "expo-image";
import { useRef } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

/**
 * The blurred copy behind a 9:16 frame. Android's image blur caps out, so the
 * snapshot is also passed through a real blur target and then covered with a
 * dark scrim. The sharp picture sits on top of this.
 */
export function DarkSnapshotFill({
  source,
  style,
}: {
  source: ImageSource;
  style?: StyleProp<ViewStyle>;
}) {
  const targetRef = useRef<View>(null);
  const image = (
    <Image
      source={source}
      style={styles.image}
      contentFit="cover"
      blurRadius={50}
      cachePolicy="memory-disk"
    />
  );
  // A Dimezis blur on every card in a scrolling feed exhausts Android memory
  // and Expo Go closes. The darkened image is the blur Android can keep up.
  if (Platform.OS === "android") {
    return (
      <View pointerEvents="none" style={[styles.fill, style]}>
        {image}
        <View pointerEvents="none" style={styles.scrim} />
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={[styles.fill, style]}>
      <BlurTargetView ref={targetRef} style={StyleSheet.absoluteFill}>
        {image}
      </BlurTargetView>
      <BlurView
        blurTarget={targetRef}
        blurMethod="dimezisBlurView"
        intensity={100}
        tint="dark"
        blurReductionFactor={1}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.scrim} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  image: {
    ...StyleSheet.absoluteFill,
    transform: [{ scale: 1.6 }],
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
});
