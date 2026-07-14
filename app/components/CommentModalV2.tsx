import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  PanGestureHandler,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedButton } from "../../src/shared/components/AnimatedButton";
import { CommentSkeleton } from "../../src/shared/components/CommentSkeleton";
import { formatTimeAgo } from "../../src/shared/utils";
import { useCommentModal } from "../context/CommentModalContext";
import { useUserProfile } from "../hooks/useUserProfile";

type Reply = {
  id: string;
  userName: string;
  avatar?: string;
  timestamp: string;
  comment: string;
  likes?: number;
  isLiked?: boolean;
};

type CommentRow = {
  id: string;
  userName: string;
  avatar?: string;
  timestamp: string;
  comment: string;
  likes: number;
  isLiked: boolean;
  replies?: Reply[];
};

export default function CommentModalV2() {
  const {
    isVisible,
    comments,
    isLoadingComments,
    hideCommentModal,
    submitComment,
    likeComment,
    replyToComment,
    loadMoreComments,
  } = useCommentModal();
  const { user } = useUserProfile();
  const isAuthenticated = !!user;
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>(
    {}
  );
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<CommentRow>>(null);
  const lastCountRef = useRef(0);
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const insets = useSafeAreaInsets();

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

  useEffect(() => {
    if (isVisible) {
      translateY.value = 48;
      opacity.value = 1;
      backdropOpacity.value = 0;
      translateY.value = withSpring(0, {
        damping: 22,
        stiffness: 320,
        mass: 0.8,
      });
      backdropOpacity.value = withTiming(0.45, { duration: 160 });
    } else {
      translateY.value = withTiming(1000, { duration: 180 });
      opacity.value = withTiming(0, { duration: 140 });
      backdropOpacity.value = withTiming(0, { duration: 140 });
      setText("");
      setReplyingTo(null);
      setExpandedReplies({});
    }
  }, [isVisible, translateY, opacity, backdropOpacity]);

  useEffect(() => {
    if (!isVisible) return;
    if (comments.length > lastCountRef.current) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
    }
    lastCountRef.current = comments.length;
  }, [comments, isVisible]);

  const closeModal = useCallback(() => {
    translateY.value = withTiming(1000, { duration: 220 });
    opacity.value = withTiming(0, { duration: 180 });
    backdropOpacity.value = withTiming(0, { duration: 180 });
    setTimeout(() => hideCommentModal(), 200);
  }, [hideCommentModal, translateY, opacity, backdropOpacity]);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || !isAuthenticated || isSubmitting) return;

    setIsSubmitting(true);
    const commentText = trimmed;
    const wasReplying = !!replyingTo;
    const replyId = replyingTo?.id;
    const replyName = replyingTo?.name || "";

    setText("");
    if (replyingTo) setReplyingTo(null);

    try {
      if (wasReplying && replyId) {
        setExpandedReplies((prev) => ({ ...prev, [replyId]: true }));
        await replyToComment(replyId, commentText);
      } else {
        await submitComment(commentText);
      }
    } catch (error) {
      const err = error as Error & { status?: number };
      setText(commentText);
      if (wasReplying && replyId) {
        setReplyingTo({ id: replyId, name: replyName });
      }
      const errorMessage =
        err.status === 500
          ? "Server error. Please try again later."
          : err.status === 404
            ? "Content not found. Please refresh and try again."
            : err.message || "Failed to post comment. Please try again.";
      Alert.alert("Error", errorMessage, [{ text: "OK" }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startReply = useCallback((id: string, name: string) => {
    setReplyingTo({ id, name });
    const mention = `@${name} `;
    setText((prev) => (prev.startsWith(mention) ? prev : mention));
    setTimeout(() => inputRef.current?.focus(), 16);
  }, []);

  const toggleReplies = useCallback((id: string) => {
    setExpandedReplies((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleGestureEnd = (event: any) => {
    "worklet";
    if (event.translationY > 120) {
      translateY.value = withTiming(1000, { duration: 200 });
      opacity.value = withTiming(0, { duration: 150 });
      backdropOpacity.value = withTiming(0, { duration: 150 });
      runOnJS(hideCommentModal)();
    } else {
      translateY.value = withSpring(0);
    }
  };

  const sheetHeight = keyboardHeight > 0 ? "92%" : "68%";
  const listBottomPad = 12;

  const keyExtractor = useCallback((item: CommentRow) => item.id, []);

  const renderItem = useCallback(
    ({ item: c }: { item: CommentRow }) => {
      const replies = Array.isArray(c.replies) ? c.replies : [];
      const replyCount = replies.length;
      const isExpanded = expandedReplies[c.id] ?? replyCount <= 2;
      const visibleReplies = isExpanded ? replies : [];

      return (
        <View
          style={{
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: "#F3F4F6",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              {c.avatar ? (
                <Image
                  source={{ uri: c.avatar }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#E5E7EB",
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#E5E7EB",
                  }}
                />
              )}
              <Text
                numberOfLines={1}
                style={{
                  marginLeft: 8,
                  fontSize: 13,
                  fontWeight: "700",
                  color: "#374151",
                  maxWidth: "62%",
                }}
              >
                {c.userName || "User"}
              </Text>
              <Text
                style={{
                  marginLeft: 6,
                  fontSize: 11,
                  color: "#9CA3AF",
                  fontWeight: "600",
                }}
              >
                {formatTimeAgo(c.timestamp)}
              </Text>
            </View>
            <AnimatedCommentLikeButton
              isLiked={c.isLiked}
              likes={c.likes}
              onPress={() => likeComment(c.id)}
            />
          </View>

          <Text
            style={{
              fontSize: 14,
              color: "#374151",
              marginTop: 8,
              marginLeft: 40,
              lineHeight: 20,
            }}
          >
            {c.comment}
          </Text>

          <View
            style={{
              marginTop: 8,
              marginLeft: 40,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => startReply(c.id, c.userName || "User")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text
                style={{ fontSize: 12, color: "#6B7280", fontWeight: "700" }}
              >
                Reply
              </Text>
            </TouchableOpacity>
            {replyCount > 0 && (
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => toggleReplies(c.id)}
                style={{ marginLeft: 16 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text
                  style={{ fontSize: 12, color: "#10B981", fontWeight: "700" }}
                >
                  {isExpanded
                    ? "Hide replies"
                    : `View ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {isExpanded && replyCount > 0 && (
            <View style={{ marginTop: 4, marginLeft: 40 }}>
              {visibleReplies.map((r) => (
                <View key={r.id} style={{ paddingVertical: 10 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    {r.avatar ? (
                      <Image
                        source={{ uri: r.avatar }}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: "#E5E7EB",
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: "#E5E7EB",
                        }}
                      />
                    )}
                    <Text
                      numberOfLines={1}
                      style={{
                        marginLeft: 8,
                        fontSize: 12,
                        fontWeight: "700",
                        color: "#374151",
                        maxWidth: "70%",
                      }}
                    >
                      {r.userName || "User"}
                    </Text>
                    <Text
                      style={{
                        marginLeft: 6,
                        fontSize: 10,
                        color: "#9CA3AF",
                        fontWeight: "600",
                      }}
                    >
                      {formatTimeAgo(r.timestamp)}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#374151",
                      marginTop: 6,
                      marginLeft: 32,
                      lineHeight: 18,
                    }}
                  >
                    {r.comment}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.6}
                    style={{ marginTop: 6, marginLeft: 32 }}
                    onPress={() => startReply(c.id, r.userName || "User")}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#6B7280",
                        fontWeight: "700",
                      }}
                    >
                      Reply
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      );
    },
    [expandedReplies, likeComment, startReply, toggleReplies]
  );

  const listEmpty = useMemo(() => {
    if (isLoadingComments) {
      return (
        <View style={{ paddingTop: 8 }}>
          <CommentSkeleton count={5} />
        </View>
      );
    }
    return (
      <View style={{ paddingVertical: 48, alignItems: "center" }}>
        <Ionicons name="chatbubble-outline" size={44} color="#D1D5DB" />
        <Text
          style={{
            fontSize: 16,
            color: "#6B7280",
            marginTop: 12,
            textAlign: "center",
          }}
        >
          No comments yet
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#9CA3AF",
            marginTop: 4,
            textAlign: "center",
          }}
        >
          Be the first to share your thoughts!
        </Text>
      </View>
    );
  }, [isLoadingComments]);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={closeModal}
      presentationStyle="overFullScreen"
    >
      <GestureHandlerRootView style={{ flex: 1, justifyContent: "flex-end" }}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={closeModal}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <Animated.View
            style={[
              { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)" },
              backdropAnimatedStyle,
            ]}
          />
        </TouchableOpacity>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
          style={{ width: "100%" }}
        >
          <Animated.View
            style={[
              {
                backgroundColor: "white",
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                height: sheetHeight as any,
                maxHeight: "92%",
                paddingTop: 4,
                flexDirection: "column",
                overflow: "hidden",
              },
              modalAnimatedStyle,
            ]}
          >
            {/* Swipe-to-dismiss only on handle/header so FlatList scroll wins */}
            <PanGestureHandler
              activeOffsetY={8}
              failOffsetX={[-20, 20]}
              onGestureEvent={(event) => {
                "worklet";
                if (event.nativeEvent.translationY > 0) {
                  translateY.value = event.nativeEvent.translationY;
                }
              }}
              onEnded={handleGestureEnd}
            >
              <Animated.View>
                <View
                  style={{
                    alignItems: "center",
                    paddingTop: 6,
                    paddingBottom: 4,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: "#D1D5DB",
                    }}
                  />
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                    paddingBottom: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: "#F3F4F6",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: "#374151",
                    }}
                  >
                    Comments
                  </Text>
                  <TouchableOpacity
                    onPress={closeModal}
                    style={{
                      width: 36,
                      height: 36,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#F3F4F6",
                      borderRadius: 18,
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={18} color="#374151" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </PanGestureHandler>

            {/* Scrollable comments — never draws under the composer */}
            <FlatList
              ref={listRef}
              data={isLoadingComments ? [] : (comments as CommentRow[])}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 4,
                paddingBottom: listBottomPad,
                flexGrow: 1,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              onEndReachedThreshold={0.4}
              onEndReached={() => {
                void loadMoreComments?.();
              }}
              ListEmptyComponent={listEmpty}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={7}
              removeClippedSubviews={Platform.OS === "android"}
            />

            {/* Sticky composer — sheet column footer, not an overlay */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: "#E5E7EB",
                backgroundColor: "#FFFFFF",
                paddingHorizontal: 12,
                paddingTop: 10,
                paddingBottom: Math.max(
                  keyboardHeight > 0 ? 10 : insets.bottom || 8,
                  10
                ),
              }}
            >
              {replyingTo ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>
                    Replying to{" "}
                    <Text style={{ fontWeight: "700", color: "#10B981" }}>
                      @{replyingTo.name}
                    </Text>
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setReplyingTo(null);
                      setText("");
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#9CA3AF",
                        fontWeight: "600",
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: isAuthenticated ? "#F9FAFB" : "#F3F4F6",
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: Platform.OS === "ios" ? 10 : 8,
                    borderWidth: 1,
                    borderColor: isAuthenticated ? "#E5E7EB" : "#D1D5DB",
                    maxHeight: 110,
                  }}
                >
                  <TextInput
                    ref={inputRef}
                    value={text}
                    onChangeText={setText}
                    placeholder={
                      isAuthenticated
                        ? replyingTo
                          ? `Reply to ${replyingTo.name}...`
                          : "Add a comment..."
                        : "Sign in to comment"
                    }
                    placeholderTextColor={
                      isAuthenticated ? "#6B7280" : "#9CA3AF"
                    }
                    style={{
                      fontSize: 14,
                      color: isAuthenticated ? "#374151" : "#9CA3AF",
                      paddingVertical: 0,
                      minHeight: 20,
                      maxHeight: 90,
                    }}
                    multiline
                    editable={isAuthenticated && !isSubmitting}
                    returnKeyType="default"
                    blurOnSubmit={false}
                  />
                </View>
                <TouchableOpacity
                  disabled={!text.trim() || !isAuthenticated || isSubmitting}
                  onPress={handleSubmit}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor:
                      text.trim() && isAuthenticated && !isSubmitting
                        ? "#10B981"
                        : "#D1D5DB",
                    justifyContent: "center",
                    alignItems: "center",
                    marginLeft: 8,
                    marginBottom: 1,
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
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

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
      style={{ flexDirection: "row", alignItems: "center", paddingLeft: 8 }}
      pressScale={0.8}
      damping={12}
      stiffness={400}
    >
      <Ionicons
        name={isLiked ? "heart" : "heart-outline"}
        size={18}
        color={isLiked ? "#EF4444" : "#9CA3AF"}
      />
      {typeof likes === "number" && likes > 0 ? (
        <Text style={{ marginLeft: 4, fontSize: 11, color: "#6B7280" }}>
          {likes}
        </Text>
      ) : null}
    </AnimatedButton>
  );
}
