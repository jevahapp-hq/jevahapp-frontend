/**
 * Core upload form state + local eligibility helpers
 */

import { useCallback, useEffect, useState } from "react";
import { Dimensions } from "react-native";
import { getOrientation } from "../../../../utils/responsive";
import { detectFileType, validateMediaEligibility } from "../utils";
import type {
  DetectedFileType,
  EligibilityStatus,
  MediaFile,
  ModerationError,
  UploadResultState,
  UploadState,
} from "../types";

type EligibilityOverrides = {
  file?: MediaFile | null;
  title?: string;
  selectedCategory?: string;
  selectedType?: string;
};

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
  const [uploadResult, setUploadResult] = useState<UploadResultState | null>(
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

  const validateMediaEligibilityLocal = useCallback(
    (overrides?: EligibilityOverrides): EligibilityStatus => {
      const nextFile = overrides?.file !== undefined ? overrides.file : file;
      const nextTitle =
        overrides?.title !== undefined ? overrides.title : title;
      const nextCategory =
        overrides?.selectedCategory !== undefined
          ? overrides.selectedCategory
          : selectedCategory;
      const nextType =
        overrides?.selectedType !== undefined
          ? overrides.selectedType
          : selectedType;

      const result = validateMediaEligibility({
        file: nextFile,
        title: nextTitle,
        selectedCategory: nextCategory,
        selectedType: nextType,
      });

      const warnings = [...result.warnings];
      if (nextFile) {
        const actualFileType = detectFileType(nextFile);
        if (
          !thumbnail &&
          (nextType === "music" ||
            nextType === "videos" ||
            nextType === "podcasts" ||
            (nextType === "sermon" && actualFileType === "video"))
        ) {
          warnings.push("Cover photo recommended for better visibility");
        }
      }
      if (description && description.length > 500) {
        warnings.push("Description should be 500 characters or less");
      }

      return {
        ...result,
        warnings,
      };
    },
    [file, title, selectedCategory, selectedType, thumbnail, description]
  );

  // Live checklist (IG/TikTok style) — always validate against latest state
  useEffect(() => {
    if (!file && !title && !selectedCategory && !selectedType) {
      setEligibilityStatus(null);
      return;
    }
    setEligibilityStatus(validateMediaEligibilityLocal());
  }, [
    file,
    title,
    selectedCategory,
    selectedType,
    thumbnail,
    description,
    validateMediaEligibilityLocal,
  ]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSelectedCategory("");
    setSelectedType("");
    setIsSermonContent(false);
    setFile(null);
    setThumbnail(null);
    setModerationError(null);
    setUploadResult(null);
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
    uploadResult,
    setUploadResult,
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
