/**
 * Owner-only description editing for the focused reel.
 *
 * Optimistic: the new text is written to every cache on submit and rolled back
 * if the server rejects it, so the edit feels instant on the author's device
 * while remote viewers get it via the `media-updated` socket event.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { updateMediaDescription } from "../../utils/mediaEdit/updateMediaDescription";
import { applyMediaDescriptionToCaches } from "../../../src/shared/utils/applyMediaDescriptionToCaches";

type Params = {
  mediaId: string;
  currentDescription: string;
  /** Only the uploader may edit; drives whether the pencil renders at all. */
  isOwner: boolean;
};

export function useReelsDescriptionEdit({
  mediaId,
  currentDescription,
  isOwner,
}: Params) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = Boolean(isOwner && mediaId);

  const openEditor = useCallback(() => {
    if (!canEdit) return;
    setError(null);
    setIsEditing(true);
  }, [canEdit]);

  const closeEditor = useCallback(() => {
    setIsEditing(false);
    setError(null);
  }, []);

  const submit = useCallback(
    async (nextDescription: string) => {
      if (!canEdit) return false;
      const next = String(nextDescription ?? "").trim();
      const previous = String(currentDescription ?? "");
      if (next === previous.trim()) {
        setIsEditing(false);
        return true;
      }

      setIsSaving(true);
      setError(null);
      // Optimistic write first so the sheet can close immediately.
      applyMediaDescriptionToCaches(queryClient, mediaId, next);

      try {
        const result = await updateMediaDescription(mediaId, next);
        // Server may normalise the text (trim, strip markup) — adopt its copy.
        if (result.description !== next) {
          applyMediaDescriptionToCaches(
            queryClient,
            mediaId,
            result.description
          );
        }
        setIsEditing(false);
        return true;
      } catch (e: any) {
        applyMediaDescriptionToCaches(queryClient, mediaId, previous);
        setError(e?.message || "Could not save your changes.");
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [canEdit, currentDescription, mediaId, queryClient]
  );

  return { canEdit, isEditing, isSaving, error, openEditor, closeEditor, submit };
}
