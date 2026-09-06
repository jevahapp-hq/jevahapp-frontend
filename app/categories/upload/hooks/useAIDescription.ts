/**
 * AI description generation hook
 */

import { useState } from "react";
import { Alert } from "react-native";
import { generateDescription } from "../api/generateDescription";
import type { MediaFile } from "../types";

type UseAIDescriptionParams = {
  title: string;
  selectedType: string;
  selectedCategory: string;
  file: MediaFile | null;
  thumbnail: MediaFile | null;
  setDescription: (value: string) => void;
};

export function useAIDescription({
  title,
  selectedType,
  selectedCategory,
  file,
  thumbnail,
  setDescription,
}: UseAIDescriptionParams) {
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [descriptionGenerationError, setDescriptionGenerationError] = useState<
    string | null
  >(null);
  const [bibleVerses, setBibleVerses] = useState<string[]>([]);

  const generateAIDescription = async () => {
    console.log("🔵 Generate AI Description clicked", {
      title,
      file: !!file,
      thumbnail: !!thumbnail,
    });

    if (!title || title.trim().length === 0) {
      Alert.alert(
        "Title Required",
        "Please enter a title before generating a description.",
        [{ text: "OK" }]
      );
      return;
    }

    if (!file) {
      Alert.alert(
        "File Required",
        "Please upload a video or audio file for AI analysis.",
        [{ text: "OK" }]
      );
      return;
    }

    setIsGeneratingDescription(true);
    setDescriptionGenerationError(null);
    setBibleVerses([]);

    try {
      const data = await generateDescription({
        title,
        selectedType,
        selectedCategory,
        file,
        thumbnail,
      });

      if (data.success && data.description) {
        setDescription(data.description);

        if (
          data.bibleVerses &&
          Array.isArray(data.bibleVerses) &&
          data.bibleVerses.length > 0
        ) {
          setBibleVerses(data.bibleVerses);
        }

        if (data.warning) {
          setDescriptionGenerationError(
            data.message || "Description generated with limitations"
          );
          setTimeout(() => setDescriptionGenerationError(null), 5000);
        } else {
          setDescriptionGenerationError(null);
        }
      } else {
        setDescriptionGenerationError(
          data.message || "Failed to generate description. Please try again."
        );
        setTimeout(() => setDescriptionGenerationError(null), 5000);
      }
    } catch (error: any) {
      console.error("Error generating description:", error);

      if (error.response?.status === 429) {
        setDescriptionGenerationError(
          "Too many requests. Please wait a minute before trying again."
        );
      } else if (error.response?.status === 400) {
        setDescriptionGenerationError(
          error.response.data?.message ||
            "Invalid request. Please check your inputs."
        );
      } else if (error.message?.includes("Network")) {
        setDescriptionGenerationError(
          "Network error. Please check your connection and try again."
        );
      } else {
        setDescriptionGenerationError(
          "Failed to generate description. Please try again."
        );
      }
      setTimeout(() => setDescriptionGenerationError(null), 5000);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  return {
    isGeneratingDescription,
    descriptionGenerationError,
    bibleVerses,
    generateAIDescription,
  };
}
