/**
 * Document / image pickers for media + thumbnail
 */

import { Alert } from "react-native";
import { detectFileType, getMimeTypeFromName, isGifFile, isImage } from "../utils";
import {
  alertUploadGuidelineIssues,
  collectDeviceGuidelineErrors,
} from "../utils/uploadGuidelineAlert";
import { probeVideoDurationSec } from "../utils/probeVideoDuration";
import type { DetectedFileType, EligibilityStatus, MediaFile } from "../types";
import { shouldProbeUploadDuration } from "../../../../src/shared/lite/liteProfile";

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

function normalizePickerDurationSec(duration: unknown): number | undefined {
  if (typeof duration !== "number" || duration <= 0) return undefined;
  return duration > 100 ? duration / 1000 : duration;
}

function documentPickerTypes(selectedType: string): string[] {
  if (selectedType === "music" || selectedType === "podcasts") {
    return [
      "audio/mpeg",
      "audio/mp4",
      "audio/wav",
      "audio/x-m4a",
      "audio/aac",
      "audio/ogg",
      "audio/flac",
    ];
  }
  if (selectedType === "books" || selectedType === "ebook") {
    return ["application/pdf", "application/epub+zip"];
  }
  return [
    "video/mp4",
    "video/*",
    "audio/mpeg",
    "application/pdf",
    "application/epub+zip",
    "image/gif",
  ];
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
  const commitPickedFile = (selectedFile: MediaFile) => {
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

    alertUploadGuidelineIssues(
      collectDeviceGuidelineErrors(selectedFile, nextType)
    );
  };

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
          normalizePickerDurationSec(asset.duration) ??
          (shouldProbeUploadDuration()
            ? await probeVideoDurationSec(asset.uri)
            : undefined);
        if (durationSec && durationSec > 8.5) {
          Alert.alert(
            "Doesn't meet upload guidelines",
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
      alertUploadGuidelineIssues(
        collectDeviceGuidelineErrors(selectedFile, "gif")
      );
    } catch (e) {
      console.error("Error picking GIF:", e);
      Alert.alert("Error", "Could not pick that GIF.");
    }
  };

  const pickVideoFromLibrary = async () => {
    try {
      const ImagePicker = await loadImagePicker();
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Allow photo library access to select a video."
        );
        return;
      }

      const mediaTypes =
        ImagePicker.MediaTypeOptions?.Videos ?? ["videos"];

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsEditing: false,
        quality: 1,
        // iPhone camera roll is often HEVC/MOV — request a compatible MP4.
        preferredAssetRepresentationMode: "compatible",
      } as Parameters<typeof ImagePicker.launchImageLibraryAsync>[0]);

      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const name =
        asset.fileName ||
        `video_${Date.now()}.${
          asset.mimeType === "video/quicktime" ? "mov" : "mp4"
        }`;
      const guessedMime =
        asset.mimeType || getMimeTypeFromName(name) || "video/mp4";
      const isVideoAsset =
        asset.type === "video" || guessedMime.startsWith("video/");

      if (asset.type === "image" && !isGifFile(name, guessedMime) && !isVideoAsset) {
        Alert.alert(
          "Doesn't meet upload guidelines",
          "Photos are not allowed. Please select a video in MP4 format."
        );
        return;
      }

      const selectedFile: MediaFile = {
        uri: asset.uri,
        name,
        mimeType: isVideoAsset
          ? guessedMime.startsWith("video/")
            ? guessedMime
            : "video/mp4"
          : guessedMime,
        size: asset.fileSize,
      };

      const durationSec =
        normalizePickerDurationSec(asset.duration) ??
        (guessedMime.startsWith("video/") && shouldProbeUploadDuration()
          ? await probeVideoDurationSec(asset.uri)
          : undefined);
      if (durationSec && durationSec > 0) {
        selectedFile.durationSec = durationSec;
      }

      commitPickedFile(selectedFile);
    } catch (e) {
      console.error("Error picking video:", e);
      Alert.alert("Error", "Could not select that video. Please try again.");
    }
  };

  const pickDocument = async () => {
    try {
      const DocumentPicker = await loadDocumentPicker();
      const result = await DocumentPicker.getDocumentAsync({
        type: documentPickerTypes(selectedType),
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const { name, uri, mimeType } = result.assets[0];
      const guessedMime = mimeType || getMimeTypeFromName(name);

      if (isImage(name) && !isGifFile(name, guessedMime)) {
        Alert.alert(
          "Doesn't meet upload guidelines",
          "Photos/images are not allowed. Use GIF for animated clips, or pick a video."
        );
        return;
      }

      const selectedFile: MediaFile = {
        uri,
        name,
        mimeType: guessedMime,
        size: result.assets[0].size,
      };

      if (guessedMime.startsWith("video/") && shouldProbeUploadDuration()) {
        const durationSec = await probeVideoDurationSec(uri);
        if (durationSec && durationSec > 0) {
          selectedFile.durationSec = durationSec;
        }
        if (selectedType === "gif" && durationSec && durationSec > 8.5) {
          Alert.alert(
            "Doesn't meet upload guidelines",
            "GIFs should be 8 seconds or shorter. Trim the clip and try again."
          );
          return;
        }
      }

      commitPickedFile(selectedFile);
    } catch (e) {
      console.error("Error picking media:", e);
      Alert.alert("Error", "Could not select that file. Please try again.");
    }
  };

  const pickMedia = async () => {
    if (selectedType === "gif") {
      await pickGif();
      return;
    }
    const useVideoLibrary =
      selectedType === "videos" ||
      selectedType === "sermon" ||
      selectedType === "";
    if (useVideoLibrary) {
      await pickVideoFromLibrary();
      return;
    }
    await pickDocument();
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
