/**
 * Manual Text Input Component
 * Allows users to input text manually when PDF extraction fails
 */

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    Alert,
    Dimensions,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface ManualTextInputProps {
  visible: boolean;
  onClose: () => void;
  onTextSubmit: (text: string, pageNumber?: number) => void;
  currentPage?: number;
  totalPages?: number;
  documentTitle?: string;
}

export default function ManualTextInput({
  visible,
  onClose,
  onTextSubmit,
  currentPage = 1,
  totalPages = 1,
  documentTitle = "Document",
}: ManualTextInputProps) {
  const [inputText, setInputText] = useState("");
  const [selectedPage, setSelectedPage] = useState(currentPage);
  const [isFullDocument, setIsFullDocument] = useState(false);

  const { height: screenHeight } = Dimensions.get("window");

  const handleSubmit = () => {
    if (inputText.trim().length === 0) {
      Alert.alert("No Text", "Please enter some text to continue.");
      return;
    }

    if (isFullDocument) {
      // Split by paragraphs or double line breaks for full document
      const pages = inputText
        .split(/\n\s*\n/)
        .filter(page => page.trim().length > 0)
        .map(page => page.trim());
      
      if (pages.length > 0) {
        // Submit each page
        pages.forEach((pageText, index) => {
          onTextSubmit(pageText, index + 1);
        });
      } else {
        onTextSubmit(inputText.trim(), selectedPage);
      }
    } else {
      onTextSubmit(inputText.trim(), selectedPage);
    }

    // Reset form
    setInputText("");
    setIsFullDocument(false);
    onClose();
  };

  const handlePasteHelp = () => {
    Alert.alert(
      "How to Add Text",
      "You can:\n\n• Copy text from another app and paste it here\n• Type or dictate text manually\n• Add content for a single page or the entire document\n• Use voice-to-text if available on your device",
      [{ text: "Got it", style: "default" }]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 16,
            paddingTop: 50,
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
            backgroundColor: "#FFFFFF",
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
              <Ionicons name="create" size={20} color="#FFFFFF" />
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
                Add Text Manually
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Rubik",
                  color: "#667085",
                  marginTop: 2,
                }}
              >
                {documentTitle} • {totalPages} pages
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Ionicons name="close" size={24} color="#667085" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Instructions */}
          <View
            style={{
              backgroundColor: "#F0F9FF",
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
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
                How to Add Text
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
              Automatic text extraction didn't work for this PDF. You can manually add text to enable audio reading:
            </Text>
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 12, color: "#0369A1", fontFamily: "Rubik" }}>
                • Copy and paste text from the PDF{"\n"}
                • Type content manually for accessibility{"\n"}
                • Use voice dictation if available{"\n"}
                • Add single page or full document
              </Text>
            </View>
          </View>

          {/* Page Selection */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Rubik-SemiBold",
                color: "#1D2939",
                marginBottom: 12,
              }}
            >
              Content Type
            </Text>
            
            <View style={{ flexDirection: "row", marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => setIsFullDocument(false)}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: !isFullDocument ? "#FEA74E" : "#F9FAFB",
                  borderRadius: 8,
                  marginRight: 8,
                }}
              >
                <Ionicons
                  name={!isFullDocument ? "radio-button-on" : "radio-button-off"}
                  size={18}
                  color={!isFullDocument ? "#FFFFFF" : "#9CA3AF"}
                />
                <Text
                  style={{
                    marginLeft: 8,
                    fontSize: 13,
                    fontFamily: "Rubik-Medium",
                    color: !isFullDocument ? "#FFFFFF" : "#6B7280",
                  }}
                >
                  Single Page
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsFullDocument(true)}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: isFullDocument ? "#FEA74E" : "#F9FAFB",
                  borderRadius: 8,
                  marginLeft: 8,
                }}
              >
                <Ionicons
                  name={isFullDocument ? "radio-button-on" : "radio-button-off"}
                  size={18}
                  color={isFullDocument ? "#FFFFFF" : "#9CA3AF"}
                />
                <Text
                  style={{
                    marginLeft: 8,
                    fontSize: 13,
                    fontFamily: "Rubik-Medium",
                    color: isFullDocument ? "#FFFFFF" : "#6B7280",
                  }}
                >
                  Full Document
                </Text>
              </TouchableOpacity>
            </View>

            {!isFullDocument && (
              <View>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Rubik",
                    color: "#667085",
                    marginBottom: 8,
                  }}
                >
                  Page Number
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#F9FAFB",
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setSelectedPage(Math.max(1, selectedPage - 1))}
                    style={{
                      padding: 12,
                      borderRightWidth: 1,
                      borderRightColor: "#E5E7EB",
                    }}
                  >
                    <Ionicons name="chevron-back" size={18} color="#667085" />
                  </TouchableOpacity>
                  
                  <Text
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontSize: 16,
                      fontFamily: "Rubik-Medium",
                      color: "#1D2939",
                      paddingVertical: 8,
                    }}
                  >
                    {selectedPage} of {totalPages}
                  </Text>
                  
                  <TouchableOpacity
                    onPress={() => setSelectedPage(Math.min(totalPages, selectedPage + 1))}
                    style={{
                      padding: 12,
                      borderLeftWidth: 1,
                      borderLeftColor: "#E5E7EB",
                    }}
                  >
                    <Ionicons name="chevron-forward" size={18} color="#667085" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Text Input */}
          <View style={{ marginBottom: 20 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Rubik-SemiBold",
                  color: "#1D2939",
                }}
              >
                {isFullDocument ? "Full Document Text" : `Page ${selectedPage} Text`}
              </Text>
              
              <TouchableOpacity onPress={handlePasteHelp}>
                <Ionicons name="help-circle" size={18} color="#FEA74E" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              multiline
              value={inputText}
              onChangeText={setInputText}
              placeholder={
                isFullDocument
                  ? "Paste or type the full document content here. Separate pages with double line breaks..."
                  : `Paste or type the content for page ${selectedPage} here...`
              }
              style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                fontFamily: "Rubik",
                color: "#1D2939",
                height: Math.min(screenHeight * 0.4, 300),
                textAlignVertical: "top",
                backgroundColor: "#FFFFFF",
              }}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Character Count */}
          <View style={{ alignItems: "flex-end", marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Rubik",
                color: inputText.length > 0 ? "#FEA74E" : "#9CA3AF",
              }}
            >
              {inputText.length} characters
            </Text>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View
          style={{
            flexDirection: "row",
            padding: 20,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: "#E5E7EB",
            backgroundColor: "#FFFFFF",
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            style={{
              flex: 1,
              paddingVertical: 14,
              paddingHorizontal: 20,
              backgroundColor: "#F3F4F6",
              borderRadius: 12,
              alignItems: "center",
              marginRight: 12,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Rubik-SemiBold",
                color: "#374151",
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSubmit}
            style={{
              flex: 1,
              paddingVertical: 14,
              paddingHorizontal: 20,
              backgroundColor: inputText.trim().length > 0 ? "#FEA74E" : "#E5E7EB",
              borderRadius: 12,
              alignItems: "center",
              marginLeft: 12,
            }}
            disabled={inputText.trim().length === 0}
          >
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Rubik-SemiBold",
                color: inputText.trim().length > 0 ? "#FFFFFF" : "#9CA3AF",
              }}
            >
              Add Text
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}


