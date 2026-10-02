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
import {
  alertUploadGuidelineIssues,
  collectDeviceGuidelineErrors,
} from "../utils/uploadGuidelineAlert";
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
import type { UploadedMediaPayload } from "./uploadFlow/extractUploadedMedia";
import { reconcileUploadOutcome } from "./uploadFlow/reconcileUploadOutcome";
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
  const abortRef = useRef<AbortController | null>(null);
  const failureSurfacedRef = useRef(false);
  const surfaceFailureRef = useRef<(message: string) => void>(() => {});

  const { connectSocket, cleanupSocket, isUsingRealTimeProgressRef } =
    useUploadSocketProgress(setUploadState, stopSimulated, (message) => {
      surfaceFailureRef.current(message);
    });

  surfaceFailureRef.current = (message: string) => {
    if (failureSurfacedRef.current) return;
    failureSurfacedRef.current = true;
    abortRef.current?.abort();
    stopSimulated();
    cleanupSocket();
    setLoading(false);
    setUploadState({ status: "idle", progress: 0, message: "" });
    setUploadResult(buildErrorResult(message || "Please try again."));
  };

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
    let uploadId = "";
    const completeAsPosted = async (uploaded: UploadedMediaPayload | null) => {
      if (!uploaded?._id) {
        setLoading(false);
        cleanupSocket();
        setUploadState({
          status: "success",
          progress: 100,
          message: "Successfully posted",
        });
        setUploadResult({
          kind: "success",
          title: "Successfully posted",
          message: "Your post is currently under review.",
          primaryLabel: "View All",
          secondaryLabel: "Stay here",
        });
        void queryClient.invalidateQueries({ queryKey: ["all-content"] });
        void queryClient.invalidateQueries({
          queryKey: ["all-content-infinite"],
        });
        void queryClient.invalidateQueries({ queryKey: ["default-content"] });
        const navigateToFeed = () => {
          if (successNavigateTimeoutRef.current) {
            clearTimeout(successNavigateTimeoutRef.current);
            successNavigateTimeoutRef.current = null;
          }
          setUploadResult(null);
          resetForm();
          router.push({
            pathname: "/categories/HomeScreen",
            params: { default: "Home", defaultCategory: "ALL" },
          });
        };
        successNavigateRef.current = navigateToFeed;
        if (successNavigateTimeoutRef.current) {
          clearTimeout(successNavigateTimeoutRef.current);
        }
        successNavigateTimeoutRef.current = setTimeout(navigateToFeed, 2800);
        return;
      }

      setUploadState({
        status: "success",
        progress: 100,
        message: "Successfully posted",
      });
      cleanupSocket();
      const feedItem = await persistUploadedMedia({
        uploaded,
        file: file!,
        isSermonContent,
        selectedType,
      });
      scheduleUploadSuccessNavigation({
        router,
        queryClient,
        selectedType,
        feedItem,
        file: file!,
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
    };

    try {
      failureSurfacedRef.current = false;
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

      const formData = await buildUploadPayload({
        file,
        thumbnail,
        title,
        description,
        selectedType,
        selectedCategory,
      });

      const controller = new AbortController();
      abortRef.current = controller;
      const timeoutDuration = getUploadTimeoutMs(file.mimeType);
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

      uploadId = createUploadId();
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

      if (failureSurfacedRef.current) {
        setLoading(false);
        return;
      }

      if (!isUsingRealTimeProgressRef.current) {
        setUploadState((prev) => ({
          ...prev,
          progress: 90,
          message: "Finalizing upload...",
        }));
      }

      let rawText: string | null = null;
      let result: unknown = null;
      try {
        rawText = await res.text();
        const trimmed = rawText.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          result = JSON.parse(trimmed);
        }
      } catch {
        result = null;
      }

      if (!res.ok) {
        if (failureSurfacedRef.current) {
          setLoading(false);
          return;
        }
        failureSurfacedRef.current = true;
        cleanupSocket();
        await handleUploadHttpError({
          res,
          result,
          rawText,
          uploadId,
          setModerationError,
          setUploadResult,
          setUploadState,
          onLateSuccess: async (mediaId) => {
            await completeAsPosted(
              mediaId
                ? {
                    _id: mediaId,
                    title: title || "Untitled",
                    description,
                    fileUrl: "",
                    contentType: selectedType || "videos",
                    moderationStatus: "under_review",
                  }
                : null
            );
          },
        });
        setLoading(false);
        return;
      }

      const uploaded = extractUploadedMedia(result);
      if (uploaded) {
        await completeAsPosted(uploaded);
        return;
      }

      const outcome = uploadId
        ? await reconcileUploadOutcome(uploadId)
        : { status: "unknown" as const };
      if (outcome.status === "failed") {
        setLoading(false);
        cleanupSocket();
        handleUploadParseFailure(setUploadResult);
        return;
      }
      await completeAsPosted(
        outcome.status === "completed" && outcome.mediaId
          ? {
              _id: outcome.mediaId,
              title: title || "Untitled",
              description,
              fileUrl: "",
              contentType: selectedType || "videos",
              moderationStatus: "under_review",
            }
          : null
      );
    } catch (error) {
      if (failureSurfacedRef.current) {
        setLoading(false);
        return;
      }
      stopSimulated();
      const ambiguous =
        (error as { name?: string; message?: string })?.name === "AbortError" ||
        /timeout|network request failed|failed to fetch|network/i.test(
          (error as { message?: string })?.message || ""
        );
      if (uploadId && ambiguous) {
        const outcome = await reconcileUploadOutcome(uploadId);
        if (outcome.status !== "failed") {
          await completeAsPosted(
            outcome.status === "completed" && outcome.mediaId
              ? {
                  _id: outcome.mediaId,
                  title: title || "Untitled",
                  description,
                  fileUrl: "",
                  contentType: selectedType || "videos",
                  moderationStatus: "under_review",
                }
              : null
          );
          return;
        }
      }
      cleanupSocket();
      setLoading(false);
      setUploadState({ status: "error", progress: 0, message: "" });
      setUploadResult(buildErrorResult(mapUploadNetworkError(error)));
    }
  };

  const handleUpload = async () => {
    const validation = validateMediaEligibilityLocal();
    setEligibilityStatus(validation);

    const guidelineErrors = collectDeviceGuidelineErrors(file, selectedType);
    if (guidelineErrors.length) {
      alertUploadGuidelineIssues(guidelineErrors);
      return;
    }

    if (!validation.isValid) {
      Alert.alert(
        "Can't post yet",
        validation.errors[0] || "Complete the remaining steps below.",
        [{ text: "OK" }]
      );
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
