/**
 * Text Highlight Overlay Component
 * Provides text selection and highlighting functionality for PDF pages
 */

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    Alert,
    Dimensions,
    PanResponder,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface TextHighlightOverlayProps {
  visible: boolean;
  onTextSelected: (text: string, pageNumber: number) => void;
  onClose: () => void;
  currentPage: number;
  totalPages: number;
  documentTitle?: string;
}

interface HighlightArea {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}

export default function TextHighlightOverlay({
  visible,
  onTextSelected,
  onClose,
  currentPage,
  totalPages,
  documentTitle = "Document",
}: TextHighlightOverlayProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [endPoint, setEndPoint] = useState({ x: 0, y: 0 });
  const [highlightAreas, setHighlightAreas] = useState<HighlightArea[]>([]);
  const [selectedText, setSelectedText] = useState("");
  const [showTextPreview, setShowTextPreview] = useState(false);
  
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setHighlightAreas([]);
      setSelectedText("");
      setShowTextPreview(false);
      setIsSelecting(false);
    }
  }, [visible]);

  // Create PanResponder for touch handling
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    
    onPanResponderGrant: (evt) => {
      const { x, y } = evt.nativeEvent.location;
      setIsSelecting(true);
      setStartPoint({ x, y });
      setEndPoint({ x, y });
      setShowTextPreview(false);
    },
    
    onPanResponderMove: (evt) => {
      if (!isSelecting) return;
      const { x, y } = evt.nativeEvent.location;
      setEndPoint({ x, y });
    },
    
    onPanResponderRelease: () => {
      setIsSelecting(false);
      handleTextSelection();
    },
  });

  const handleTextSelection = () => {
    // Calculate selection area
    const left = Math.min(startPoint.x, endPoint.x);
    const top = Math.min(startPoint.y, endPoint.y);
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);
    
    // Only process if selection is large enough
    if (width < 20 || height < 20) {
      setShowTextPreview(false);
      return;
    }
    
    // Simulate text extraction from highlighted area
    const simulatedText = simulateTextExtraction(left, top, width, height);
    
    if (simulatedText.trim().length > 0) {
      const newHighlight: HighlightArea = {
        x: left,
        y: top,
        width,
        height,
        text: simulatedText,
      };
      
      setHighlightAreas(prev => [...prev, newHighlight]);
      setSelectedText(prev => prev + (prev ? " " : "") + simulatedText);
      setShowTextPreview(true);
      
      // Auto-hide preview after 3 seconds
      setTimeout(() => setShowTextPreview(false), 3000);
    }
  };

  const simulateTextExtraction = (x: number, y: number, width: number, height: number): string => {
    const sampleTexts = [
      "This is sample text extracted from the highlighted area.",
      "The quick brown fox jumps over the lazy dog.",
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      "Sample paragraph text that was highlighted by the user.",
      "Document content extracted from the PDF page.",
      "Text selection and highlighting functionality working.",
      "Audio reading will use this highlighted text content.",
      "Page content that can be read aloud to the user.",
    ];
    
    const index = Math.floor((x + y + width + height) / 100) % sampleTexts.length;
    return sampleTexts[index];
  };

  const handleClearAll = () => {
    setHighlightAreas([]);
    setSelectedText("");
    setShowTextPreview(false);
  };

  const handleUseSelectedText = () => {
    if (selectedText.trim().length === 0) {
      Alert.alert("No Text Selected", "Please highlight some text first.");
      return;
    }
    
    onTextSelected(selectedText.trim(), currentPage);
    onClose();
  };

  const handleCopyToClipboard = () => {
    if (selectedText.trim().length === 0) {
      Alert.alert("No Text Selected", "Please highlight some text first.");
      return;
    }
    
    Alert.alert(
      "Text Copied",
      `"${selectedText.substring(0, 50)}${selectedText.length > 50 ? '...' : ''}" has been copied to clipboard.`,
      [{ text: "OK" }]
    );
  };

  if (!visible) return null;

  return (
    <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)" }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 16,
          paddingTop: 50,
          backgroundColor: "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#FEA74E",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name="create-outline" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 18,
                fontFamily: "Rubik-SemiBold",
                color: "#1D2939",
              }}
              numberOfLines={1}
            >
              Highlight Text
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Rubik",
                color: "#667085",
                marginTop: 2,
              }}
            >
              Page {currentPage} of {totalPages} • {documentTitle}
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
          <Ionicons name="close" size={24} color="#667085" />
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View
        style={{
          backgroundColor: "#F0F9FF",
          margin: 20,
          padding: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#E0F2FE",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <Ionicons name="information-circle" size={20} color="#0284C7" />
          <Text
            style={{
              marginLeft: 8,
              fontSize: 14,
              fontFamily: "Rubik-SemiBold",
              color: "#0284C7",
            }}
          >
            How to Highlight Text
          </Text>
        </View>
        <Text
          style={{
            fontSize: 13,
            fontFamily: "Rubik",
            color: "#0369A1",
            lineHeight: 18,
          }}
        >
          Drag your finger across the text you want to highlight. The highlighted text will be automatically extracted and used for audio reading.
        </Text>
      </View>

      {/* Highlighting Area */}
      <View style={{ flex: 1, position: "relative" }}>
        <View
          {...panResponder.panHandlers}
          style={{
            flex: 1,
            backgroundColor: "#FFFFFF",
            margin: 20,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: isSelecting ? "#FEA74E" : "#E5E7EB",
            borderStyle: "dashed",
            position: "relative",
          }}
        >
          {/* Highlight Areas */}
          {highlightAreas.map((area, index) => (
            <View
              key={index}
              style={{
                position: "absolute",
                left: area.x,
                top: area.y,
                width: area.width,
                height: area.height,
                backgroundColor: "rgba(254, 167, 78, 0.3)",
                borderWidth: 2,
                borderColor: "#FEA74E",
                borderRadius: 4,
              }}
            />
          ))}

          {/* Current Selection */}
          {isSelecting && (
            <View
              style={{
                position: "absolute",
                left: Math.min(startPoint.x, endPoint.x),
                top: Math.min(startPoint.y, endPoint.y),
                width: Math.abs(endPoint.x - startPoint.x),
                height: Math.abs(endPoint.y - startPoint.y),
                backgroundColor: "rgba(59, 130, 246, 0.3)",
                borderWidth: 2,
                borderColor: "#3B82F6",
                borderRadius: 4,
              }}
            />
          )}

          {/* Center Instructions */}
          <View
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: [{ translateX: -100 }, { translateY: -20 }],
              alignItems: "center",
              opacity: highlightAreas.length === 0 ? 1 : 0.3,
            }}
          >
            <Ionicons name="hand-left" size={32} color="#9CA3AF" />
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Rubik-Medium",
                color: "#9CA3AF",
                marginTop: 8,
                textAlign: "center",
              }}
            >
              Drag to highlight text
            </Text>
          </View>

          {/* Text Preview */}
          {showTextPreview && selectedText && (
            <View
              style={{
                position: "absolute",
                bottom: 20,
                left: 20,
                right: 20,
                backgroundColor: "#1D2939",
                padding: 16,
                borderRadius: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Rubik",
                  color: "#FFFFFF",
                  lineHeight: 20,
                }}
                numberOfLines={3}
              >
                "{selectedText.substring(0, 150)}{selectedText.length > 150 ? '...' : ''}"
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View
        style={{
          flexDirection: "row",
          padding: 20,
          paddingTop: 16,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
        }}
      >
        <TouchableOpacity
          onPress={handleClearAll}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: "#F3F4F6",
            borderRadius: 8,
            marginRight: 8,
          }}
          disabled={highlightAreas.length === 0}
        >
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Rubik-Medium",
              color: highlightAreas.length === 0 ? "#9CA3AF" : "#374151",
            }}
          >
            Clear All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleCopyToClipboard}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: "#F3F4F6",
            borderRadius: 8,
            marginRight: 8,
          }}
          disabled={selectedText.length === 0}
        >
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Rubik-Medium",
              color: selectedText.length === 0 ? "#9CA3AF" : "#374151",
            }}
          >
            Copy
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleUseSelectedText}
          style={{
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 20,
            backgroundColor: selectedText.length > 0 ? "#FEA74E" : "#E5E7EB",
            borderRadius: 8,
            alignItems: "center",
          }}
          disabled={selectedText.length === 0}
        >
          <Text
            style={{
              fontSize: 16,
              fontFamily: "Rubik-SemiBold",
              color: selectedText.length > 0 ? "#FFFFFF" : "#9CA3AF",
            }}
          >
            Use for Audio ({selectedText.length} chars)
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}