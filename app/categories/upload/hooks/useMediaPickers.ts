/**
 * Document / image pickers for media + thumbnail
 */

import { Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { detectFileType, getMimeTypeFromName, isImage } from "../utils";
import { probeVideoDurationSec } from "../utils/probeVideoDuration";
import type { DetectedFileType, EligibilityStatus, MediaFile } from "../types";

type UseMediaPickersParams = {
  title: string;
  selectedCategory: string;
  selectedType: string;
  setFile: (file: MediaFile | null) => void;
  setDetectedFileType: (type: DetectedFileType) => void;
  setThumbnail: (thumb: MediaFile | null) => void;
  setSelectedType: (type: string) => void;
  setIsSermonContent: (v: boolean) => void;
  setEligibilityStatus: (status: EligibilityStatus | null) => void;
  validateMediaEligibilityLocal: (overrides?: {
    file?: MediaFile | null;
    title?: string;
    selectedCategory?: string;
    selectedType?: string;
  }) => EligibilityStatus;
};

/** Suggest content type from detected media (creator can still change it). */
function suggestContentType(
  detected: DetectedFileType,
  current: string
): string | null {
  if (current === "sermon") return null; // keep intentional sermon choice
  if (detected === "video" && current !== "videos") return "videos";
  if (detected === "audio" && current !== "music" && current !== "podcasts") {
    return "music";
  }
  if (
    detected === "ebook" &&
    current !== "books" &&
    current !== "ebook"
  ) {
    return "books";
  }
  return null;
}

export function useMediaPickers({
  title,
  selectedCategory,
  selectedType,
  setFile,
  setDetectedFileType,
  setThumbnail,
  setSelectedType,
  setIsSermonContent,
  setEligibilityStatus,
  validateMediaEligibilityLocal,
}: UseMediaPickersParams) {
  const pickMedia = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "video/mp4",
        "audio/mpeg",
        "application/pdf",
        "application/epub+zip",
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return;

    const { name, uri, mimeType } = result.assets[0];

    const guessedMime = mimeType || getMimeTypeFromName(name);

    if (isImage(name)) {
      Alert.alert("Unsupported File", "Photos/images are not allowed.");
      return;
    }

    if (guessedMime === "video/quicktime") {
      Alert.alert(
        "Unsupported Format",
        "MOV videos are not supported. Please upload an MP4 video."
      );
      return;
    }

    const fileSize = result.assets[0].size;

    const selectedFile: MediaFile = {
      uri,
      name,
      mimeType: guessedMime,
      size: fileSize,
    };

    if (guessedMime.startsWith("video/")) {
      const durationSec = await probeVideoDurationSec(uri);
      if (durationSec && durationSec > 0) {
        selectedFile.durationSec = durationSec;
      }
    }

    setFile(selectedFile);
    const detectedType = detectFileType(selectedFile);
    setDetectedFileType(detectedType);

    const suggested = suggestContentType(detectedType, selectedType);
    const nextType = suggested || selectedType;
    if (suggested) {
      setSelectedType(suggested);
      setIsSermonContent(false);
    }

    setEligibilityStatus(
      validateMediaEligibilityLocal({
        file: selectedFile,
        selectedType: nextType,
        title,
        selectedCategory,
      })
    );
  };

  const pickThumbnail = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Please allow access to photo library to select a cover photo."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setThumbnail({
          uri: asset.uri,
          name: `thumbnail_${Date.now()}.jpg`,
          mimeType: "image/jpeg",
        });
      }
    } catch (error) {
      console.error("Error picking thumbnail:", error);
      Alert.alert("Error", "Failed to select cover photo.");
    }
  };

  return { pickMedia, pickThumbnail };
}
