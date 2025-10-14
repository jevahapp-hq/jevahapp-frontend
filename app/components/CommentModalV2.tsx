import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
    Image,
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
  const { isVisible, comments, hideCommentModal, submitComment, likeComment, replyToComment, contentOwnerName } =
    useCommentModal();

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [text, setText] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const lastCountRef = useRef<number>(0);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
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

  // Scroll to top when a new comment arrives (optimistic insert or server refresh)
  useEffect(() => {
    if (!isVisible) return;
    if (comments.length > lastCountRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      });
    }
    lastCountRef.current = comments.length;
  }, [comments, isVisible]);

  const formatTimeAgo = (iso?: string) => {
    if (!iso) return "JUST NOW";
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "JUST NOW";
    const diff = Math.max(0, Date.now() - then);
    const min = Math.floor(diff / 60000);
    if (min < 1) return "JUST NOW";
    if (min < 60) return `${min}MINS AGO`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}HRS AGO`;
    const days = Math.floor(hrs / 24);
    return `${days}DAYS AGO`;
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || !isAuthenticated) return;
    if (replyingTo) {
      replyToComment(replyingTo.id, trimmed);
      setReplyingTo(null);
      setText("");
      return;
    }
    submitComment(trimmed);
    setText("");
  };

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem("userToken") || 
                   await AsyncStorage.getItem("token");
      setIsAuthenticated(!!token);
    };
    
    if (isVisible) {
      checkAuth();
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
      animationType="slide"
      onRequestClose={hideCommentModal}
    >
      <GestureHandlerRootView
        style={{ flex: 1, justifyContent: "flex-end" }}
      >
        <View
          style={{
            backgroundColor: "white",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            height: keyboardHeight > 0 ? "90%" : "60%",
            paddingTop: Math.max(insets?.top || 0, 12),
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
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 80, // Space for input bar
            }}
            showsVerticalScrollIndicator={false}
          >
            {comments.length > 0 ? (
              comments.map((c: any) => (
                <View
                  key={c.id}
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "#F3F4F6",
                  }}
                >
                  {/* Header row: avatar, name, time, like */}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      {c.avatar ? (
                        <Image
                          source={{ uri: c.avatar }}
                          style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#E5E7EB" }}
                        />
                      ) : (
                        <View
                          style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#E5E7EB" }}
                        />
                      )}
                      <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: "700", color: "#374151" }}>
                        {contentOwnerName || c.userName}
                      </Text>
                      <Text style={{ marginLeft: 6, fontSize: 10, color: "#9CA3AF", fontWeight: "600" }}>
                        {formatTimeAgo(c.timestamp)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => likeComment(c.id)}
                      style={{ flexDirection: "row", alignItems: "center" }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={c.isLiked ? "heart" : "heart-outline"} size={18} color={c.isLiked ? "#EF4444" : "#9CA3AF"} />
                      {(typeof c.likes === "number") && (
                        <Text style={{ marginLeft: 6, fontSize: 11, color: "#6B7280" }}>{c.likes}</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Comment body */}
                  <Text style={{ fontSize: 14, color: "#374151", marginTop: 8, marginLeft: 36 }}>
                    {c.comment}
                  </Text>

                  {/* Reply action */}
                  <TouchableOpacity
                    activeOpacity={0.6}
                    style={{ marginTop: 8, marginLeft: 36 }}
                    onPress={() => {
                      setReplyingTo({ id: c.id, name: c.userName });
                      const mention = `@${c.userName} `;
                      if (!text.startsWith(mention)) {
                        setText(mention);
                      }
                      setTimeout(() => inputRef.current?.focus(), 10);
                    }}
                  >
                    <Text style={{ fontSize: 12, color: "#10B981", fontWeight: "700" }}>REPLY</Text>
                  </TouchableOpacity>

                  {/* Replies */}
                  {Array.isArray(c.replies) && c.replies.length > 0 && (
                    <View style={{ marginTop: 8, marginLeft: 36 }}>
                      {c.replies.map((r: any) => (
                        <View key={r.id} style={{ paddingVertical: 8 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                              {r.avatar ? (
                                <Image
                                  source={{ uri: r.avatar }}
                                  style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#E5E7EB" }}
                                />
                              ) : (
                                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#E5E7EB" }} />
                              )}
                              <Text style={{ marginLeft: 8, fontSize: 12, fontWeight: "700", color: "#374151" }}>
                                {r.userName}
                              </Text>
                              <Text style={{ marginLeft: 6, fontSize: 10, color: "#9CA3AF", fontWeight: "600" }}>
                                {formatTimeAgo(r.timestamp)}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 13, color: "#374151", marginTop: 6, marginLeft: 32 }}>
                            {r.comment}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Ionicons name="chatbubble-outline" size={48} color="#D1D5DB" />
                <Text style={{ fontSize: 16, color: "#6B7280", marginTop: 12, textAlign: 'center' }}>
                  {isAuthenticated ? "No comments yet" : "Sign in to view and add comments"}
                </Text>
                <Text style={{ fontSize: 14, color: "#9CA3AF", marginTop: 4, textAlign: 'center' }}>
                  {isAuthenticated ? "Be the first to share your thoughts!" : "Join the conversation"}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Input bar anchored to bottom */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: keyboardHeight > 0 ? keyboardHeight + 10 : Math.max(insets?.bottom || 0, 8),
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
                backgroundColor: isAuthenticated ? "#F9FAFB" : "#F3F4F6",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: isAuthenticated ? "#E5E7EB" : "#D1D5DB",
              }}
            >
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={setText}
                placeholder={isAuthenticated ? "Add a comment..." : "Sign in to comment"}
                placeholderTextColor={isAuthenticated ? "#6B7280" : "#9CA3AF"}
                style={{
                  fontSize: 14,
                  color: isAuthenticated ? "#374151" : "#9CA3AF",
                  paddingVertical: 0,
                  minHeight: 20,
                }}
                multiline
                editable={isAuthenticated}
                returnKeyType="send"
                onSubmitEditing={() => {
                  if (text.trim() && isAuthenticated) {
                    submitComment(text.trim());
                    setText("");
                  }
                }}
              />
            </View>
            <TouchableOpacity
              disabled={!text.trim() || !isAuthenticated}
              onPress={() => {
                if (text.trim() && isAuthenticated) {
                  submitComment(text.trim());
                  setText("");
                }
              }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                backgroundColor: (text.trim() && isAuthenticated) ? "#10B981" : "#D1D5DB",
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
