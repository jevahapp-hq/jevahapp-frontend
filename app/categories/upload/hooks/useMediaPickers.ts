/**
 * Document / image pickers for media + thumbnail
 */

import { Alert, Platform } from "react-native";
import { detectFileType, getMimeTypeFromName, isGifFile, isImage } from "../utils";
import {
  alertUploadGuidelineIssues,
  collectDeviceGuidelineErrors,
} from "../utils/uploadGuidelineAlert";
import { probeVideoDurationSec } from "../utils/probeVideoDuration";
import type { DetectedFileType, EligibilityStatus, MediaFile } from "../types";
import {
  THUMBNAIL_ASPECTS,
  thumbnailAspectById,
  thumbnailCropRect,
  thumbnailMatchesAspect,
  type ThumbnailAspectId,
} from "../utils/thumbnailAspect";
import { shouldProbeUploadDuration } from "../../../../src/shared/lite/liteProfile";
import { asUploadableVideoFile } from "../utils/asUploadableVideoFile";

/** Lazy native modules — kept off Upload first paint; warmed via prefetchCreateFlows. */
async function loadImagePicker() {
  return import("expo-image-picker");
}
async function loadDocumentPicker() {
  return import("expo-document-picker");
}

void loadImagePicker().catch(() => undefined);

/**
 * On iPhone, asking for photo access before the library opens can sit for
 * minutes while Photos prepares a large iCloud library. The system picker
 * can show the library without that call.
 */
async function libraryPermissionGranted(
  ImagePicker: {
    requestMediaLibraryPermissionsAsync: () => Promise<{ status: string }>;
  },
  message: string
): Promise<boolean> {
  if (Platform.OS === "ios") return true;
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission needed", message);
    return false;
  }
  return true;
}

async function cropCoverFile(
  uri: string,
  width: number,
  height: number,
  aspectId: ThumbnailAspectId
): Promise<{ uri: string; width: number; height: number } | null> {
  const rect = thumbnailCropRect(width, height, aspectId);
  if (!rect) return null;
  const alreadyFits =
    rect.originX === 0 &&
    rect.originY === 0 &&
    rect.width === Math.round(width) &&
    rect.height === Math.round(height);
  if (alreadyFits) {
    return { uri, width: rect.width, height: rect.height };
  }
  const { manipulateAsync, SaveFormat } = await import("expo-image-manipulator");
  const cropped = await manipulateAsync(uri, [{ crop: rect }], {
    compress: 0.8,
    format: SaveFormat.JPEG,
  });
  return {
    uri: cropped.uri,
    width: cropped.width,
    height: cropped.height,
  };
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
    selectedFile = asUploadableVideoFile(selectedFile);
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
      const allowed = await libraryPermissionGranted(
        ImagePicker,
        "Allow photo library access to pick a GIF or a short clip."
      );
      if (!allowed) return;

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
      const allowed = await libraryPermissionGranted(
        ImagePicker,
        "Allow photo library access to select a video."
      );
      if (!allowed) return;

      const mediaTypes =
        ImagePicker.MediaTypeOptions?.Videos ?? ["videos"];

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsEditing: false,
        quality: 1,
        // Screen recordings are MOV (video/quicktime) and often huge.
        // Compatible + H.264 export hands back an MP4 the upload API accepts,
        // and brings long sermon clips under the size cap.
        preferredAssetRepresentationMode:
          Platform.OS === "ios" ? "compatible" : "current",
        ...(Platform.OS === "ios"
          ? { videoExportPreset: ImagePicker.VideoExportPreset.MediumQuality }
          : {}),
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

  const launchThumbnailCrop = async (aspectId: ThumbnailAspectId) => {
    try {
      const ImagePicker = await loadImagePicker();
      const allowed = await libraryPermissionGranted(
        ImagePicker,
        "Please allow access to photo library to select a cover photo."
      );
      if (!allowed) return;

      const aspect = thumbnailAspectById(aspectId);
      // allowsEditing opens the old iPhone library, which can take minutes
      // to show photos. Android can crop in the picker. iPhone crops after.
      const cropInPicker = Platform.OS !== "ios";
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: cropInPicker,
        aspect: [aspect.width, aspect.height],
        quality: cropInPicker ? 0.8 : 1,
        preferredAssetRepresentationMode: "current",
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let uri = asset.uri;
        let width = asset.width;
        let height = asset.height;
        if (
          cropInPicker &&
          !thumbnailMatchesAspect(width, height, aspectId)
        ) {
          Alert.alert(
            "Cover shape",
            "Use 1:1, 9:16, or 16:9. Choose a shape and crop again."
          );
          return;
        }
        if (
          !cropInPicker &&
          width &&
          height &&
          !thumbnailMatchesAspect(width, height, aspectId)
        ) {
          try {
            const cropped = await cropCoverFile(uri, width, height, aspectId);
            if (cropped) {
              uri = cropped.uri;
              width = cropped.width;
              height = cropped.height;
            }
          } catch (cropError) {
            console.warn("Cover crop failed:", cropError);
          }
        }
        setThumbnail({
          uri,
          name: `thumbnail_${Date.now()}.jpg`,
          mimeType: "image/jpeg",
          thumbnailAspect: aspectId,
          width,
          height,
        });
      }
    } catch (error) {
      console.error("Error picking thumbnail:", error);
      Alert.alert("Error", "Failed to select cover photo.");
    }
  };

  const pickThumbnail = () => {
    Alert.alert("Cover shape", "Choose 1:1, 9:16, or 16:9.", [
      ...THUMBNAIL_ASPECTS.map((aspect) => ({
        text: aspect.label,
        onPress: () => {
          void launchThumbnailCrop(aspect.id);
        },
      })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  };

  return { pickMedia, pickThumbnail };
}
