import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getResponsiveFontSize,
  getResponsiveSpacing,
  getTouchTargetSize,
} from "../../../../utils/responsive";

type AiDescriptionBlockProps = {
  title: string;
  hasFile: boolean;
  hasThumbnail: boolean;
  isGeneratingDescription: boolean;
  descriptionGenerationError: string | null;
  bibleVerses: string[];
  onGenerateAIDescription: () => void;
};

export function AiDescriptionBlock({
  title,
  hasFile,
  hasThumbnail,
  isGeneratingDescription,
  descriptionGenerationError,
  bibleVerses,
  onGenerateAIDescription,
}: AiDescriptionBlockProps) {
  const isReady = !!(title && hasFile && hasThumbnail);
  const isDisabled = isGeneratingDescription || !isReady;

  return (
    <>
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
                    fontFamily: "PlusJakartaSans-Medium",
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
                    fontFamily: "PlusJakartaSans-Medium",
                  }}
                >
                  {!title
                    ? "Enter title to enable"
                    : !hasFile
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
                    fontFamily: "PlusJakartaSans-Medium",
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
              fontFamily: "PlusJakartaSans-Medium",
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
                fontFamily: "PlusJakartaSans-Regular",
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
              fontFamily: "PlusJakartaSans-Regular",
            }}
          >
            {descriptionGenerationError}
          </Text>
        </View>
      )}
    </>
  );
}
