/**
 * CommentModalV2 — thin composition shell (TikTok / IG same-window overlay).
 * Row UI, animation, overlays, and composer live under ./comments/*.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  InteractionManager,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { PanGestureHandler } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatCount } from "../../src/shared/utils/formatCount";
import { isCommentPeekHudVisible } from "../../src/shared/comments/commentPeekHud";
import { useCommentModal } from "../context/CommentModalContext";
import { useUserProfile } from "../hooks/useUserProfile";
import { ensureAuthenticatedForInteraction } from "../utils/auth/requireAuthForInteraction";
import contentInteractionAPI from "../utils/contentInteractionAPI";
import {
  CommentActionsModal,
  CommentComposer,
  CommentDeleteModal,
  CommentListEmpty,
  CommentPeekPlaybackHud,
  CommentRow,
  CommentSheetHeader,
  CommentSortModal,
  CommentTypingBanner,
  countAllComments,
  sortCommentThread,
  useCommentSheetAnimation,
  useCommentSheetUiState,
  type CommentThreadItem,
  type MentionCandidate,
  type SubmitCommentPayload,
} from "./comments";
import { COMMENT_COMPOSER_COLORS as C } from "./comments/types";
import { COMMENT_PEEK_HUD_STRIP } from "./commentSheetLayout";

export default function CommentModalV2() {
  const {
    isVisible,
    isClosing,
    comments,
    isLoadingComments,
    loadError,
    composerError,
    clearComposerError,
    hideCommentModal,
    beginCommentDismiss,
    submitComment,
    likeComment,
    replyToComment,
    editComment,
    deleteComment,
    loadMoreComments,
    retryLoadComments,
    contentOwnerName,
    contentCreator,
    typingUsers,
    setLocalTyping,
    mediaPeekHeight,
    contentId,
  } = useCommentModal();

  const { user, getAvatarUrl, getFullName } = useUserProfile();
  const isAuthenticated = !!user;
  const myAvatar = user ? getAvatarUrl(user) : null;
  const myName = user ? getFullName(user) : "";
  const myUserId = String(user?.id || user?._id || "");
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<CommentThreadItem>>(null);
  const lastCountRef = useRef(0);
  // Keep the sheet in the tree after idle / first open so tap 1 isn't a JS mount.
  const [shellReady, setShellReady] = useState(false);
  useEffect(() => {
    if (isVisible) {
      setShellReady(true);
      return;
    }
    const task = InteractionManager.runAfterInteractions(() => setShellReady(true));
    const fallback = setTimeout(() => setShellReady(true), 500);
    return () => {
      task.cancel();
      clearTimeout(fallback);
    };
  }, [isVisible]);

  const ui = useCommentSheetUiState();
  const anim = useCommentSheetAnimation({
    isVisible,
    mediaPeekHeight,
    onDismissStart: beginCommentDismiss,
    onHideComplete: hideCommentModal,
    onClosedUiReset: ui.resetUi,
  });

  const promptGuestLogin = useCallback(() => {
    void ensureAuthenticatedForInteraction({ action: "comment" });
  }, []);

  const sortedComments = useMemo(
    () => sortCommentThread(comments as CommentThreadItem[], ui.sortMode),
    [comments, ui.sortMode]
  );

  const totalCount = useMemo(
    () => countAllComments(comments as CommentThreadItem[]),
    [comments]
  );

  useEffect(() => {
    if (!isVisible) return;
    if (comments.length > lastCountRef.current) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
    }
    lastCountRef.current = comments.length;
  }, [comments, isVisible]);

  const isCreator = useCallback(
    (name?: string) => {
      if (!name || !contentOwnerName) return false;
      return (
        name.trim().toLowerCase() === contentOwnerName.trim().toLowerCase()
      );
    },
    [contentOwnerName]
  );

  const isOwnComment = useCallback(
    (userId?: string) => {
      if (!myUserId || !userId) return false;
      return String(userId) === String(myUserId);
    },
    [myUserId]
  );

  const searchMentions = useCallback(
    async (q: string): Promise<MentionCandidate[]> => {
      try {
        const rows = await contentInteractionAPI.searchUsersForMentions(q, 10);
        return rows.map((r) => ({
          userId: r.userId,
          displayName: r.displayName,
          avatar: r.avatar,
        }));
      } catch {
        return [];
      }
    },
    []
  );

  const handleSubmit = async (payload: SubmitCommentPayload) => {
    if (!isAuthenticated || ui.isSubmitting) return;
    const hasBody =
      !!payload.text.trim() ||
      !!payload.localImage ||
      (ui.editingComment &&
        !payload.clearImage &&
        !!ui.editingComment.imageUrl);
    if (!hasBody && !payload.clearImage) return;
    if (
      ui.editingComment &&
      payload.clearImage &&
      !payload.text.trim() &&
      !payload.localImage
    ) {
      Alert.alert("Keep something", "Comments need text or a photo.");
      return;
    }

    ui.setIsSubmitting(true);
    const wasReplying = !!ui.replyingTo;
    const replyId = ui.replyingTo?.id;
    const replyName = ui.replyingTo?.name || "";
    const wasEditing = ui.editingComment;
    const editId = ui.editingComment?.id;

    if (ui.replyingTo) ui.setReplyingTo(null);

    try {
      if (wasEditing && editId) {
        await editComment(editId, {
          content: payload.text,
          clearImage: payload.clearImage,
          localImage: payload.localImage,
        });
        ui.setEditingComment(null);
      } else if (wasReplying && replyId) {
        ui.setExpandedReplies((prev) => ({ ...prev, [replyId]: true }));
        await replyToComment(replyId, payload);
      } else {
        await submitComment(payload);
      }
    } catch (error) {
      const err = error as Error & { status?: number; code?: string };
      if (wasReplying && replyId && !wasEditing) {
        ui.setReplyingTo({ id: replyId, name: replyName });
      }
      if (
        err.code !== "COMMENT_IMAGE_UNSUPPORTED" &&
        err.code !== "COMMENT_EDIT_WINDOW_EXPIRED" &&
        err.code !== "COMMENT_CONTENT_REQUIRED"
      ) {
        Alert.alert(
          "Error",
          err.message || "Failed to post comment. Please try again.",
          [{ text: "OK" }]
        );
      }
      throw error;
    } finally {
      ui.setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = useCallback(async () => {
    if (!ui.deleteTarget) return;
    const id = ui.deleteTarget.id;
    ui.setDeleteBusy(true);
    try {
      await deleteComment(id);
      ui.setDeleteTarget(null);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Couldn't delete comment");
    } finally {
      ui.setDeleteBusy(false);
    }
  }, [
    deleteComment,
    ui.deleteTarget,
    ui.setDeleteBusy,
    ui.setDeleteTarget,
  ]);

  const keyExtractor = useCallback((item: CommentThreadItem) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: CommentThreadItem }) => (
      <CommentRow
        comment={item}
        repliesExpanded={ui.expandedReplies[item.id] === true}
        isOwn={isOwnComment}
        isCreator={isCreator}
        onLike={likeComment}
        onReply={ui.startReply}
        onToggleReplies={ui.toggleReplies}
        onOpenOwnMenu={ui.openOwnMenu}
      />
    ),
    [
      ui.expandedReplies,
      ui.startReply,
      ui.toggleReplies,
      ui.openOwnMenu,
      isOwnComment,
      isCreator,
      likeComment,
    ]
  );

  const listEmpty = useMemo(
    () => (
      <CommentListEmpty
        isLoading={isLoadingComments}
        loadError={loadError}
        onRetry={() => void retryLoadComments()}
      />
    ),
    [isLoadingComments, loadError, retryLoadComments]
  );

  const composerBottomPad =
    anim.keyboardHeight > 0 ? 8 : Math.max(insets.bottom, 10);

  if (!isVisible && !shellReady) return null;

  const headerLabel =
    totalCount === 1 ? "1 comment" : `${formatCount(totalCount)} comments`;

  return (
    <View
      style={[
        styles.overlayRoot,
        !isVisible ? styles.overlayRootIdle : undefined,
      ]}
      pointerEvents={isVisible ? "box-none" : "none"}
    >
      {/* Light dim — leave the HUD strip undimmed for seek */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.dimHitArea,
          { height: Math.max(0, mediaPeekHeight - COMMENT_PEEK_HUD_STRIP) },
          anim.backdropStyle,
        ]}
      >
        <View style={styles.dimFill} />
      </Animated.View>

      {isCommentPeekHudVisible(isVisible, isClosing) ? (
        <CommentPeekPlaybackHud
          peekHeight={mediaPeekHeight}
          contentId={contentId}
        />
      ) : null}

      <Animated.View
        pointerEvents="none"
        style={[styles.keyboardBridge, anim.keyboardBridgeStyle]}
      />

      <Animated.View
        pointerEvents="auto"
        style={[
          styles.sheet,
          // Static pin: sheet never fills the overlay before Reanimated applies
          { top: mediaPeekHeight, bottom: 0 },
          anim.sheetAnimatedStyle,
        ]}
      >
          <PanGestureHandler
            activeOffsetY={8}
          failOffsetX={[-24, 24]}
          enabled={anim.keyboardHeight === 0}
          onGestureEvent={anim.onPanGestureEvent}
          onEnded={anim.handleGestureEnd}
          >
            <Animated.View>
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
              </View>
            </Animated.View>
          </PanGestureHandler>

        <CommentSheetHeader
          title={headerLabel}
          onSort={() => ui.setSortSheetOpen(true)}
          onClose={anim.closeModal}
        />

          <FlatList
            ref={listRef}
          data={sortedComments}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
          ListEmptyComponent={listEmpty}
          style={styles.list}
          contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
          removeClippedSubviews={Platform.OS === "android"}
          onEndReached={() => {
            void loadMoreComments();
          }}
          onEndReachedThreshold={0.2}
        />

        <CommentTypingBanner users={typingUsers} />

        <CommentComposer
          key={isVisible ? "open" : "closed"}
          isAuthenticated={isAuthenticated}
          isSubmitting={ui.isSubmitting}
          myAvatar={myAvatar}
          myName={myName}
          myUserId={myUserId}
          replyingTo={ui.replyingTo}
          onCancelReply={() => ui.setReplyingTo(null)}
          editingComment={ui.editingComment}
          onCancelEdit={() => ui.setEditingComment(null)}
          onPromptLogin={promptGuestLogin}
          onSubmit={handleSubmit}
          onSearchMentions={searchMentions}
          onTypingActivity={setLocalTyping}
          threadComments={comments as CommentThreadItem[]}
          creator={
            contentCreator
              ? {
                  userId: contentCreator.userId,
                  displayName: contentCreator.displayName,
                  avatar: contentCreator.avatar,
                  isCreator: true,
                }
              : contentOwnerName
                ? {
                    userId: "",
                    displayName: contentOwnerName,
                    isCreator: true,
                  }
                : null
          }
          composerError={composerError}
          onClearComposerError={clearComposerError}
          bottomPad={composerBottomPad}
          onFocusInput={() => {
            requestAnimationFrame(() => {
              listRef.current?.scrollToOffset({
                offset: 0,
                animated: true,
              });
            });
          }}
        />
      </Animated.View>

      <CommentSortModal
        visible={ui.sortSheetOpen}
        value={ui.sortMode}
        onClose={() => ui.setSortSheetOpen(false)}
        onChange={ui.setSortMode}
      />

      <CommentActionsModal
        visible={!!ui.actionsTarget}
        canEdit={!!ui.actionsTarget?.canEdit}
        onClose={() => ui.setActionsTarget(null)}
        onEdit={() => {
          if (!ui.actionsTarget) return;
          ui.startEdit(ui.actionsTarget);
        }}
        onDelete={() => {
          if (!ui.actionsTarget) return;
          ui.confirmDelete(ui.actionsTarget.id, ui.actionsTarget.comment);
        }}
      />

      <CommentDeleteModal
        visible={!!ui.deleteTarget}
        preview={ui.deleteTarget?.comment}
        busy={ui.deleteBusy}
        onCancel={() => {
          if (ui.deleteBusy) return;
          ui.setDeleteTarget(null);
        }}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
  overlayRootIdle: {
    zIndex: -1,
    elevation: 0,
  },
  dimHitArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  dimFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  keyboardBridge: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.sheet,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    // top + bottom pinned from props / keyboard — never unbound height
    backgroundColor: C.sheet,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    flexDirection: "column",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 18,
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 8,
    minHeight: 28,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.handle,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 8,
    flexGrow: 1,
  },
});
