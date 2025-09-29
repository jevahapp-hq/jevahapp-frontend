import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AuthHeader from "../components/AuthHeader";

const { width: screenWidth } = Dimensions.get("window");

type ShapeType =
  | "rectangle"
  | "circle"
  | "scalloped"
  | "square"
  | "square2"
  | "square3"
  | "square4";

const availableColors = [
  "#A16CE5", // Purple
  "#1078B2", // Blue
  "#6360DE", // Indigo
  "#DFCC21", // Yellow
  "#FF69B4", // Pink
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Light Blue
];

const availableShapes: { type: ShapeType; label: string }[] = [
  { type: "rectangle", label: "Rectangle" },
  { type: "square", label: "Square" },
  { type: "square2", label: "Circle" },
  { type: "square3", label: "Circle 2" },
  { type: "square4", label: "Square 2" },
  { type: "scalloped", label: "Scalloped" },
];

export default function PostAPrayer() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [prayerText, setPrayerText] = useState("");
  const [selectedColor, setSelectedColor] = useState(availableColors[0]);
  const [selectedShape, setSelectedShape] = useState<ShapeType>("square");
  const [isTyping, setIsTyping] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [prayerId, setPrayerId] = useState<string | null>(null);

  // Check if we're in edit mode and initialize with existing prayer data
  useEffect(() => {
    if (params.mode === "edit" && params.prayer) {
      setIsEditMode(true);
      setPrayerId(params.id as string);
      setPrayerText(params.prayer as string);
      setSelectedColor((params.color as string) || availableColors[0]);
      setSelectedShape((params.shape as ShapeType) || "square");
    }
  }, [params]);

  // Helper function to darken a hex color
  const darkenColor = (hex: string, percent: number = 30) => {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = ((num >> 8) & 0x00ff) - amt;
    const B = (num & 0x0000ff) - amt;
    return (
      "#" +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  };

  const handleBackToPrayerWall = () => {
    router.push("/screens/PrayerWallScreen");
  };

  const handlePost = () => {
    if (!prayerText.trim()) return;

    if (isEditMode) {
      // In edit mode, navigate back to prayer wall with updated prayer data
      router.push({
        pathname: "/screens/PrayerWallScreen",
        params: {
          updatedPrayer: prayerText,
          updatedColor: selectedColor,
          updatedShape: selectedShape,
          updatedId: prayerId,
        },
      });
    } else {
      // In create mode, navigate back to prayer wall with the new prayer data
      router.push({
        pathname: "/screens/PrayerWallScreen",
        params: {
          prayer: prayerText,
          color: selectedColor,
          shape: selectedShape,
        },
      });
    }
  };

  const getCardStyle = (shape: ShapeType, color: string) => {
    const baseStyle = {
      backgroundColor: color,
      padding: 16,
      justifyContent: "center" as const,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      position: "relative" as const,
    };

    switch (shape) {
      case "square":
        return {
          ...baseStyle,
          width: 156,
          height: 156,
          alignSelf: "center" as const,
          borderRadius: 12,
          overflow: "hidden" as const,
        };
      case "square2":
        return {
          ...baseStyle,
          width: 183,
          height: 183,
          alignSelf: "center" as const,
          borderRadius: 91.5,
          overflow: "hidden" as const,
        };
      case "square3":
        return {
          ...baseStyle,
          width: 183,
          height: 183,
          alignSelf: "center" as const,
          borderRadius: 91.5,
          overflow: "hidden" as const,
        };
      case "square4":
        return {
          ...baseStyle,
          width: 156,
          height: 156,
          alignSelf: "center" as const,
          borderRadius: 12,
          overflow: "hidden" as const,
        };
      case "circle":
        return {
          ...baseStyle,
          borderRadius: 80,
          width: 160,
          height: 160,
          alignSelf: "center" as const,
        };
      case "scalloped":
        return {
          ...baseStyle,
          borderRadius: 20,
          width: 216,
          height: 216,
          alignSelf: "center" as const,
          backgroundColor: "transparent",
          padding: 0,
          justifyContent: "flex-start" as const,
        };
      default: // rectangle
        return {
          ...baseStyle,
          borderRadius: 12,
          width: "100%" as const,
          minHeight: 120,
        };
    }
  };

  const renderScallopedCard = () => {
    const numBlobs = 13;
    const containerSize = 216;
    const center = containerSize / 2;
    const blobRadius = 22;
    const ringRadius = center - blobRadius + 2;
    const blobs = Array.from({ length: numBlobs }).map((_, i) => {
      const angle = (2 * Math.PI * i) / numBlobs;
      const x = center + ringRadius * Math.cos(angle) - blobRadius;
      const y = center + ringRadius * Math.sin(angle) - blobRadius;
      return (
        <View
          key={`scallop-${i}`}
          style={[
            styles.scallopBlob,
            {
              left: x,
              top: y,
              width: blobRadius * 2,
              height: blobRadius * 2,
              borderRadius: blobRadius,
              backgroundColor: selectedColor,
            },
          ]}
        />
      );
    });

    return (
      <View style={styles.scallopContainer}>
        {blobs}
        <View
          style={[styles.scallopCenter, { backgroundColor: selectedColor }]}
        >
          <Text style={[styles.previewText, { opacity: prayerText ? 1 : 0.7 }]}>
            {prayerText || "Tap to write your prayer"}
          </Text>
        </View>
      </View>
    );
  };

  const renderPreview = () => {
    if (selectedShape === "scalloped") {
      return (
        <TouchableOpacity
          style={styles.previewTouchable}
          onPress={() => setIsTyping(true)}
          activeOpacity={0.8}
        >
          {renderScallopedCard()}
          {isTyping && (
            <TextInput
              style={styles.scallopedTextInput}
              placeholder="Type your prayer here..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={prayerText}
              onChangeText={setPrayerText}
              multiline
              maxLength={40}
              textAlignVertical="top"
              autoFocus
              onBlur={() => setIsTyping(false)}
            />
          )}
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.previewTouchable}
        onPress={() => setIsTyping(true)}
        activeOpacity={0.8}
      >
        <View style={getCardStyle(selectedShape, selectedColor)}>
          {selectedShape === "square" && (
            <View
              style={[
                styles.diagonalCut,
                { backgroundColor: darkenColor(selectedColor) },
              ]}
            >
              <View style={styles.triangle} />
            </View>
          )}
          {selectedShape === "square2" && (
            <View
              style={[
                styles.diagonalCut2,
                { backgroundColor: darkenColor(selectedColor) },
              ]}
            >
              <View style={styles.diagonalMask2} />
              <View style={styles.triangle2} />
            </View>
          )}
          {selectedShape === "square3" && (
            <View
              style={[
                styles.diagonalCut3,
                { backgroundColor: darkenColor(selectedColor) },
              ]}
            >
              <View style={styles.diagonalMask3} />
              <View style={styles.triangle3} />
            </View>
          )}
          {selectedShape === "square4" && (
            <View
              style={[
                styles.diagonalCut4,
                { backgroundColor: darkenColor(selectedColor) },
              ]}
            >
              <View style={styles.triangle4} />
            </View>
          )}
          <View style={styles.textContainer}>
            {isTyping ? (
              <TextInput
                style={styles.previewTextInput}
                placeholder="Type your prayer here..."
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={prayerText}
                onChangeText={setPrayerText}
                multiline
                maxLength={40}
                textAlignVertical="top"
                autoFocus
                onBlur={() => setIsTyping(false)}
              />
            ) : (
              <Text
                style={[styles.previewText, { opacity: prayerText ? 1 : 0.7 }]}
              >
                {prayerText || "Tap to write your prayer"}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTemplateShape = (shape: ShapeType) => {
    const baseSize = 80;
    const baseStyle = {
      backgroundColor: selectedColor,
      justifyContent: "center" as const,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      position: "relative" as const,
    };

    switch (shape) {
      case "square":
        return (
          <View
            style={[
              baseStyle,
              {
                width: baseSize,
                height: baseSize,
                borderRadius: 6,
                overflow: "hidden" as const,
              },
            ]}
          >
            <View
              style={[
                styles.templateDiagonalCut,
                { backgroundColor: darkenColor(selectedColor) },
              ]}
            >
              <View style={styles.templateTriangle} />
            </View>
          </View>
        );
      case "square2":
        return (
          <View
            style={[
              baseStyle,
              {
                width: baseSize,
                height: baseSize,
                borderRadius: baseSize / 2,
                overflow: "hidden" as const,
              },
            ]}
          >
            <View
              style={[
                styles.templateDiagonalCut2,
                { backgroundColor: darkenColor(selectedColor) },
              ]}
            >
              <View style={styles.templateDiagonalMask2} />
              <View style={styles.templateTriangle2} />
            </View>
          </View>
        );
      case "square3":
        return (
          <View
            style={[
              baseStyle,
              {
                width: baseSize,
                height: baseSize,
                borderRadius: baseSize / 2,
                overflow: "hidden" as const,
              },
            ]}
          >
            <View
              style={[
                styles.templateDiagonalCut3,
                { backgroundColor: darkenColor(selectedColor) },
              ]}
            >
              <View style={styles.templateDiagonalMask3} />
              <View style={styles.templateTriangle3} />
            </View>
          </View>
        );
      case "square4":
        return (
          <View
            style={[
              baseStyle,
              {
                width: baseSize,
                height: baseSize,
                borderRadius: 6,
                overflow: "hidden" as const,
              },
            ]}
          >
            <View
              style={[
                styles.templateDiagonalCut4,
                { backgroundColor: darkenColor(selectedColor) },
              ]}
            >
              <View style={styles.templateTriangle4} />
            </View>
          </View>
        );
      case "circle":
        return (
          <View
            style={[
              baseStyle,
              {
                width: baseSize,
                height: baseSize,
                borderRadius: baseSize / 2,
              },
            ]}
          />
        );
      case "scalloped":
        return renderTemplateScalloped(baseSize);
      default: // rectangle
        return (
          <View
            style={[
              baseStyle,
              {
                width: baseSize * 1.5,
                height: baseSize,
                borderRadius: 6,
              },
            ]}
          />
        );
    }
  };

  const renderTemplateScalloped = (baseSize: number) => {
    const numBlobs = 13;
    const containerSize = baseSize;
    const center = containerSize / 2;
    const blobRadius = 8;
    const ringRadius = center - blobRadius + 1;
    const blobs = Array.from({ length: numBlobs }).map((_, i) => {
      const angle = (2 * Math.PI * i) / numBlobs;
      const x = center + ringRadius * Math.cos(angle) - blobRadius;
      const y = center + ringRadius * Math.sin(angle) - blobRadius;
      return (
        <View
          key={`template-scallop-${i}`}
          style={[
            styles.templateScallopBlob,
            {
              left: x,
              top: y,
              width: blobRadius * 2,
              height: blobRadius * 2,
              borderRadius: blobRadius,
              backgroundColor: selectedColor,
            },
          ]}
        />
      );
    });

    return (
      <View style={styles.templateScallopContainer}>
        {blobs}
        <View
          style={[
            styles.templateScallopCenter,
            { backgroundColor: selectedColor },
          ]}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AuthHeader
        title="Post a Prayer"
        onBackPress={handleBackToPrayerWall}
        onCancelPress={handleBackToPrayerWall}
      />

      <ScrollView
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Preview Section */}
        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>Post a Prayer</Text>
          <Text style={styles.bibleVerse}>
            "And this is the confidence that we have toward Him, that if we ask
            anything according to His will, He hears us."
          </Text>
          <Text style={styles.bibleReference}>- 1 John 5:14</Text>
          <View style={styles.previewContainer}>{renderPreview()}</View>

          {/* Post Button */}
          <View style={styles.postButtonContainer}>
            <TouchableOpacity
              style={[
                styles.postButton,
                !prayerText.trim()
                  ? styles.disabledButton
                  : styles.activeButton,
              ]}
              onPress={handlePost}
              disabled={!prayerText.trim()}
            >
              <Text
                style={[
                  styles.postButtonText,
                  !prayerText.trim()
                    ? styles.disabledButtonText
                    : styles.activeButtonText,
                ]}
              >
                Post
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Color Selection */}
        <View style={styles.colorSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.colorScrollView}
            contentContainerStyle={styles.colorScrollContent}
          >
            {availableColors.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.selectedColor,
                ]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Template Selection */}
        <View style={styles.templateSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.templateScrollView}
            contentContainerStyle={styles.templateScrollContent}
          >
            {availableShapes.map((shape) => (
              <TouchableOpacity
                key={`template-${shape.type}`}
                style={[
                  styles.templateOption,
                  selectedShape === shape.type && styles.selectedTemplate,
                ]}
                onPress={() => setSelectedShape(shape.type)}
              >
                {renderTemplateShape(shape.type)}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCFCFD",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  previewSection: {
    marginTop: 20,
    marginBottom: 24,
  },
  previewContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  selectionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
    fontFamily: "Rubik-SemiBold",
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
    fontFamily: "Rubik-SemiBold",
    textAlign: "center",
  },
  bibleVerse: {
    fontSize: 16,
    fontStyle: "italic",
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    fontFamily: "Playball-Regular",
    marginBottom: 8,
    paddingHorizontal: 20,
    transform: [{ skewX: "-12deg" }],
  },
  bibleReference: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#666666",
    textAlign: "center",
    fontFamily: "Playball-Regular",
    marginBottom: 20,
    transform: [{ skewX: "-12deg" }],
  },
  colorSection: {
    marginBottom: 24,
  },
  colorScrollView: {
    maxHeight: 60,
  },
  colorScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "transparent",
  },
  selectedColor: {
    borderColor: "#1F2937",
    transform: [{ scale: 1.1 }],
  },
  templateSection: {
    marginTop: 16,
    marginBottom: 40,
  },
  templateScrollView: {
    maxHeight: 100,
  },
  templateScrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  templateOption: {
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedTemplate: {
    borderColor: "#1F2937",
    backgroundColor: "#F3F4F6",
  },
  // Template shape effects
  templateDiagonalCut: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    zIndex: 1,
  },
  templateTriangle: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: 20,
    borderTopColor: "white",
    borderLeftWidth: 20,
    borderLeftColor: "transparent",
  },
  templateDiagonalCut2: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 32,
    height: 32,
    borderBottomLeftRadius: 32,
    zIndex: 1,
  },
  templateDiagonalMask2: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: 32,
    borderTopColor: "#FCFCFD",
    borderLeftWidth: 32,
    borderLeftColor: "transparent",
    zIndex: 1,
  },
  templateTriangle2: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: 20,
    borderTopColor: "white",
    borderLeftWidth: 20,
    borderLeftColor: "transparent",
    zIndex: 2,
  },
  templateDiagonalCut3: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 32,
    height: 32,
    borderBottomLeftRadius: 32,
    zIndex: 1,
  },
  templateDiagonalMask3: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: 32,
    borderTopColor: "#FCFCFD",
    borderLeftWidth: 32,
    borderLeftColor: "transparent",
    zIndex: 1,
  },
  templateTriangle3: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: 20,
    borderTopColor: "white",
    borderLeftWidth: 20,
    borderLeftColor: "transparent",
    zIndex: 2,
  },
  templateDiagonalCut4: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    zIndex: 1,
  },
  templateTriangle4: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: 20,
    borderTopColor: "white",
    borderLeftWidth: 20,
    borderLeftColor: "transparent",
  },
  templateScallopContainer: {
    width: 80,
    height: 80,
    position: "relative",
  },
  templateScallopBlob: {
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  templateScallopCenter: {
    position: "absolute",
    left: 10,
    top: 10,
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  postButtonContainer: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  postButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#667085",
    borderRadius: 22.5,
    width: 236,
    height: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    backgroundColor: "transparent",
    borderColor: "#D1D5DB",
  },
  activeButton: {
    backgroundColor: "#DF930E",
    borderColor: "#DF930E",
  },
  postButtonText: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Rubik-SemiBold",
  },
  disabledButtonText: {
    color: "#D1D5DB",
  },
  activeButtonText: {
    color: "white",
  },
  previewTouchable: {
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  previewTextInput: {
    color: "white",
    fontSize: 14,
    fontFamily: "Rubik-Regular",
    textAlign: "center",
    width: "100%",
    minHeight: 60,
    textAlignVertical: "center",
  },
  scallopedTextInput: {
    position: "absolute",
    top: 28,
    left: 28,
    width: 160,
    height: 160,
    color: "white",
    fontSize: 14,
    fontFamily: "Rubik-Regular",
    textAlign: "center",
    textAlignVertical: "center",
    borderRadius: 80,
    padding: 16,
  },
  previewText: {
    color: "white",
    fontSize: 14,
    fontFamily: "Rubik-Regular",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  // Shape styles (copied from PrayerWallScreen)
  diagonalCut: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 56,
    height: 56,
    zIndex: 1,
  },
  triangle: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: 56,
    borderTopColor: "white",
    borderLeftWidth: 56,
    borderLeftColor: "transparent",
  },
  diagonalCut2: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 91,
    height: 91,
    borderBottomLeftRadius: 91,
    zIndex: 1,
  },
  diagonalMask2: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: 91,
    borderTopColor: "#FCFCFD",
    borderLeftWidth: 91,
    borderLeftColor: "transparent",
    zIndex: 1,
  },
  triangle2: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: 56,
    borderTopColor: "white",
    borderLeftWidth: 56,
    borderLeftColor: "transparent",
    zIndex: 2,
  },
  diagonalCut3: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 91,
    height: 91,
    borderBottomLeftRadius: 91,
    zIndex: 1,
  },
  diagonalMask3: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: 91,
    borderTopColor: "#FCFCFD",
    borderLeftWidth: 91,
    borderLeftColor: "transparent",
    zIndex: 1,
  },
  triangle3: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: 56,
    borderTopColor: "white",
    borderLeftWidth: 56,
    borderLeftColor: "transparent",
    zIndex: 2,
  },
  diagonalCut4: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 56,
    height: 56,
    zIndex: 1,
  },
  triangle4: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: 56,
    borderTopColor: "white",
    borderLeftWidth: 56,
    borderLeftColor: "transparent",
  },
  scallopContainer: {
    width: 216,
    height: 216,
    alignSelf: "center",
    position: "relative",
  },
  scallopBlob: {
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  scallopCenter: {
    position: "absolute",
    left: 28,
    top: 28,
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
});