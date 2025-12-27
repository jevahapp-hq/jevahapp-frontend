import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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
import { GestureHandlerRootView, PanGestureHandler } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCommentModal } from "../context/CommentModalContext";
import { formatTimeAgo } from "../../src/shared/utils";
import { AnimatedButton } from "../../src/shared/components/AnimatedButton";

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function CommentModalV2() {
  const { isVisible, comments, hideCommentModal, submitComment, likeComment, replyToComment, contentOwnerName } =
    useCommentModal();

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [text, setText] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const lastCountRef = useRef<number>(0);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const insets = useSafeAreaInsets();

  // Reanimated values for smooth modal animation
  const translateY = useSharedValue(1000);
  const opacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

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

  // INSTANT modal animation - like Instagram (no delay on open)
  useEffect(() => {
    if (isVisible) {
      // INSTANT appearance - set values immediately with NO animation
      // This makes the modal appear instantly like Instagram
      // No withSpring or withTiming on open - just instant values
      translateY.value = 0;
      opacity.value = 1;
      backdropOpacity.value = 0.5;
      
      // INSTANT FOCUS - Use microtask for fastest possible focus
      // Promise.resolve() is the fastest way to schedule focus
      Promise.resolve().then(() => {
        inputRef.current?.focus();
      });
    } else {
      // Smooth close animation (users don't notice close delay)
      translateY.value = withTiming(1000, { duration: 200 });
      opacity.value = withTiming(0, { duration: 150 });
      backdropOpacity.value = withTiming(0, { duration: 150 });
      setText("");
    }
  }, [isVisible, translateY, opacity, backdropOpacity]);

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

  // formatTimeAgo is now imported from shared utils

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || !isAuthenticated || isSubmitting) return;
    
    setIsSubmitting(true);
    const commentText = trimmed;
    const wasReplying = !!replyingTo;
    const replyId = replyingTo?.id;
    
    // Clear input immediately for better UX (optimistic)
    setText("");
    if (replyingTo) {
      setReplyingTo(null);
    }
    
    try {
      if (wasReplying && replyId) {
        await replyToComment(replyId, commentText);
      } else {
        await submitComment(commentText);
      }
      // Success - comment was added optimistically, context handles the rest
    } catch (error) {
      const err = error as Error & { status?: number };
      
      // Restore text on error so user can retry
      setText(commentText);
      if (wasReplying && replyId) {
        setReplyingTo({ id: replyId, name: "" });
      }
      
      // Show user-friendly error message
      const errorMessage = 
        err.status === 500 
          ? "Server error. Please try again later."
          : err.status === 404
          ? "Content not found. Please refresh and try again."
          : err.message || "Failed to post comment. Please try again.";
      
      Alert.alert(
        "Error",
        errorMessage,
        [{ text: "OK" }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pre-check authentication status - don't wait for modal to open
  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem("userToken") || 
                   await AsyncStorage.getItem("token");
      setIsAuthenticated(!!token);
    };
    // Check immediately, not waiting for modal visibility
    checkAuth();
  }, []); // Run once on mount, not when modal opens

  const bottomOffset =
    Platform.OS === "android"
      ? Math.max(keyboardHeight, 0)
      : Math.max(keyboardHeight - (insets?.bottom || 0), 0);

  // Animated styles
  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleGestureEnd = (event: any) => {
    "worklet";
    if (event.translationY > 150) {
      translateY.value = withTiming(1000, { duration: 200 });
      opacity.value = withTiming(0, { duration: 150 });
      backdropOpacity.value = withTiming(0, { duration: 150 });
      runOnJS(hideCommentModal)();
    } else {
      translateY.value = withSpring(0);
    }
  };

  // Keep modal mounted but hidden for instant opening (like Instagram)
  // Use pointerEvents and opacity instead of returning null

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none" // We handle animations with Reanimated
      onRequestClose={hideCommentModal}
      // Remove any built-in animation delays
      presentationStyle="overFullScreen"
    >
      <GestureHandlerRootView
        style={{ flex: 1, justifyContent: "flex-end" }}
      >
        {/* Backdrop */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            translateY.value = withTiming(1000, { duration: 250 });
            opacity.value = withTiming(0, { duration: 200 });
            backdropOpacity.value = withTiming(0, { duration: 200 });
            setTimeout(() => hideCommentModal(), 250);
          }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <Animated.View
            style={[
              {
                flex: 1,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
              },
              backdropAnimatedStyle,
            ]}
          />
        </TouchableOpacity>

        {/* Modal Content */}
        <PanGestureHandler
          onGestureEvent={(event) => {
            "worklet";
            if (event.nativeEvent.translationY > 0) {
              translateY.value = event.nativeEvent.translationY;
            }
          }}
          onEnded={handleGestureEnd}
        >
          <Animated.View
            style={[
              {
                backgroundColor: "white",
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                height: keyboardHeight > 0 ? "90%" : "60%",
                paddingTop: Math.max(insets?.top || 0, 12),
              },
              modalAnimatedStyle,
            ]}
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
              onPress={() => {
                translateY.value = withTiming(1000, { duration: 250 });
                opacity.value = withTiming(0, { duration: 200 });
                backdropOpacity.value = withTiming(0, { duration: 200 });
                setTimeout(() => hideCommentModal(), 250);
              }}
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
                    <AnimatedCommentLikeButton
                      isLiked={c.isLiked}
                      likes={c.likes}
                      onPress={() => likeComment(c.id)}
                    />
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
        </Animated.View>
        </PanGestureHandler>

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
                editable={isAuthenticated && !isSubmitting}
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
              />
            </View>
            <TouchableOpacity
              disabled={!text.trim() || !isAuthenticated || isSubmitting}
              onPress={handleSubmit}
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                backgroundColor: (text.trim() && isAuthenticated && !isSubmitting) ? "#10B981" : "#D1D5DB",
                justifyContent: "center",
                alignItems: "center",
                marginLeft: 8,
              }}
              activeOpacity={0.7}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

// Optimized Comment Like Button with instant scale feedback
function AnimatedCommentLikeButton({
  isLiked,
  likes,
  onPress,
}: {
  isLiked: boolean;
  likes: number;
  onPress: () => void;
}) {
  return (
    <AnimatedButton
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center" }}
      pressScale={0.8}
      damping={12}
      stiffness={400}
    >
      <Ionicons
        name={isLiked ? "heart" : "heart-outline"}
        size={18}
        color={isLiked ? "#EF4444" : "#9CA3AF"}
      />
      {typeof likes === "number" && (
        <Text style={{ marginLeft: 6, fontSize: 11, color: "#6B7280" }}>
          {likes}
        </Text>
      )}
    </AnimatedButton>
  );
}
