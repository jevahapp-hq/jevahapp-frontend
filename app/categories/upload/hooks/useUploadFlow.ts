/**
 * Upload flow: auth checks, FormData upload, socket progress, moderation handling
 */

import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useNotification } from "../../../context/NotificationContext";
import SocketManager from "../../../services/SocketManager";
import { useMediaStore } from "../../../store/useUploadStore";
import TokenUtils from "../../../utils/tokenUtils";
import {
  logUserDataStatus,
  validateUserForUpload,
} from "../../../utils/userValidation";
import {
  buildUploadFormData,
  getUploadTimeoutMs,
  uploadMedia,
} from "../api/uploadMedia";
import { API_BASE_URL, getMaxFileSizeBytes } from "../constants";
import type {
  EligibilityStatus,
  MediaFile,
  ModerationError,
  UploadState,
} from "../types";
import {
  checkAuthenticationStatus,
  formatFriendlyRejectionMessage,
  getTimeAgo,
} from "../utils";

type UseUploadFlowParams = {
  file: MediaFile | null;
  thumbnail: MediaFile | null;
  title: string;
  description: string;
  selectedCategory: string;
  selectedType: string;
  isSermonContent: boolean;
  setLoading: (v: boolean) => void;
  setUploadState: (
    v: UploadState | ((prev: UploadState) => UploadState)
  ) => void;
  setModerationError: (v: ModerationError | null) => void;
  setEligibilityStatus: (v: EligibilityStatus | null) => void;
  validateMediaEligibilityLocal: () => EligibilityStatus;
  resetForm: () => void;
};

