import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { pickCommentImage } from "./commentImage";
import {
  buildMentionPool,
  filterMentionCandidates,
  getActiveMentionQuery,
  insertMentionAt,
  resolveMentionsInText,
} from "./commentMentions";
import { EmojiTray } from "./EmojiTray";
import { MentionSuggestions } from "./MentionSuggestions";
import { resolveUserAvatarUrl } from "../../utils/defaultUserAvatar";
import {
  COMMENT_COMPOSER_COLORS as C,
  COMMENT_MAX_LENGTH,
  type CommentImageAttachment,
  type CommentMention,
  type MentionCandidate,
  type SubmitCommentPayload,
} from "./types";

type Props = {
  isAuthenticated: boolean;
  isSubmitting: boolean;
  myAvatar?: string | null;
  myName?: string;
  myUserId?: string;
  replyingTo: { id: string; name: string } | null;
  onCancelReply: () => void;
  /** When set, composer is in TikTok-style edit mode */
  editingComment?: {
    id: string;
    text: string;
    imageUrl?: string;
  } | null;
  onCancelEdit?: () => void;
  onPromptLogin: () => void;
  onSubmit: (payload: SubmitCommentPayload) => Promise<void>;
  onFocusInput?: () => void;
  /** Thread + replies for @ pool */
  threadComments: Array<{
    userId?: string;
    userName?: string;
    avatar?: string;
    replies?: Array<{ userId?: string; userName?: string; avatar?: string }>;
  }>;
  creator?: MentionCandidate | null;
  /** Optional remote directory for @ (GET /api/users/search) */
  onSearchMentions?: (q: string) => Promise<MentionCandidate[]>;
  /** Prefill when starting a reply */
  initialText?: string;
  composerError?: string | null;
  onClearComposerError?: () => void;
  bottomPad: number;
  /** Debounced typing broadcast for live indicators */
  onTypingActivity?: (isTyping: boolean) => void;
};

