/**
 * Upload flow orchestrator — auth, payload, socket progress, API, success/error
 */

import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { buildErrorResult } from "../components/UploadResultModal";
import { getUploadTimeoutMs, uploadMedia } from "../api/uploadMedia";
import { checkAuthenticationStatus } from "../utils";
import type { UploadFlowDeps } from "./uploadFlow/types";
import { ensureUploadAuthenticated, normalizeUploadUser } from "./uploadFlow/uploadAuthGate";
import {
  handleUploadHttpError,
  handleUploadParseFailure,
  mapUploadNetworkError,
} from "./uploadFlow/uploadErrorHandlers";
import {
  buildUploadPayload,
  createUploadId,
  validateUploadFileSize,
} from "./uploadFlow/uploadPayload";
import { extractUploadedMedia } from "./uploadFlow/extractUploadedMedia";
import {
  persistUploadedMedia,
  scheduleUploadSuccessNavigation,
} from "./uploadFlow/uploadSuccess";
import { useSimulatedUploadProgress } from "./uploadFlow/useSimulatedUploadProgress";
import { useUploadSocketProgress } from "./uploadFlow/useUploadSocketProgress";

export function useUploadFlow(deps: UploadFlowDeps) {
  const {
    file,
    thumbnail,
    title,
    description,
    selectedCategory,
    selectedType,
    isSermonContent,
    setLoading,
    setUploadState,
    setModerationError,
    setUploadResult,
    setEligibilityStatus,
    validateMediaEligibilityLocal,
    resetForm,
    onSoftNotice,
  } = deps;

  const router = useRouter();
  const queryClient = useQueryClient();
  const successNavigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const successNavigateRef = useRef<(() => void) | null>(null);

  const { startSimulated, stopSimulated } = useSimulatedUploadProgress(
    setUploadState
  );
  const { connectSocket, cleanupSocket, isUsingRealTimeProgressRef } =
    useUploadSocketProgress(setUploadState, stopSimulated);

  useEffect(() => {
    void checkAuthenticationStatus();
  }, []);

  useEffect(() => {
    return () => {
      cleanupSocket();
      stopSimulated();
      if (successNavigateTimeoutRef.current) {
        clearTimeout(successNavigateTimeoutRef.current);
        successNavigateTimeoutRef.current = null;
      }
    };
  }, [cleanupSocket, stopSimulated]);

  const proceedWithUpload = async () => {
    try {
      setLoading(true);
      setModerationError(null);
      setUploadResult(null);
      setUploadState({
        status: "verifying",
        progress: 0,
        message: "Analyzing content...",
      });

      const auth = await ensureUploadAuthenticated(router);
      if (!auth.ok) {
        setLoading(false);
        return;
      }

      if (!file) {
        setLoading(false);
        return;
      }

      const sizeCheck = validateUploadFileSize(file, selectedType);
      if (!sizeCheck.ok) {
        setLoading(false);
        return;
      }

      normalizeUploadUser(auth.user);

      try {
        require("@/store/useGlobalVideoStore")
          .useGlobalVideoStore.getState()
          .pauseAllVideosImperatively?.();
      } catch {
        // no-op
      }

      const formData = buildUploadPayload({
        file,
        thumbnail,
        title,
        description,
        selectedType,
        selectedCategory,
      });

      const controller = new AbortController();
      const timeoutDuration = getUploadTimeoutMs(file.mimeType);
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

      const uploadId = createUploadId();
      await connectSocket(uploadId);

      setUploadState({
        status: "verifying",
        progress: 10,
        message: "Analyzing content... This may take 10-30 seconds.",
      });
      startSimulated();

      const res = await uploadMedia({
        formData,
        token: auth.token,
        uploadId,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      stopSimulated();

      if (!isUsingRealTimeProgressRef.current) {
        setUploadState((prev) => ({
          ...prev,
          progress: 90,
          message: "Finalizing upload...",
        }));
      }

      const contentType = res.headers.get("content-type") || "";
      let result: unknown = null;
      let rawText: string | null = null;
      try {
        if (contentType.includes("application/json")) {
          result = await res.json();
        } else {
          rawText = await res.text();
        }
      } catch {
        try {
          rawText = await res.text();
        } catch {
          // no-op
        }
      }

      if (!res.ok) {
        setLoading(false);
        cleanupSocket();
        await handleUploadHttpError({
          res,
          result,
          rawText,
          uploadId,
          setModerationError,
          setUploadResult,
          setUploadState,
          onLateSuccess: () => {
            // The proxy timed out but the write committed. Treat it as the
            // success it was: refresh the feed and tell the user it's up.
            setUploadState({
              status: "success",
              progress: 100,
              message: "Upload complete",
            });
            setUploadResult({
              kind: "success",
              title: "You're live",
              message:
                "The server was slow to confirm, but your content went through and is on the feed.",
              primaryLabel: "View feed",
              secondaryLabel: "Stay here",
            });
            void queryClient.invalidateQueries({ queryKey: ["all-content"] });
            void queryClient.invalidateQueries({
              queryKey: ["all-content-infinite"],
            });
            void queryClient.invalidateQueries({
              queryKey: ["default-content"],
            });
            resetForm();
          },
        });
        return;
      }

      // Prefer `data` (current BE); fall back to legacy `media`
      const uploaded = extractUploadedMedia(result);
      if (!uploaded) {
        setLoading(false);
        cleanupSocket();
        handleUploadParseFailure(setUploadResult);
        return;
      }

      // Socket may already have sent `complete` — snap bar to 100
      setUploadState((prev) => ({
        status: "success",
        progress: Math.max(prev.progress || 0, 100),
        message: prev.message || "Upload complete",
      }));
      cleanupSocket();

      const feedItem = await persistUploadedMedia({
        uploaded,
        file,
        isSermonContent,
        selectedType,
      });

      scheduleUploadSuccessNavigation({
        router,
        queryClient,
        selectedType,
        feedItem,
        file,
        isSermonContent,
        resetForm,
        setLoading,
        setUploadState,
        setUploadResult,
        successNavigateTimeoutRef,
        onReadyNavigate: (navigateToFeed) => {
          successNavigateRef.current = navigateToFeed;
        },
      });
    } catch (error) {
      stopSimulated();
      cleanupSocket();
      setLoading(false);
      setUploadState({ status: "error", progress: 0, message: "" });
      setUploadResult(buildErrorResult(mapUploadNetworkError(error)));
    }
  };

  const handleUpload = async () => {
    const validation = validateMediaEligibilityLocal();
    setEligibilityStatus(validation);

    if (!validation.isValid) {
      // Soft toast + inline checklist (IG-style) — no blocking Alert wall
      onSoftNotice?.(
        validation.errors[0] || "Complete the remaining steps below."
      );
      return;
    }

    if (!file || !title || !selectedCategory || !selectedType) {
      onSoftNotice?.(
        "Add your media, title, category, and content type to post."
      );
      return;
    }

    const auth = await ensureUploadAuthenticated(router);
    if (!auth.ok) return;

    if (selectedType === "music" && !thumbnail) {
      Alert.alert(
        "Cover recommended",
        "A cover photo helps your track stand out. Continue without one?",
        [
          { text: "Add cover", style: "cancel" },
          { text: "Continue", onPress: () => proceedWithUpload() },
        ]
      );
      return;
    }

    await proceedWithUpload();
  };

  const confirmSuccessNavigate = () => {
    successNavigateRef.current?.();
    successNavigateRef.current = null;
  };

  const cancelSuccessNavigate = () => {
    if (successNavigateTimeoutRef.current) {
      clearTimeout(successNavigateTimeoutRef.current);
      successNavigateTimeoutRef.current = null;
    }
    successNavigateRef.current = null;
    setUploadResult(null);
    resetForm();
    setUploadState({ status: "idle", progress: 0, message: "" });
  };

  return {
    handleUpload,
    confirmSuccessNavigate,
    cancelSuccessNavigate,
  };
}
