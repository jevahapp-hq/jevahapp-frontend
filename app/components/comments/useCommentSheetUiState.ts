import { useCallback, useState } from "react";
import type { CommentSortMode } from "./CommentSortModal";
import type { OwnMenuTarget } from "./types";

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function useCommentSheetUiState() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<
    Record<string, boolean>
  >({});
  const [sortMode, setSortMode] = useState<CommentSortMode>("newest");
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editingComment, setEditingComment] = useState<{
    id: string;
    text: string;
    imageUrl?: string;
  } | null>(null);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [actionsTarget, setActionsTarget] = useState<
    (OwnMenuTarget & { canEdit: boolean }) | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    comment: string;
  } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const resetUi = useCallback(() => {
    setReplyingTo(null);
    setEditingComment(null);
    setSortSheetOpen(false);
    setActionsTarget(null);
    setDeleteTarget(null);
    setExpandedReplies({});
    setSortMode("newest");
    setIsSubmitting(false);
    setDeleteBusy(false);
  }, []);

  const toggleReplies = useCallback((id: string) => {
    setExpandedReplies((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const startReply = useCallback((id: string, name: string) => {
    setEditingComment(null);
    setReplyingTo({ id, name });
  }, []);

  const startEdit = useCallback(
    (c: { id: string; comment: string; imageUrl?: string }) => {
      setReplyingTo(null);
      setEditingComment({
        id: c.id,
        text: c.comment || "",
        imageUrl: c.imageUrl,
      });
    },
    []
  );

  const openOwnMenu = useCallback((c: OwnMenuTarget) => {
    const created = Date.parse(c.timestamp);
    const withinEditWindow =
      !Number.isFinite(created) || Date.now() - created < EDIT_WINDOW_MS;
    setActionsTarget({
      ...c,
      comment: c.comment || "",
      canEdit: withinEditWindow,
    });
  }, []);

  const confirmDelete = useCallback((commentId: string, preview: string) => {
    setDeleteTarget({ id: commentId, comment: preview });
  }, []);

  return {
    isSubmitting,
    setIsSubmitting,
    expandedReplies,
    setExpandedReplies,
    sortMode,
    setSortMode,
    replyingTo,
    setReplyingTo,
    editingComment,
    setEditingComment,
    sortSheetOpen,
    setSortSheetOpen,
    actionsTarget,
    setActionsTarget,
    deleteTarget,
    setDeleteTarget,
    deleteBusy,
    setDeleteBusy,
    resetUi,
    toggleReplies,
    startReply,
    startEdit,
    openOwnMenu,
    confirmDelete,
  };
}