export function CommentComposer({
  isAuthenticated,
  isSubmitting,
  myAvatar,
  myName,
  myUserId,
  replyingTo,
  onCancelReply,
  editingComment,
  onCancelEdit,
  onPromptLogin,
  onSubmit,
  onFocusInput,
  threadComments,
  creator,
  onSearchMentions,
  initialText,
  composerError,
  onClearComposerError,
  bottomPad,
  onTypingActivity,
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState(initialText || "");
  const [cursor, setCursor] = useState(0);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [image, setImage] = useState<CommentImageAttachment | null>(null);
  const [pickingImage, setPickingImage] = useState(false);
  const [selectedMentions, setSelectedMentions] = useState<CommentMention[]>(
    []
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [clearImage, setClearImage] = useState(false);
  const [isNewLocalImage, setIsNewLocalImage] = useState(false);
  const [remoteMentions, setRemoteMentions] = useState<MentionCandidate[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialText != null && !editingComment) {
      setText(initialText);
      setCursor(initialText.length);
    }
  }, [initialText, editingComment]);

  useEffect(() => {
    if (!editingComment) return;
    setText(editingComment.text || "");
    setCursor((editingComment.text || "").length);
    setClearImage(false);
    setIsNewLocalImage(false);
    setSelectedMentions([]);
    setLocalError(null);
    if (editingComment.imageUrl) {
      setImage({
        uri: editingComment.imageUrl,
        type: "image/jpeg",
        name: "existing.jpg",
      });
    } else {
      setImage(null);
    }
    setTimeout(() => inputRef.current?.focus(), 16);
  }, [editingComment?.id]);

  useEffect(() => {
    if (!replyingTo || editingComment) return;
    const mention = `@${replyingTo.name} `;
    setText((prev) => (prev.startsWith(mention) ? prev : mention));
    setTimeout(() => inputRef.current?.focus(), 16);
  }, [replyingTo?.id, replyingTo?.name, editingComment]);

  const pool = useMemo(
    () =>
      buildMentionPool({
        creator,
        thread: threadComments,
        excludeUserId: myUserId,
      }),
    [creator, threadComments, myUserId]
  );

  const activeMention = useMemo(
    () => getActiveMentionQuery(text, cursor),
    [text, cursor]
  );

  useEffect(() => {
    if (!onSearchMentions || !activeMention) {
      setRemoteMentions([]);
      return;
    }
    const q = activeMention.query.trim();
    if (q.length < 2) {
      setRemoteMentions([]);
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      void onSearchMentions(q)
        .then((rows) => setRemoteMentions(rows || []))
        .catch(() => setRemoteMentions([]));
    }, 280);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [activeMention?.query, onSearchMentions]);

  const mentionCandidates = useMemo(() => {
    if (!activeMention) return [];
    const local = filterMentionCandidates(pool, activeMention.query);
    if (!remoteMentions.length) return local;
    const seen = new Set(local.map((c) => c.userId || c.displayName));
    const merged = [...local];
    for (const r of remoteMentions) {
      const key = r.userId || r.displayName;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(r);
    }
    return merged.slice(0, 8);
  }, [activeMention, pool, remoteMentions]);

  const showMentions =
    isAuthenticated && !!activeMention && mentionCandidates.length > 0;

  const canSend =
    isAuthenticated &&
    !isSubmitting &&
    (text.trim().length > 0 || !!image);

  const guard = useCallback(() => {
    if (!isAuthenticated) {
      onPromptLogin();
      return false;
    }
    return true;
  }, [isAuthenticated, onPromptLogin]);

  const onChangeText = useCallback(
    (next: string) => {
      setText(next.slice(0, COMMENT_MAX_LENGTH));
      setLocalError(null);
      onClearComposerError?.();
      onTypingActivity?.(next.trim().length > 0);
    },
    [onClearComposerError, onTypingActivity]
  );

  const insertEmoji = useCallback(
    (emoji: string) => {
      if (!guard()) return;
      const start = cursor;
      const next =
        text.slice(0, start) + emoji + text.slice(start);
      const clipped = next.slice(0, COMMENT_MAX_LENGTH);
      setText(clipped);
      setCursor(Math.min(start + emoji.length, clipped.length));
    },
    [cursor, text, guard]
  );

  const selectMention = useCallback(
    (candidate: MentionCandidate) => {
      if (!activeMention) return;
      const result = insertMentionAt(
        text,
        cursor,
        activeMention.start,
        candidate
      );
      setText(result.text);
      setCursor(result.cursor);
      setSelectedMentions((prev) => {
        const without = prev.filter(
          (m) =>
            m.displayName !== result.mention.displayName &&
            m.userId !== result.mention.userId
        );
        return [...without, result.mention];
      });
      inputRef.current?.focus();
    },
    [activeMention, text, cursor]
  );

  const openEmoji = useCallback(() => {
    if (!guard()) return;
    Keyboard.dismiss();
    setEmojiOpen((v) => !v);
  }, [guard]);

  const openAt = useCallback(() => {
    if (!guard()) return;
    setEmojiOpen(false);
    const start = cursor;
    const next = text.slice(0, start) + "@" + text.slice(start);
    setText(next.slice(0, COMMENT_MAX_LENGTH));
    setCursor(start + 1);
    inputRef.current?.focus();
  }, [guard, cursor, text]);

  const openImage = useCallback(async () => {
    if (!guard()) return;
    setEmojiOpen(false);
    setPickingImage(true);
    setLocalError(null);
    try {
      const picked = await pickCommentImage();
      if (picked) {
        setImage(picked);
        setIsNewLocalImage(true);
        setClearImage(false);
      }
    } catch (e: any) {
      setLocalError(e?.message || "Couldn't open photos");
    } finally {
      setPickingImage(false);
    }
  }, [guard]);

  const removeImage = useCallback(() => {
    setImage(null);
    setIsNewLocalImage(false);
    if (editingComment?.imageUrl) setClearImage(true);
  }, [editingComment?.imageUrl]);

  const handleSubmit = useCallback(async () => {
    if (!canSend) return;
    const mentions = resolveMentionsInText(text, selectedMentions);
    const payload: SubmitCommentPayload = {
      text: text.trim(),
      mentions,
      localImage: isNewLocalImage ? image : null,
      clearImage: !!editingComment && clearImage && !image,
    };
    const keepText = text;
    const keepImage = image;
    const keepMentions = selectedMentions;
    const keepClear = clearImage;
    const keepNew = isNewLocalImage;
    if (!editingComment) {
      setText("");
      setImage(null);
      setSelectedMentions([]);
      setClearImage(false);
      setIsNewLocalImage(false);
    }
    setEmojiOpen(false);
    setLocalError(null);
    try {
      await onSubmit(payload);
      if (editingComment) {
        setText("");
        setImage(null);
        setSelectedMentions([]);
        setClearImage(false);
        setIsNewLocalImage(false);
      }
    } catch (e: any) {
      setText(keepText);
      setImage(keepImage);
      setSelectedMentions(keepMentions);
      setClearImage(keepClear);
      setIsNewLocalImage(keepNew);
      if (e?.code === "COMMENT_IMAGE_UNSUPPORTED") {
        setLocalError(
          "Photos need a server update. You can still send text comments."
        );
        setImage(null);
      } else {
        setLocalError(e?.message || "Failed to post comment");
      }
      throw e;
    }
  }, [
    canSend,
    text,
    selectedMentions,
    image,
    onSubmit,
    isNewLocalImage,
    clearImage,
    editingComment,
  ]);

  const errorBanner = localError || composerError;
  const modeBar = editingComment ? (
    <View style={styles.replyingBar}>
      <Text style={styles.replyingText} numberOfLines={1}>
        Editing comment
      </Text>
      <TouchableOpacity
        onPress={() => {
          onCancelEdit?.();
          setText("");
          setImage(null);
          setClearImage(false);
          setIsNewLocalImage(false);
        }}
      >
        <Text style={styles.replyingCancel}>Cancel</Text>
      </TouchableOpacity>
    </View>
  ) : replyingTo ? (
    <View style={styles.replyingBar}>
      <Text style={styles.replyingText} numberOfLines={1}>
        Replying to{" "}
        <Text style={{ fontWeight: "700" }}>{replyingTo.name}</Text>
      </Text>
      <TouchableOpacity
        onPress={() => {
          onCancelReply();
          setText("");
        }}
      >
        <Text style={styles.replyingCancel}>Cancel</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  return (
    <View style={[styles.composer, { paddingBottom: bottomPad }]}>
      {errorBanner ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{errorBanner}</Text>
          <TouchableOpacity
            onPress={() => {
              setLocalError(null);
              onClearComposerError?.();
            }}
            hitSlop={8}
          >
            <Ionicons name="close" size={16} color={C.heart} />
          </TouchableOpacity>
        </View>
      ) : null}

      {modeBar}

      <MentionSuggestions
        visible={showMentions}
        candidates={mentionCandidates}
        onSelect={selectMention}
      />

      {image ? (
        <View style={styles.imagePreviewRow}>
          <Image source={{ uri: image.uri }} style={styles.imagePreview} />
          <TouchableOpacity
            style={styles.imageRemove}
            onPress={removeImage}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={22} color={C.text} />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.composerRow}>
        <Image
          source={{ uri: resolveUserAvatarUrl(myAvatar) }}
          style={styles.composerAvatar}
        />

        <TouchableOpacity
          activeOpacity={isAuthenticated ? 1 : 0.85}
          disabled={isAuthenticated}
          onPress={onPromptLogin}
          style={styles.inputShell}
        >
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={onChangeText}
            onSelectionChange={(e) =>
              setCursor(e.nativeEvent.selection.end)
            }
            placeholder={
              isAuthenticated
                ? editingComment
                  ? "Edit comment..."
                  : "Add comment..."
                : "Sign in to comment"
            }
            placeholderTextColor={C.meta}
            style={styles.input}
            multiline
            editable={isAuthenticated && !isSubmitting}
            pointerEvents={isAuthenticated ? "auto" : "none"}
            maxLength={COMMENT_MAX_LENGTH}
            onFocus={() => {
              setEmojiOpen(false);
              onFocusInput?.();
            }}
          />
          <View style={styles.inputIcons}>
            <TouchableOpacity
              hitSlop={8}
              onPress={() => void openImage()}
              disabled={pickingImage}
            >
              {pickingImage ? (
                <ActivityIndicator size="small" color={C.text} />
              ) : (
                <Ionicons
                  name={image ? "image" : "image-outline"}
                  size={20}
                  color={image ? C.heart : C.text}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              hitSlop={8}
              style={{ marginLeft: 14 }}
              onPress={openEmoji}
            >
              <Ionicons
                name={emojiOpen ? "happy" : "happy-outline"}
                size={20}
                color={emojiOpen ? C.heart : C.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              hitSlop={8}
              style={{ marginLeft: 14 }}
              onPress={openAt}
            >
              <Ionicons
                name="at"
                size={20}
                color={showMentions ? C.heart : C.text}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {canSend || isSubmitting ? (
          <TouchableOpacity
            onPress={() => {
              if (!isAuthenticated) {
                onPromptLogin();
                return;
              }
              void handleSubmit().catch(() => {});
            }}
            disabled={isSubmitting || !canSend}
            style={styles.sendBtn}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={C.heart} />
            ) : (
              <Ionicons name="arrow-up-circle" size={32} color={C.heart} />
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      <EmojiTray
        visible={emojiOpen && isAuthenticated}
        onSelect={insertEmoji}
        onClose={() => {
          setEmojiOpen(false);
          inputRef.current?.focus();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    backgroundColor: C.sheet,
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.bannerBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    color: C.heart,
    fontWeight: "600",
  },
  replyingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  replyingText: {
    flex: 1,
    fontSize: 13,
    color: C.meta,
  },
  replyingCancel: {
    fontSize: 13,
    fontWeight: "700",
    color: C.heart,
    marginLeft: 12,
  },
  imagePreviewRow: {
    marginBottom: 8,
    alignSelf: "flex-start",
    marginLeft: 48,
  },
  imagePreview: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: C.inputBg,
  },
  imageRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: C.sheet,
    borderRadius: 12,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  composerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 4,
  },
  avatarFallback: {
    backgroundColor: C.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
  },
  inputShell: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: C.inputBg,
    borderRadius: 20,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    maxHeight: 100,
    paddingTop: 6,
    paddingBottom: 6,
  },
  inputIcons: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 6,
    paddingLeft: 6,
  },
  sendBtn: {
    marginBottom: 2,
  },
});
