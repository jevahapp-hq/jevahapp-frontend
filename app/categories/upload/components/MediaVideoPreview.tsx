/**
 * Poster only — never a decoder. A live VideoView here plus the feed
 * plus a multipart upload OOMs 2GB devices at Post.
 */
import { Feather } from "@expo/vector-icons";
import { Image, StyleSheet, View } from "react-native";

type Props = {
  uri: string;
  coverUri?: string | null;
};

export function MediaVideoPreview({ coverUri }: Props) {
  if (coverUri) {
    return (
      <Image
        source={{ uri: coverUri }}
        style={styles.fill}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={styles.poster}>
      <Feather name="video" size={28} color="#6B7280" />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    width: "100%",
    height: "100%",
  },
  poster: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },
});
