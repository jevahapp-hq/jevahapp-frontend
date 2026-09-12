/**
 * Media (left) + cover thumbnail (right) — always side-by-side flex.
 * Video tile shows the selected clip (or a guideline error), never the cover.
 */

import { Feather } from "@expo/vector-icons";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  getResponsiveFontSize,
  getResponsiveSize,
  getResponsiveSpacing,
} from "../../../../utils/responsive";
import type { MediaFile } from "../types";
import { isVideoMediaFile } from "../utils/fileTypeDetection";
import { collectDeviceGuidelineErrors } from "../utils/uploadGuidelineAlert";
import { MediaVideoPreview } from "./MediaVideoPreview";

type MediaPickersProps = {
  file: MediaFile | null;
  thumbnail: MediaFile | null;
  selectedType: string;
  orientation: "portrait" | "landscape";
  onPickMedia: () => void;
  onPickThumbnail: () => void;
  previewActive: boolean;
};

export function MediaPickers(props: MediaPickersProps) {
  const file = props.file;
  const thumbnail = props.thumbnail;
  const selectedType = props.selectedType;
  const onPickMedia = props.onPickMedia;
  const onPickThumbnail = props.onPickThumbnail;
  const previewActive = props.previewActive;
  const pad = getResponsiveSpacing(16, 20, 24, 32);
  const gap = getResponsiveSpacing(12, 16, 20, 24);
  const iconSize = getResponsiveSize(26, 30, 34);
  const labelSize = getResponsiveFontSize(11, 12, 13);
  const isVideo = isVideoMediaFile(file);
  const guidelineError = file
    ? collectDeviceGuidelineErrors(file, selectedType)[0] || null
    : null;

  return (
    <View style={[styles.row, { paddingHorizontal: pad, gap }]}>
      <TouchableOpacity
        onPress={onPickMedia}
        style={styles.tile}
        activeOpacity={0.8}
        accessibilityLabel="Select media"
      >
        {!file ? (
          <View style={styles.placeholder}>
            <Feather name="plus" size={iconSize} color="#6B7280" />
            <Text style={[styles.label, { fontSize: labelSize }]}>
              Select Media
            </Text>
          </View>
        ) : isVideo || guidelineError ? (
          <MediaVideoPreview
            uri={file.uri}
            fileName={file.name}
            guidelineError={guidelineError}
            active={previewActive && !guidelineError}
          />
        ) : (
          <Image
            source={{ uri: file.uri }}
            style={styles.fill}
            resizeMode="cover"
          />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onPickThumbnail}
        style={[styles.tile, styles.thumbTile]}
        activeOpacity={0.8}
        accessibilityLabel="Select cover photo (optional)"
      >
        {!thumbnail ? (
          <View style={styles.placeholder}>
            <Feather name="image" size={iconSize} color="#6B7280" />
            <Text style={[styles.label, { fontSize: labelSize }]}>
              Cover (optional)
            </Text>
          </View>
        ) : (
          <Image
            source={{ uri: thumbnail.uri || undefined }}
            style={styles.fill}
            resizeMode="cover"
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
  },
  tile: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: "50%",
    backgroundColor: "#E5E7EB",
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbTile: {
    backgroundColor: "#F3F4F6",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  label: {
    color: "#4B5563",
    textAlign: "center",
    marginTop: 8,
    fontFamily: "PlusJakartaSans-SemiBold",
  },
  fill: {
    width: "100%",
    height: "100%",
  },
});
