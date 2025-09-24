import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCommentModal } from "../context/CommentModalContext";

export default function CommentModalV2() {
  const { isVisible, comments, hideCommentModal, submitComment } =
    useCommentModal();

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => {
      show?.remove();
      hide?.remove();
    };
  }, []);

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setText("");
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const bottomOffset =
    Platform.OS === "android"
      ? Math.max(keyboardHeight, 0)
      : Math.max(keyboardHeight - (insets?.bottom || 0), 0);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={hideCommentModal}
    >
      <GestureHandlerRootView
        style={{ position: "absolute", inset: 0, justifyContent: "flex-end" }}
      >
        <View
          style={{ position: "absolute", inset: 0, backgroundColor: "#0006" }}
        />

        <View
          style={{
            backgroundColor: "white",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: "70%",
            paddingTop: 12,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingBottom: 8,
              borderBottomWidth: 1,
              borderBottomColor: "#F3F4F6",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#374151" }}>
              Comments
            </Text>
            <TouchableOpacity
              onPress={hideCommentModal}
              style={{
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#F3F4F6",
                borderRadius: 20,
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Comments list */}
          <ScrollView
            style={{ flexGrow: 0 }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 16,
            }}
            showsVerticalScrollIndicator={false}
          >
            {comments.map((c: any) => (
              <View
                key={c.id}
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: "#F9FAFB",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: 4,
                  }}
                >
                  {c.userName}
                </Text>
                <Text style={{ fontSize: 14, color: "#374151" }}>
                  {c.comment}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Input bar anchored to keyboard */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: bottomOffset,
            backgroundColor: "white",
            borderTopWidth: 1,
            borderTopColor: "#E5E7EB",
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                flex: 1,
                backgroundColor: "#F9FAFB",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
            >
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={setText}
                placeholder="Add a comment..."
                placeholderTextColor="#6B7280"
                style={{
                  fontSize: 14,
                  color: "#374151",
                  paddingVertical: 0,
                  minHeight: 20,
                }}
                multiline
                returnKeyType="send"
                onSubmitEditing={() => {
                  if (text.trim()) {
                    submitComment(text.trim());
                    setText("");
                  }
                }}
              />
            </View>
            <TouchableOpacity
              disabled={!text.trim()}
              onPress={() => {
                if (text.trim()) {
                  submitComment(text.trim());
                  setText("");
                }
              }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                backgroundColor: text.trim() ? "#10B981" : "#D1D5DB",
                justifyContent: "center",
                alignItems: "center",
                marginLeft: 8,
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
