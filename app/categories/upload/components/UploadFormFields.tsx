/**
 * Title, description, AI generate, categories, content types, eligibility
 */

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
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
  validateMediaEligibilityLocal: (overrides?: {
    file?: MediaFile | null;
    title?: string;
    selectedCategory?: string;
    selectedType?: string;
  }) => EligibilityStatus;
  isGeneratingDescription: boolean;
  descriptionGenerationError: string | null;
  bibleVerses: string[];
  onGenerateAIDescription: () => void;
};

const FIELD_HELP: Record<string, string> = {
  title:
    "A short, clear name for your post (what people see first in the feed).",
  description:
    "Optional story or context. You can also generate one with AI after you add a title, file, and cover.",
  category:
    "The topic lane this post belongs in (Worship, Youth, Teachings, etc.).",
  contentType:
    "The format of your file — Videos, Music, Books, Podcasts, or Sermons. Match the file you uploaded.",
  cover:
    "A square image that represents your post. Required for a strong first impression.",
};

function FieldLabel({
  label,
  icon,
  helpKey,
  openHelp,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  helpKey: string;
  openHelp: (key: string) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
      }}
    >
      <Ionicons
        name={icon}
        size={14}
        color="#64748B"
        style={{ marginRight: 6 }}
      />
      <Text
        style={{
          fontSize: getResponsiveFontSize(11, 12, 12),
          color: "#64748B",
          fontFamily: "Rubik-SemiBold",
          letterSpacing: 0.4,
          flex: 1,
        }}
      >
        {label}
      </Text>
      <Pressable
        onPress={() => openHelp(helpKey)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Help for ${label}`}
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F1F5F9",
        }}
      >
        <Ionicons name="help" size={12} color="#64748B" />
      </Pressable>
    </View>
  );
}

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
  const [helpKey, setHelpKey] = useState<string | null>(null);

  const applyValidation = useCallback(
    (overrides?: {
      file?: MediaFile | null;
      title?: string;
      selectedCategory?: string;
      selectedType?: string;
    }) => {
      const validation = validateMediaEligibilityLocal(overrides);
      setEligibilityStatus(validation);
    },
    [validateMediaEligibilityLocal, setEligibilityStatus]
  );

  const openHelp = (key: string) => {
    setHelpKey((prev) => (prev === key ? null : key));
  };

  const isReady = !!(title && file && thumbnail);
  const isDisabled = isGeneratingDescription || !isReady;

  return (
    <View className="flex-1">
      <FieldLabel
        label="TITLE"
        icon="text-outline"
        helpKey="title"
        openHelp={openHelp}
      />
      {helpKey === "title" ? (
        <Text
          style={{
            fontSize: getResponsiveFontSize(11, 12, 13),
            color: "#64748B",
            fontFamily: "Rubik-Regular",
            marginBottom: 8,
            lineHeight: 17,
          }}
        >
          {FIELD_HELP.title}
        </Text>
      ) : null}
      <TextInput
        placeholder="Enter title..."
        value={title}
        onChangeText={(text) => {
          setTitle(text);
          applyValidation({ title: text });
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

      <FieldLabel
        label="DESCRIPTION"
        icon="create-outline"
        helpKey="description"
        openHelp={openHelp}
      />
      {helpKey === "description" ? (
        <Text
          style={{
            fontSize: getResponsiveFontSize(11, 12, 13),
            color: "#64748B",
            fontFamily: "Rubik-Regular",
            marginBottom: 8,
            lineHeight: 17,
          }}
        >
          {FIELD_HELP.description}
        </Text>
      ) : null}
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
          onPress={onGenerateAIDescription}
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
                      : "Upload cover to enable"}
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
            Suggested Bible Verses
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
            {descriptionGenerationError}
          </Text>
        </View>
      )}

      <FieldLabel
        label="CATEGORY"
        icon="grid-outline"
        helpKey="category"
        openHelp={openHelp}
      />
      {helpKey === "category" ? (
        <Text
          style={{
            fontSize: getResponsiveFontSize(11, 12, 13),
            color: "#64748B",
            fontFamily: "Rubik-Regular",
            marginBottom: 8,
            lineHeight: 17,
          }}
        >
          {FIELD_HELP.category}
        </Text>
      ) : null}
      <View className="mb-4">
        <CategoryTypeTags
          items={categories.map((item) => ({ label: item, value: item }))}
          selected={selectedCategory}
          onSelect={(value) => {
            setSelectedCategory(value);
            applyValidation({ selectedCategory: value });
          }}
        />
      </View>

      <FieldLabel
        label="CONTENT TYPE"
        icon="layers-outline"
        helpKey="contentType"
        openHelp={openHelp}
      />
      {helpKey === "contentType" ? (
        <Text
          style={{
            fontSize: getResponsiveFontSize(11, 12, 13),
            color: "#64748B",
            fontFamily: "Rubik-Regular",
            marginBottom: 8,
            lineHeight: 17,
          }}
        >
          {FIELD_HELP.contentType}
        </Text>
      ) : null}
      {file && (
        <Text
          style={{
            fontSize: getResponsiveFontSize(10, 11, 12),
            color: "#64748B",
            fontFamily: "Rubik-Regular",
            marginBottom: 8,
          }}
        >
          {detectedFileType === "video" && "Detected: Video — pick Videos or Sermons"}
          {detectedFileType === "audio" &&
            "Detected: Audio — pick Music, Podcasts, or Sermons"}
          {detectedFileType === "ebook" &&
            "Detected: Document — pick Books or Ebook"}
          {detectedFileType === "unknown" &&
            "File type unclear — choose the matching content type"}
        </Text>
      )}
      <View className="mb-4">
        <CategoryTypeTags
          items={contentTypes}
          selected={selectedType}
          onSelect={(value) => {
            setSelectedType(value);
            setIsSermonContent(value === "sermon");
            applyValidation({ selectedType: value });
          }}
          onSermonsChange={setIsSermonContent}
        />
      </View>

      {eligibilityStatus && (
        <EligibilityBanner eligibilityStatus={eligibilityStatus} />
      )}
    </View>
  );
}
