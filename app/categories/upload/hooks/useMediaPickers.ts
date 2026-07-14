/**
 * Document / image pickers for media + thumbnail
 */

import { Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { detectFileType, getMimeTypeFromName, isImage } from "../utils";
import type { DetectedFileType, EligibilityStatus, MediaFile } from "../types";

type UseMediaPickersParams = {
  title: string;
  selectedCategory: string;
  selectedType: string;
  setFile: (file: MediaFile | null) => void;
  setDetectedFileType: (type: DetectedFileType) => void;
  setThumbnail: (thumb: MediaFile | null) => void;
  setEligibilityStatus: (status: EligibilityStatus | null) => void;
  validateMediaEligibilityLocal: () => EligibilityStatus;
};

export function useMediaPickers({
  title,
  selectedCategory,
  selectedType,
  setFile,
  setDetectedFileType,
  setThumbnail,
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
    console.log("📁 File selected:", {
      name,
      mimeType: guessedMime,
      size: fileSize,
      hasSize: !!fileSize,
      uri: uri?.substring(0, 50) + "...",
    });

    const selectedFile: MediaFile = {
      uri,
      name,
      mimeType: guessedMime,
      size: fileSize,
    };

    setFile(selectedFile);
    const detectedType = detectFileType(selectedFile);
    setDetectedFileType(detectedType);

    if (title && selectedCategory && selectedType) {
      const validation = validateMediaEligibilityLocal();
      setEligibilityStatus(validation);
    }
  };

  const pickThumbnail = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Please allow access to photo library to select thumbnail."
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
      Alert.alert("Error", "Failed to select thumbnail image.");
    }
  };

  return { pickMedia, pickThumbnail };
}
