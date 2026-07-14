/**
 * Upload flow orchestrator — auth, payload, socket progress, API, success/error
 */

import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useNotification } from "../../../context/NotificationContext";
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
    setEligibilityStatus,
    validateMediaEligibilityLocal,
    resetForm,
  } = deps;

  const router = useRouter();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  const successNavigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

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
        setUploadState({ status: "error", progress: 0, message: "" });
        cleanupSocket();
        await handleUploadHttpError({
          res,
          result,
          rawText,
          showNotification,
          setModerationError,
          setUploadState,
        });
        return;
      }

      cleanupSocket();

      if (!result || typeof result !== "object" || !(result as { media?: unknown }).media) {
        setLoading(false);
        handleUploadParseFailure();
        return;
      }

      const uploaded = (result as { media: Record<string, unknown> }).media as {
        _id: string;
        title: string;
        description?: string;
        fileUrl: string;
        playbackUrl?: string;
        hlsUrl?: string;
        contentType: string;
        fileMimeType?: string;
        thumbnailUrl?: string;
        imageUrl?: string;
        duration?: number;
        genre?: string;
      };

      await persistUploadedMedia({ uploaded, file, isSermonContent });

      scheduleUploadSuccessNavigation({
        router,
        queryClient,
        selectedType,
        resetForm,
        setLoading,
        setUploadState,
        successNavigateTimeoutRef,
      });
    } catch (error) {
      stopSimulated();
      cleanupSocket();
      setLoading(false);
      setUploadState({ status: "error", progress: 0, message: "" });
      showNotification({
        type: "error",
        title: "Upload Failed",
        message: mapUploadNetworkError(error),
        duration: 5000,
      });
    }
  };

  const handleUpload = async () => {
    const validation = validateMediaEligibilityLocal();
    setEligibilityStatus(validation);

    if (!validation.isValid) {
      Alert.alert("Upload Not Eligible", validation.errors.join("\n\n"), [
        { text: "OK" },
      ]);
      return;
    }

    if (!file || !title || !selectedCategory || !selectedType) {
      Alert.alert("Missing fields", "Please complete all required fields.");
      return;
    }

    const auth = await ensureUploadAuthenticated(router);
    if (!auth.ok) return;

    if (selectedType === "music" && !thumbnail) {
      Alert.alert(
        "Thumbnail Recommended",
        "Adding a thumbnail image will help your music stand out. Would you like to continue without one?",
        [
          { text: "Add Thumbnail", style: "cancel" },
          { text: "Continue", onPress: () => proceedWithUpload() },
        ]
      );
      return;
    }

    await proceedWithUpload();
  };

  return { handleUpload };
}
