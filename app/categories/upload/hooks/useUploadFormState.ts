/**
 * Core upload form state + local eligibility helpers
 */

import { useEffect, useState } from "react";
import { Dimensions } from "react-native";
import { getOrientation } from "../../../../utils/responsive";
import { detectFileType, validateMediaEligibility } from "../utils";
import type {
  DetectedFileType,
  EligibilityStatus,
  MediaFile,
  ModerationError,
  UploadState,
} from "../types";

export function useUploadFormState() {
  const [file, setFile] = useState<MediaFile | null>(null);
  const [thumbnail, setThumbnail] = useState<MediaFile | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [isSermonContent, setIsSermonContent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    progress: 0,
    message: "",
  });
  const [moderationError, setModerationError] = useState<ModerationError | null>(
    null
  );
  const [eligibilityStatus, setEligibilityStatus] =
    useState<EligibilityStatus | null>(null);
  const [detectedFileType, setDetectedFileType] =
    useState<DetectedFileType>("unknown");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    getOrientation()
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      const newOrientation =
        window.width > window.height ? "landscape" : "portrait";
      setOrientation(newOrientation);
    });

    return () => subscription?.remove();
  }, []);

  const validateMediaEligibilityLocal = (): EligibilityStatus => {
    const result = validateMediaEligibility({
      file,
      title,
      selectedCategory,
      selectedType,
    });

    const warnings = [...result.warnings];
    if (file) {
      const actualFileType = detectFileType(file);
      if (
        !thumbnail &&
        (selectedType === "music" ||
          selectedType === "videos" ||
          selectedType === "podcasts" ||
          (selectedType === "sermon" && actualFileType === "video"))
      ) {
        warnings.push("Thumbnail recommended for better visibility");
      }
    }
    if (description && description.length > 500) {
      warnings.push("Description should be 500 characters or less");
    }

    return {
      ...result,
      warnings,
    };
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSelectedCategory("");
    setSelectedType("");
    setIsSermonContent(false);
    setFile(null);
    setThumbnail(null);
    setModerationError(null);
    setEligibilityStatus(null);
    setUploadState({ status: "idle", progress: 0, message: "" });
  };

  return {
    file,
    setFile,
    thumbnail,
    setThumbnail,
    title,
    setTitle,
    description,
    setDescription,
    selectedCategory,
    setSelectedCategory,
    selectedType,
    setSelectedType,
    isSermonContent,
    setIsSermonContent,
    loading,
    setLoading,
    uploadState,
    setUploadState,
    moderationError,
    setModerationError,
    eligibilityStatus,
    setEligibilityStatus,
    detectedFileType,
    setDetectedFileType,
    orientation,
    validateMediaEligibilityLocal,
    resetForm,
  };
}

export type UploadFormState = ReturnType<typeof useUploadFormState>;
