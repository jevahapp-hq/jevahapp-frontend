/**
 * Upload video tile — a still from the selected clip, never the cover photo.
 * A live VideoView here plus the feed plus multipart upload OOMs 2GB devices.
 */
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { captureUploadVideoPreview } from "../utils/captureUploadVideoPreview";

type Props = {
  uri: string;
  fileName?: string;
  guidelineError?: string | null;
  /** False while posting so the frame-grab player is released. */
  active?: boolean;
};

export function MediaVideoPreview(props: Props) {
  const uri = props.uri;
  const fileName = props.fileName;
  const guidelineError = props.guidelineError;
  const active = props.active !== false;

  if (guidelineError) {
    return (
      <View style={styles.errorPoster} accessibilityRole="alert">
        <Feather name="alert-circle" size={22} color="#B45309" />
        <Text style={styles.errorTitle}>Doesn't meet guidelines</Text>
        <Text style={styles.errorBody} numberOfLines={5}>
          {guidelineError}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      {active ? <UploadVideoStill uri={uri} fileName={fileName} /> : null}
      <View style={styles.badge}>
        <Feather name="video" size={11} color="#FFFFFF" />
        <Text style={styles.badgeText}>Video</Text>
      </View>
    </View>
  );
}

function UploadVideoStill({ uri, fileName }: { uri: string; fileName?: string }) {
  const [source, setSource] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setSource(null);
    setLoading(true);

    void captureUploadVideoPreview(uri).then((thumb) => {
      if (cancelled) return;
      setSource(thumb);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (source) {
    return (
      <Image
        source={source as never}
        style={styles.fill}
        contentFit="cover"
      />
    );
  }

  const label = fileName?.trim()
    ? fileName.replace(/^.*[\\/]/, "")
    : "Video selected";

  return (
    <View style={styles.fallback}>
      {loading ? (
        <ActivityIndicator color="#F9FAFB" />
      ) : (
        <Feather name="video" size={28} color="#F9FAFB" />
      )}
      <Text style={styles.caption} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
    paddingHorizontal: 10,
  },
  caption: {
    marginTop: 8,
    color: "#F9FAFB",
    fontSize: 11,
    textAlign: "center",
    fontFamily: "PlusJakartaSans-SemiBold",
  },
  badge: {
    position: "absolute",
    left: 8,
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.62)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "PlusJakartaSans-SemiBold",
  },
  errorPoster: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 10,
  },
  errorTitle: {
    marginTop: 8,
    color: "#9A3412",
    fontSize: 12,
    textAlign: "center",
    fontFamily: "PlusJakartaSans-SemiBold",
  },
  errorBody: {
    marginTop: 6,
    color: "#B45309",
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center",
    fontFamily: "PlusJakartaSans-Regular",
  },
});
