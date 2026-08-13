/**
 * Document / image pickers for media + thumbnail
 */

import { Alert } from "react-native";
import { detectFileType, getMimeTypeFromName, isGifFile, isImage } from "../utils";
import { probeVideoDurationSec } from "../utils/probeVideoDuration";
import type { DetectedFileType, EligibilityStatus, MediaFile } from "../types";

/** Lazy native modules — kept off Upload first paint; warmed via prefetchCreateFlows. */
async function loadImagePicker() {
  return import("expo-image-picker");
}
async function loadDocumentPicker() {
  return import("expo-document-picker");
}

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
  if (detected === "gif" && current !== "gif") return "gif";
  if (detected === "video" && current !== "videos" && current !== "gif") return "videos";
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
  const pickGif = async () => {
    try {
      const ImagePicker = await loadImagePicker();
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Allow photo library access to pick a GIF or a short clip."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1,
        videoMaxDuration: 8,
      });

      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const name =
        asset.fileName ||
        `gif_${Date.now()}.${asset.type === "video" ? "mp4" : "gif"}`;
      const guessedMime =
        asset.mimeType || getMimeTypeFromName(name) || "image/gif";
      const gifFile = isGifFile(name, guessedMime);
      const isVideo =
        asset.type === "video" || guessedMime.startsWith("video/");

      if (!gifFile && !isVideo) {
        Alert.alert(
          "GIF",
          "Pick an animated GIF, or a short video (up to 8 seconds)."
        );
        return;
      }

      const selectedFile: MediaFile = {
        uri: asset.uri,
        name,
        mimeType: gifFile ? "image/gif" : guessedMime,
        size: asset.fileSize,
      };

      if (isVideo) {
        const durationSec =
          typeof asset.duration === "number" && asset.duration > 0
            ? asset.duration > 100
              ? asset.duration / 1000
              : asset.duration
            : await probeVideoDurationSec(asset.uri);
        if (durationSec && durationSec > 8.5) {
          Alert.alert(
            "Clip too long",
            "GIFs should be 8 seconds or shorter. Trim the clip and try again."
          );
          return;
        }
        if (durationSec && durationSec > 0) {
          selectedFile.durationSec = durationSec;
        }
      }

      setFile(selectedFile);
      setDetectedFileType(detectFileType(selectedFile));
      setSelectedType("gif");
      setIsSermonContent(false);
      setEligibilityStatus(
        validateMediaEligibilityLocal({
          file: selectedFile,
          selectedType: "gif",
          title,
          selectedCategory,
        })
      );
    } catch (e) {
      console.error("Error picking GIF:", e);
      Alert.alert("Error", "Could not pick that GIF.");
    }
  };

  const pickMedia = async () => {
    if (selectedType === "gif") {
      await pickGif();
      return;
    }
    const DocumentPicker = await loadDocumentPicker();
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "video/mp4",
        "audio/mpeg",
        "application/pdf",
        "application/epub+zip",
        "image/gif",
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return;

    const { name, uri, mimeType } = result.assets[0];

    const guessedMime = mimeType || getMimeTypeFromName(name);

    if (isImage(name) && !isGifFile(name, guessedMime)) {
      Alert.alert("Unsupported File", "Photos/images are not allowed. Use GIF for animated clips.");
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
      if (selectedType === "gif" && durationSec && durationSec > 8.5) {
        Alert.alert(
          "Clip too long",
          "GIFs should be 8 seconds or shorter. Trim the clip and try again."
        );
        return;
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
      const ImagePicker = await loadImagePicker();
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
