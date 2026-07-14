/**
 * Title, description, AI generate, categories, content types, eligibility
 */

import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getInputSize,
  getResponsiveFontSize,
  getResponsiveSpacing,
  getTouchTargetSize,
} from "../../../../utils/responsive";
import { categories, contentTypes } from "../constants";
import type {
  DetectedFileType,
  EligibilityStatus,
  MediaFile,
} from "../types";
import { CategoryTypeTags } from "./CategoryTypeTags";
import { EligibilityBanner } from "./EligibilityBanner";

type UploadFormFieldsProps = {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  file: MediaFile | null;
  thumbnail: MediaFile | null;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  selectedType: string;
  setSelectedType: (v: string) => void;
  setIsSermonContent: (v: boolean) => void;
  detectedFileType: DetectedFileType;
  eligibilityStatus: EligibilityStatus | null;
  setEligibilityStatus: (v: EligibilityStatus | null) => void;
  validateMediaEligibilityLocal: () => EligibilityStatus;
  isGeneratingDescription: boolean;
  descriptionGenerationError: string | null;
  bibleVerses: string[];
  onGenerateAIDescription: () => void;
};

export function UploadFormFields({
  title,
  setTitle,
  description,
  setDescription,
  file,
  thumbnail,
  selectedCategory,
  setSelectedCategory,
  selectedType,
  setSelectedType,
  setIsSermonContent,
  detectedFileType,
  eligibilityStatus,
  setEligibilityStatus,
  validateMediaEligibilityLocal,
  isGeneratingDescription,
  descriptionGenerationError,
  bibleVerses,
  onGenerateAIDescription,
}: UploadFormFieldsProps) {
  const revalidate = () => {
    setTimeout(() => {
      const validation = validateMediaEligibilityLocal();
      setEligibilityStatus(validation);
    }, 100);
  };

  const isReady = !!(title && file && thumbnail);
  const isDisabled = isGeneratingDescription || !isReady;

  return (
    <View className="flex-1">
      <Text className="text-xs text-gray-600 mb-1 font-medium">TITLE</Text>
      <TextInput
        placeholder="Enter title..."
        value={title}
        onChangeText={(text) => {
          setTitle(text);
          if (file && selectedCategory && selectedType) {
            revalidate();
          }
        }}
        multiline
        textAlignVertical="top"
        className="border border-gray-300 rounded-md mb-4 px-3 py-3 bg-white"
        style={{
          minHeight: getInputSize().height,
          maxHeight: 100,
          fontSize: getInputSize().fontSize,
        }}
      />

      <Text className="text-xs text-gray-600 mb-1 font-medium">DESCRIPTION</Text>
      <TextInput
        placeholder="Enter description..."
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
        className="border border-gray-300 rounded-md mb-2 px-3 py-3 bg-white"
        style={{
          minHeight: getResponsiveSpacing(80, 100, 120),
          maxHeight: 200,
          fontSize: getInputSize().fontSize,
        }}
      />

      {/* AI Description Generation Button */}
      <View className="mb-3" style={{ zIndex: 10 }}>
        <TouchableOpacity
          onPress={() => {
            console.log("🔵 Button pressed", {
              isGeneratingDescription,
              title: !!title,
              file: !!file,
              thumbnail: !!thumbnail,
              isReady,
            });
            onGenerateAIDescription();
          }}
          disabled={isDisabled}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            opacity: isDisabled ? 0.5 : 1,
          }}
        >
          <View
            className="flex-row items-center justify-center rounded-lg"
            style={{
              backgroundColor: isGeneratingDescription
                ? "rgba(223, 147, 14, 0.3)"
                : isReady
                  ? "rgba(223, 147, 14, 0.12)"
                  : "rgba(223, 147, 14, 0.08)",
              borderWidth: 1,
              borderColor: isGeneratingDescription
                ? "rgba(223, 147, 14, 0.4)"
                : isReady
                  ? "rgba(223, 147, 14, 0.3)"
                  : "rgba(223, 147, 14, 0.2)",
              paddingVertical: getResponsiveSpacing(10, 12, 14),
              paddingHorizontal: getResponsiveSpacing(16, 18, 20),
              minHeight: getTouchTargetSize(),
            }}
          >
            {isGeneratingDescription ? (
              <>
                <ActivityIndicator
                  size="small"
                  color="#DF930E"
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    fontSize: getResponsiveFontSize(13, 14, 15),
                    color: "#DF930E",
                    fontFamily: "Rubik-Medium",
                  }}
                >
                  Analyzing content...
                </Text>
              </>
            ) : !isReady ? (
              <>
                <Ionicons
                  name="sparkles-outline"
                  size={16}
                  color="#94a3b8"
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    fontSize: getResponsiveFontSize(13, 14, 15),
                    color: "#94a3b8",
                    fontFamily: "Rubik-Medium",
                  }}
                >
                  {!title
                    ? "Enter title to enable"
                    : !file
                      ? "Upload file to enable"
                      : "Upload thumbnail to enable"}
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="sparkles"
                  size={16}
                  color="#DF930E"
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    fontSize: getResponsiveFontSize(13, 14, 15),
                    color: "#DF930E",
                    fontFamily: "Rubik-Medium",
                  }}
                >
                  Generate Description with AI
                </Text>
              </>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {bibleVerses.length > 0 && (
        <View
          className="mb-3 p-3 rounded-lg"
          style={{
            backgroundColor: "rgba(223, 147, 14, 0.05)",
            borderLeftWidth: 3,
            borderLeftColor: "#DF930E",
          }}
        >
          <Text
            style={{
              fontSize: getResponsiveFontSize(11, 12, 13),
              color: "#475569",
              fontFamily: "Rubik-Medium",
              marginBottom: 6,
            }}
          >
            📖 Suggested Bible Verses:
          </Text>
          {bibleVerses.map((verse, index) => (
            <Text
              key={index}
              style={{
                fontSize: getResponsiveFontSize(11, 12, 13),
                color: "#64748b",
                fontFamily: "Rubik-Regular",
                marginLeft: 8,
                marginBottom: 4,
              }}
            >
              • {verse}
            </Text>
          ))}
        </View>
      )}

      {descriptionGenerationError && (
        <View
          className="mb-3 p-2.5 rounded-lg"
          style={{
            backgroundColor:
              descriptionGenerationError.includes("too large") ||
              descriptionGenerationError.includes("timed out") ||
              descriptionGenerationError.includes("limitations")
                ? "rgba(255, 193, 7, 0.1)"
                : "rgba(239, 68, 68, 0.1)",
            borderWidth: 1,
            borderColor:
              descriptionGenerationError.includes("too large") ||
              descriptionGenerationError.includes("timed out") ||
              descriptionGenerationError.includes("limitations")
                ? "rgba(255, 193, 7, 0.3)"
                : "rgba(239, 68, 68, 0.3)",
          }}
        >
          <Text
            style={{
              fontSize: getResponsiveFontSize(11, 12, 13),
              color:
                descriptionGenerationError.includes("too large") ||
                descriptionGenerationError.includes("timed out") ||
                descriptionGenerationError.includes("limitations")
                  ? "#92400e"
                  : "#991b1b",
              fontFamily: "Rubik-Regular",
            }}
          >
            {descriptionGenerationError.includes("too large") ||
            descriptionGenerationError.includes("timed out") ||
            descriptionGenerationError.includes("limitations")
              ? "⚠️ "
              : "❌ "}
            {descriptionGenerationError}
          </Text>
        </View>
      )}

      <Text className="text-xs text-gray-600 mb-2 font-medium">CATEGORY</Text>
      <View className="flex-row flex-wrap mb-4">
        <CategoryTypeTags
          items={categories.map((item) => ({ label: item, value: item }))}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          onAfterSelect={revalidate}
        />
      </View>

      <Text className="text-xs text-gray-600 mb-2 font-medium">
        CONTENT TYPE
      </Text>
      {file && (
        <Text
          className="text-[11px] text-gray-500 mb-1"
          style={{ fontSize: getResponsiveFontSize(10, 11, 12) }}
        >
          {detectedFileType === "video" && "Detected file: Video (e.g. MP4)"}
          {detectedFileType === "audio" &&
            "Detected file: Audio (e.g. MP3, WAV)"}
          {detectedFileType === "ebook" &&
            "Detected file: Document / Ebook (e.g. PDF, EPUB)"}
          {detectedFileType === "unknown" &&
            "File type not recognized yet. Please choose the correct content type."}
        </Text>
      )}
      <View className="flex-row flex-wrap mb-4">
        <CategoryTypeTags
          items={contentTypes}
          selected={selectedType}
          onSelect={setSelectedType}
          onSermonsChange={setIsSermonContent}
          onAfterSelect={revalidate}
        />
      </View>

      {eligibilityStatus && (
        <EligibilityBanner eligibilityStatus={eligibilityStatus} />
      )}
    </View>
  );
}