export function useUploadFlow({
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
}: UseUploadFlowParams) {
  const router = useRouter();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const socketManagerRef = useRef<SocketManager | null>(null);
  const currentUploadIdRef = useRef<string | null>(null);
  const isUsingRealTimeProgressRef = useRef<boolean>(false);
  const successNavigateTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const authStatus = await checkAuthenticationStatus();

      console.log("🔍 Upload Screen - Auth Check:", {
        hasToken: authStatus.hasToken,
        tokenSource: authStatus.tokenSource,
        hasUser: authStatus.hasUser,
        userKeys: authStatus.user ? Object.keys(authStatus.user) : null,
      });
    };

    checkAuth();
  }, []);

  // Cleanup Socket.IO connection and success timeout on unmount
  useEffect(() => {
    return () => {
      if (socketManagerRef.current) {
        socketManagerRef.current.disconnect();
        socketManagerRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (successNavigateTimeoutRef.current) {
        clearTimeout(successNavigateTimeoutRef.current);
        successNavigateTimeoutRef.current = null;
      }
    };
  }, []);

  const cleanupSocket = () => {
    if (socketManagerRef.current) {
      const socket = (socketManagerRef.current as any).socket;
      if (socket) {
        socket.off("upload-progress");
      }
      socketManagerRef.current.disconnect();
      socketManagerRef.current = null;
    }
    currentUploadIdRef.current = null;
    isUsingRealTimeProgressRef.current = false;
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

    const authStatus = await checkAuthenticationStatus();

    console.log("🔍 Upload Auth Check:", {
      hasToken: authStatus.hasToken,
      tokenSource: authStatus.tokenSource,
      hasUser: authStatus.hasUser,
      userKeys: authStatus.user ? Object.keys(authStatus.user) : null,
    });

    if (!authStatus.hasToken || !authStatus.hasUser) {
      let message = "Please log in to upload content.";
      if (!authStatus.hasToken && !authStatus.hasUser) {
        message = "Your session has expired. Please log in again.";
      } else if (!authStatus.hasToken) {
        message = "Authentication token missing. Please log in again.";
      } else if (!authStatus.hasUser) {
        message = "User data missing. Please log in again.";
      }

      Alert.alert("Authentication Required", message, [
        { text: "Cancel", style: "cancel" },
        { text: "Go to Login", onPress: () => router.push("/auth/login") },
      ]);
      return;
    }

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

    proceedWithUpload();
  };

  const proceedWithUpload = async () => {
    try {
      setLoading(true);
      setModerationError(null);
      setUploadState({
        status: "verifying",
        progress: 0,
        message: "Analyzing content...",
      });

      const authStatus = await checkAuthenticationStatus();

      console.log("🔍 Upload Debug - Retrieved data:", {
        hasToken: authStatus.hasToken,
        tokenSource: authStatus.tokenSource,
        tokenLength: authStatus.token?.length,
        tokenPreview: authStatus.token
          ? `${authStatus.token.substring(0, 10)}...`
          : null,
        hasUser: authStatus.hasUser,
        userRaw: authStatus.userRaw,
        userData: authStatus.user,
        userAvatar: authStatus.user?.avatar,
        userImageUrl: authStatus.user?.imageUrl,
        userProfileImage: authStatus.user?.profileImage,
        userKeys: authStatus.user ? Object.keys(authStatus.user) : null,
      });

      const maxBytes = getMaxFileSizeBytes(selectedType || "videos");
      const fileSize = file?.size ?? 0;
      if (fileSize > maxBytes) {
        setLoading(false);
        const maxMB = Math.round(maxBytes / (1024 * 1024));
        const fileMB = (fileSize / (1024 * 1024)).toFixed(1);
        Alert.alert(
          "File too large",
          `This file is ${fileMB} MB. Maximum allowed is ${maxMB} MB for ${selectedType || "this type"}. Please choose a smaller file or compress it.`
        );
        return;
      }

      if (!authStatus.hasToken || !authStatus.hasUser) {
        setLoading(false);
        console.error("❌ Upload failed: Missing token or user data", {
          tokenExists: authStatus.hasToken,
          userExists: authStatus.hasUser,
          tokenSource: authStatus.tokenSource,
          userKeys: authStatus.user ? Object.keys(authStatus.user) : null,
        });

        let message = "Please log in again to upload content.";
        if (!authStatus.hasToken && !authStatus.hasUser) {
          message = "Session expired. Please log in again.";
        } else if (!authStatus.hasToken) {
          message = "Authentication token missing. Please log in again.";
        } else if (!authStatus.hasUser) {
          message = "User data missing. Please log in again.";
        }

        Alert.alert("Authentication Required", message);
        return;
      }

      const validation = validateUserForUpload(authStatus.user);
      const normalizedUser = validation.normalizedUser;

      logUserDataStatus(authStatus.user, "Upload");

      if (!validation.isValid) {
        console.warn(
          "⚠️ Upload with incomplete user data:",
          validation.missingFields
        );
      }

      if (!normalizedUser.avatar && authStatus.user) {
        const avatar =
          authStatus.user.avatar ||
          authStatus.user.imageUrl ||
          authStatus.user.profileImage ||
          "";
        if (avatar) {
          normalizedUser.avatar = avatar;
          console.log("✅ Found user avatar for upload:", avatar);
        }
      }

      console.log("🔍 Upload Debug - Normalized user data:", {
        fullName: normalizedUser.fullName,
        avatar: normalizedUser.avatar,
        hasAvatar: !!normalizedUser.avatar,
        validation: validation,
      });

      if (!file) {
        setLoading(false);
        return;
      }

      const formData = buildUploadFormData({
        file,
        thumbnail,
        title,
        description,
        selectedType,
        selectedCategory,
      });

      console.log("🌐 Upload Request Details:", {
        url: `${API_BASE_URL}/api/media/upload`,
        hasToken: !!authStatus.token,
        tokenLength: authStatus.token?.length,
        fileSize: file?.size ? `${file.size} bytes` : "No file size",
        fileName: file?.name || "No file name",
        fileType: file?.mimeType || "No file type",
        thumbnailSize: thumbnail?.size
          ? `${thumbnail.size} bytes`
          : "No thumbnail",
      });

      const controller = new AbortController();
      const timeoutDuration = getUploadTimeoutMs(file.mimeType);

      console.log(`⏱️ Upload timeout set to: ${timeoutDuration / 1000}s`);
      const timeoutId = setTimeout(() => {
        console.log("⏱️ Upload timed out, aborting...");
        controller.abort();
      }, timeoutDuration);

      console.log("📤 Starting upload request...");
      const uploadStartTime = Date.now();

      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      currentUploadIdRef.current = uploadId;
      isUsingRealTimeProgressRef.current = false;

      // Initialize Socket.IO for real-time progress updates
      try {
        const token = await TokenUtils.getAuthToken();
        if (token && TokenUtils.isValidJWTFormat(token)) {
          const socketManager = new SocketManager({
            serverUrl: API_BASE_URL,
            authToken: token,
          });

          await socketManager.connect();

          const socket = (socketManager as any).socket;
          if (socket) {
            socketManagerRef.current = socketManager;

            const handleUploadProgress = (progressData: {
              uploadId: string;
              progress: number;
              stage: string;
              message: string;
              timestamp: string;
            }) => {
              if (progressData.uploadId === uploadId) {
                console.log("📊 Real-time progress update:", progressData);

                if (!isUsingRealTimeProgressRef.current) {
                  console.log(
                    "🔄 Switching from simulated to real-time progress"
                  );
                  isUsingRealTimeProgressRef.current = true;

                  if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                    progressIntervalRef.current = null;
                  }
                }

                let status: "verifying" | "uploading" | "success" | "error" =
                  "verifying";
                if (progressData.stage === "complete") {
                  status = "success";
                } else if (
                  progressData.stage === "error" ||
                  progressData.stage === "rejected"
                ) {
                  status = "error";
                  cleanupSocket();
                  setLoading(false);
                } else if (progressData.stage === "finalizing") {
                  status = "uploading";
                }

                setUploadState({
                  status,
                  progress: Math.min(progressData.progress, 100),
                  message: progressData.message || progressData.stage,
                });
              }
            };

            socket.on("upload-progress", handleUploadProgress);

            if (socket.connected) {
              console.log(
                "✅ Socket.IO already connected for real-time progress"
              );
              isUsingRealTimeProgressRef.current = true;
            } else {
              const connectionTimeout = setTimeout(() => {
                if (!socket.connected) {
                  console.warn(
                    "⚠️ Socket.IO connection timeout, using simulated progress"
                  );
                }
              }, 3000);

              socket.once("connect", () => {
                clearTimeout(connectionTimeout);
                console.log("✅ Socket.IO connected for real-time progress");
                isUsingRealTimeProgressRef.current = true;

                if (progressIntervalRef.current) {
                  clearInterval(progressIntervalRef.current);
                  progressIntervalRef.current = null;
                }
              });
            }
          } else {
            console.warn(
              "⚠️ Socket.IO socket not available, using simulated progress"
            );
          }
        }
      } catch (socketError) {
        console.warn(
          "⚠️ Failed to initialize Socket.IO, using simulated progress:",
          socketError
        );
      }

      setUploadState({
        status: "verifying",
        progress: 10,
        message: "Analyzing content... This may take 10-30 seconds.",
      });

      let currentProgress = 10;
      progressIntervalRef.current = setInterval(() => {
        if (!isUsingRealTimeProgressRef.current) {
          currentProgress = Math.min(
            currentProgress + Math.random() * 3 + 1,
            85
          );
          setUploadState((prev) => ({
            ...prev,
            progress: Math.round(currentProgress),
          }));
        }
      }, 500);

      const res = await uploadMedia({
        formData,
        token: authStatus.token!,
        uploadId,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      const uploadDuration = Date.now() - uploadStartTime;
      console.log(`✅ Upload request completed in ${uploadDuration}ms`);

      if (!isUsingRealTimeProgressRef.current) {
        setUploadState((prev) => ({
          ...prev,
          progress: 90,
          message: "Finalizing upload...",
        }));
      }

      const contentType = res.headers.get("content-type") || "";
      let result: any = null;
      let rawText: string | null = null;
      try {
        if (contentType.includes("application/json")) {
          result = await res.json();
        } else {
          rawText = await res.text();
        }
      } catch (parseError) {
        try {
          rawText = await res.text();
        } catch {}
      }

      if (!res.ok) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }

        setLoading(false);
        setUploadState({
          status: "error",
          progress: 0,
          message: "",
        });

        console.warn("❌ Upload failed:", {
          status: res.status,
          contentType,
          result,
          rawTextPreview: rawText ? rawText.slice(0, 300) : null,
        });

        cleanupSocket();

        if (res.status === 413) {
          showNotification({
            type: "warning",
            title: "File too large",
            message:
              "The file exceeds the server's size limit. Please choose a smaller file or compress your media.",
            duration: 5000,
          });
          return;
        }

        if (res.status === 403 && result) {
          const moderationResult = result.moderationResult || {};
          const errorMessage =
            result.message ||
            "Content does not meet our community guidelines.";

          const friendly = formatFriendlyRejectionMessage(
            moderationResult.status,
            moderationResult.reason,
            moderationResult.flags,
            errorMessage
          );

          showNotification({
            type: friendly.isReview ? "info" : "warning",
            title: friendly.title,
            message: friendly.message,
            duration: 6000,
          });

          setModerationError({
            message: errorMessage,
            reason: moderationResult.reason,
            flags: moderationResult.flags || [],
            status: moderationResult.status,
          });
          setUploadState({ status: "idle", progress: 0, message: "" });
          return;
        }

        const message =
          (result && (result.message || result.error)) ||
          (rawText
            ? `Unexpected response (${res.status}).`
            : `HTTP ${res.status}`);

        showNotification({
          type: "error",
          title: "Upload failed",
          message: message || "Please try again.",
          duration: 5000,
        });
        return;
      }

      cleanupSocket();

      setUploadState({
        status: "success",
        progress: 100,
        message: "Content uploaded successfully!",
      });

      if (!result) {
        console.error("❌ Upload response not JSON:", {
          status: res.status,
          contentType,
          rawTextPreview: rawText ? rawText.slice(0, 300) : null,
        });
        Alert.alert(
          "Upload failed",
          "Server returned unexpected response. Please try again."
        );
        return;
      }

      const uploaded = result.media;
      const now = new Date();

      if (__DEV__) {
        console.log(`🔍 [Upload] Inspecting backend media object:`, {
          id: uploaded._id,
          fileUrl: uploaded.fileUrl,
          playbackUrl: uploaded.playbackUrl,
          hlsUrl: uploaded.hlsUrl,
          title: uploaded.title,
        });
      }

      await useMediaStore.getState().addMediaWithUserValidation({
        _id: uploaded._id,
        title: uploaded.title,
        description: uploaded.description,
        uri: uploaded.fileUrl,
        category: uploaded.genre,
        type: uploaded.contentType,
        contentType: isSermonContent ? "sermon" : uploaded.contentType,
        fileUrl: uploaded.fileUrl,
        playbackUrl: uploaded.playbackUrl,
        hlsUrl: uploaded.hlsUrl,
        fileMimeType: uploaded.fileMimeType || file.mimeType,
        thumbnailUrl: uploaded.thumbnailUrl || uploaded.imageUrl || undefined,
        imageUrl: uploaded.thumbnailUrl || uploaded.imageUrl || "",
        duration: uploaded.duration,
        viewCount: 0,
        listenCount: 0,
        readCount: 0,
        downloadCount: 0,
        isLive: false,
        concurrentViewers: 0,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        topics: [],
        timeAgo: getTimeAgo(now.toISOString()),
        favorite: 0,
        saved: 0,
        sheared: 0,
        comments: 0,
        shared: 0,
        comment: 0,
        onPress: undefined,
      });

      console.log(`🎬 Successfully uploaded and persisted: ${uploaded.title}`);

      setLoading(false);
      setUploadState({
        status: "success",
        progress: 100,
        message: "Content has been verified and approved!",
      });

      queryClient.invalidateQueries({ queryKey: ["all-content"] });

      const destination =
        selectedType.toUpperCase() === "BOOKS"
          ? "E-BOOKS"
          : selectedType.toUpperCase();

      const navigateToFeed = () => {
        resetForm();
        router.push(`/categories/HomeScreen?default=${destination}`);
      };

      if (successNavigateTimeoutRef.current) {
        clearTimeout(successNavigateTimeoutRef.current);
      }
      successNavigateTimeoutRef.current = setTimeout(navigateToFeed, 1500);

      Alert.alert(
        "Upload Successful",
        "Your content is live. Taking you to the feed in a moment, or tap OK to go now.",
        [
          {
            text: "OK",
            onPress: () => {
              if (successNavigateTimeoutRef.current) {
                clearTimeout(successNavigateTimeoutRef.current);
                successNavigateTimeoutRef.current = null;
              }
              navigateToFeed();
            },
          },
        ]
      );
    } catch (error: any) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      cleanupSocket();

      setLoading(false);
      setUploadState({
        status: "error",
        progress: 0,
        message: "",
      });
      console.warn("❌ Upload error:", error?.message ?? error);
      console.warn("❌ Upload error details:", {
        name: error?.name,
        message: error?.message,
        status: error?.status,
        response: error?.response,
        code: error?.code,
      });

      let errorMessage = "Something went wrong.";

      if (error?.name === "AbortError") {
        errorMessage = "Request timed out. Please try again.";
      } else if (error?.message?.includes("Network request failed")) {
        errorMessage =
          "Network connection failed. Please check your internet connection and try again.";
      } else if (error?.message?.includes("timeout")) {
        errorMessage = "Request timed out. Please try again.";
      } else if (error?.message?.includes("fetch")) {
        errorMessage =
          "Unable to connect to server. Please check your internet connection.";
      } else if (error?.message) {
        errorMessage = error.message;
      }

      showNotification({
        type: "error",
        title: "Upload Failed",
        message: errorMessage,
        duration: 5000,
      });
    }
  };

  return { handleUpload };
}
