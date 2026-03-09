import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  getButtonSize,
  getInputSize,
  getKeyboardAdjustment,
  getMediaPickerSize,
  getOrientation,
  getResponsiveFontSize,
  getResponsiveSize,
  getResponsiveSpacing,
  getScreenDimensions,
  getThumbnailSize,
  getTouchTargetSize,
  isSmallScreen,
} from "../../utils/responsive";
import AuthHeader from "../components/AuthHeader";
import { useNotification } from "../context/NotificationContext";
import SocketManager from "../services/SocketManager";
import { useMediaStore } from "../store/useUploadStore";
import { getApiBaseUrl } from "../utils/api";
import TokenUtils from "../utils/tokenUtils";

import {
  logUserDataStatus,
  validateUserForUpload,
} from "../utils/userValidation";
import { API_BASE_URL, categories, contentTypes, getMaxFileSizeBytes } from "./upload/constants";
import {
  detectFileType,
  formatFriendlyRejectionMessage,
  getMimeTypeFromName,
  isImage,
  validateMediaEligibility,
} from "./upload/utils";

export default function UploadScreen() {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [file, setFile] = useState<any>(null);
  const [thumbnail, setThumbnail] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [isSermonContent, setIsSermonContent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadState, setUploadState] = useState<{
    status: "idle" | "verifying" | "uploading" | "success" | "error";
    progress: number;
    message: string;
  }>({
    status: "idle",
    progress: 0,
    message: "",
  });
  const [moderationError, setModerationError] = useState<{
    message: string;
    reason?: string;
    flags?: string[];
    status?: string;
  } | null>(null);
  const [eligibilityStatus, setEligibilityStatus] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);
  const [detectedFileType, setDetectedFileType] = useState<
    "video" | "audio" | "ebook" | "unknown"
  >("unknown");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    getOrientation()
  );
  const progressIntervalRef = useRef<any>(null);
  const socketManagerRef = useRef<SocketManager | null>(null);
  const currentUploadIdRef = useRef<string | null>(null);
  const isUsingRealTimeProgressRef = useRef<boolean>(false);
  const successNavigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  // AI Description Generation state
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [descriptionGenerationError, setDescriptionGenerationError] = useState<string | null>(null);
  const [bibleVerses, setBibleVerses] = useState<string[]>([]);

  // Check authentication status on component mount
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

  // Handle orientation changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      const newOrientation =
        window.width > window.height ? "landscape" : "portrait";
      setOrientation(newOrientation);
    });

    return () => subscription?.remove();
  }, []);

  // Validate media eligibility using extracted utility
  const validateMediaEligibilityLocal = () => {
    const result = validateMediaEligibility({
      file,
      title,
      selectedCategory,
      selectedType,
    });

    // Add warnings that depend on local state
    const warnings = [...result.warnings];
    if (file) {
      const actualFileType = detectFileType(file);
      if (!thumbnail && (selectedType === "music" || selectedType === "videos" || selectedType === "podcasts" || (selectedType === "sermon" && actualFileType === "video"))) {
        warnings.push("Thumbnail recommended for better visibility");
      }
    }
    if (description && description.length > 500) {
      warnings.push("Description should be 500 characters or less");
    }

    return {
      ...result,
      warnings,
    };
  };

  const pickMedia = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "video/mp4",
        "audio/mpeg",
        "application/pdf",
        "application/epub+zip",
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return;

    const { name, uri, mimeType } = result.assets[0];

    const guessedMime = mimeType || getMimeTypeFromName(name);

    if (isImage(name)) {
      Alert.alert("Unsupported File", "Photos/images are not allowed.");
      return;
    }

    if (guessedMime === "video/quicktime") {
      Alert.alert(
        "Unsupported Format",
        "MOV videos are not supported. Please upload an MP4 video."
      );
      return;
    }

    const fileSize = result.assets[0].size;
    console.log("📁 File selected:", {
      name,
      mimeType: guessedMime,
      size: fileSize,
      hasSize: !!fileSize,
      uri: uri?.substring(0, 50) + "...",
    });

    const selectedFile = {
      uri,
      name,
      mimeType: guessedMime,
      size: fileSize, // Add size property
    };

    setFile(selectedFile);
    // Detect and store file type for UI and validation hints
    const detectedType = detectFileType(selectedFile);
    setDetectedFileType(detectedType);

    // Validate eligibility when file is selected
    if (title && selectedCategory && selectedType) {
      const tempFile = file || selectedFile;
      const validation = validateMediaEligibilityLocal();
      setEligibilityStatus(validation);
    }
  };

  const pickThumbnail = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Please allow access to photo library to select thumbnail."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square crop like Instagram
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setThumbnail({
          uri: asset.uri,
          name: `thumbnail_${Date.now()}.jpg`,
          mimeType: "image/jpeg",
        });
      }
    } catch (error) {
      console.error("Error picking thumbnail:", error);
      Alert.alert("Error", "Failed to select thumbnail image.");
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const posted = new Date(timestamp);
    const diffMs = now.getTime() - posted.getTime();

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "NOW";
    if (minutes < 60) return `${minutes}MIN AGO`;
    if (hours < 24) return `${hours}HRS AGO`;
    return `${days}DAYS AGO`;
  };

  const checkAuthenticationStatus = async () => {
    // Check for token in multiple locations
    let token = await AsyncStorage.getItem("userToken");
    let tokenSource = "userToken";

    if (!token) {
      token = await AsyncStorage.getItem("token");
      tokenSource = "token";
    }

    if (!token) {
      try {
        const { default: SecureStore } = await import("expo-secure-store");
        token = await SecureStore.getItemAsync("jwt");
        tokenSource = "jwt";
      } catch (secureStoreError) {
        // Silent fallback
      }
    }

    const userRaw = await AsyncStorage.getItem("user");
    const user = userRaw ? JSON.parse(userRaw) : null;

    return {
      hasToken: !!token,
      token,
      tokenSource,
      hasUser: !!user,
      user,
      userRaw,
    };
  };

  // AI Description Generation function
  const generateAIDescription = async () => {
    console.log("🔵 Generate AI Description clicked", { title, file: !!file, thumbnail: !!thumbnail });

    // Validation - require title, file, and thumbnail for best results
    if (!title || title.trim().length === 0) {
      Alert.alert(
        "Title Required",
        "Please enter a title before generating a description.",
        [{ text: "OK" }]
      );
      return;
    }

    if (!file) {
      Alert.alert(
        "File Required",
        "Please upload a video or audio file for AI analysis.",
        [{ text: "OK" }]
      );
      return;
    }

    if (!thumbnail) {
      Alert.alert(
        "Thumbnail Required",
        "Please upload a thumbnail image for AI analysis.",
        [{ text: "OK" }]
      );
      return;
    }

    setIsGeneratingDescription(true);
    setDescriptionGenerationError(null);
    setBibleVerses([]);

    try {
      const token = await TokenUtils.getAuthToken();
      const formData = new FormData();

      formData.append("title", title);
      formData.append("contentType", selectedType || "videos"); // Default to videos if not set

      if (selectedCategory) {
        formData.append("category", selectedCategory);
      }

      // Add files for AI analysis (required at this point due to validation above)
      // Format file for FormData (React Native format)
      const fileSizeMB = file.size ? file.size / (1024 * 1024) : 0;
      if (fileSizeMB > 50) {
        console.warn(`File too large (${fileSizeMB.toFixed(1)}MB) for AI analysis. Backend will handle it.`);
      }
      formData.append("file", {
        uri: file.uri,
        type: file.mimeType,
        name: file.name,
        size: file.size,
      } as any);

      // Format thumbnail for FormData (React Native format)
      // Note: ImagePicker doesn't always provide size, so we estimate or skip validation
      formData.append("thumbnail", {
        uri: thumbnail.uri,
        type: thumbnail.mimeType || "image/jpeg",
        name: thumbnail.name || `thumbnail_${Date.now()}.jpg`,
      } as any);

      console.log("📤 Sending AI description request with:", {
        title,
        contentType: selectedType || "videos",
        hasFile: !!file,
        fileSizeMB: fileSizeMB > 0 ? fileSizeMB.toFixed(2) : "unknown",
        hasThumbnail: !!thumbnail,
        fileUri: file.uri?.substring(0, 50) + "...",
        thumbnailUri: thumbnail.uri?.substring(0, 50) + "...",
      });

      const headers: HeadersInit = {};

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Note: Don't set Content-Type header when using FormData
      // The runtime will automatically set it with the correct boundary

      const apiUrl = `${getApiBaseUrl()}/api/media/generate-description`;
      console.log("🌐 API URL:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: formData,
      });

      console.log("📥 Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error("❌ API Error:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const contentType = response.headers.get("content-type") || "";
      let data: any;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.warn("⚠️ Non-JSON response:", text);
        throw new Error("Server returned non-JSON response");
      }

      if (data.success && data.description) {
        // Populate description field
        setDescription(data.description);

        // Store Bible verses if available
        if (data.bibleVerses && Array.isArray(data.bibleVerses) && data.bibleVerses.length > 0) {
          setBibleVerses(data.bibleVerses);
        }

        // Show warning message if present (file too large, timeout, etc.)
        if (data.warning) {
          setDescriptionGenerationError(data.message || "Description generated with limitations");
          setTimeout(() => setDescriptionGenerationError(null), 5000);
        } else {
          // Success - clear any previous errors
          setDescriptionGenerationError(null);
        }
      } else {
        setDescriptionGenerationError(data.message || "Failed to generate description. Please try again.");
        setTimeout(() => setDescriptionGenerationError(null), 5000);
      }
    } catch (error: any) {
      console.error("Error generating description:", error);

      // Handle specific error cases
      if (error.response?.status === 429) {
        setDescriptionGenerationError("Too many requests. Please wait a minute before trying again.");
      } else if (error.response?.status === 400) {
        setDescriptionGenerationError(error.response.data?.message || "Invalid request. Please check your inputs.");
      } else if (error.message?.includes("Network")) {
        setDescriptionGenerationError("Network error. Please check your connection and try again.");
      } else {
        setDescriptionGenerationError("Failed to generate description. Please try again.");
      }
      setTimeout(() => setDescriptionGenerationError(null), 5000);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleUpload = async () => {
    // Validate eligibility before proceeding
    const validation = validateMediaEligibilityLocal();
    setEligibilityStatus(validation);

    if (!validation.isValid) {
      Alert.alert(
        "Upload Not Eligible",
        validation.errors.join("\n\n"),
        [{ text: "OK" }]
      );
      return;
    }

    if (!file || !title || !selectedCategory || !selectedType) {
      Alert.alert("Missing fields", "Please complete all required fields.");
      return;
    }

    // Check authentication before proceeding
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

    // Recommend thumbnail for music uploads
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

      // Check authentication status first
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

      // Client-side file size check (avoids 413 from server)
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

      // ✅ Validate and normalize user data
      const validation = validateUserForUpload(authStatus.user);
      const normalizedUser = validation.normalizedUser;

      logUserDataStatus(authStatus.user, "Upload");

      // Warn about missing data but don't block upload
      if (!validation.isValid) {
        console.warn(
          "⚠️ Upload with incomplete user data:",
          validation.missingFields
        );
      }

      // Ensure user data includes avatar for upload
      if (!normalizedUser.avatar && authStatus.user) {
        // Try to get avatar from various possible fields
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

      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        type: file.mimeType,
        name: file.name,
        size: file.size, // Add file size
      } as any);

      // ✅ Add thumbnail if selected
      if (thumbnail) {
        formData.append("thumbnail", {
          uri: thumbnail.uri,
          type: thumbnail.mimeType,
          name: thumbnail.name,
        } as any);
      }

      formData.append("title", title);
      formData.append("description", description);

      // Add file size as separate field for backend validation
      if (file.size) {
        formData.append("fileSize", file.size.toString());
        console.log("📊 File size added to FormData:", file.size, "bytes");
      } else {
        console.warn(
          "⚠️ No file size available - this might cause upload issues"
        );
      }

      // Handle sermon content type - determine if it should be music or videos based on file type
      let apiContentType = selectedType;
      if (selectedType === "sermon") {
        // Determine if it's audio or video based on file mime type
        if (file.mimeType.startsWith("audio/")) {
          apiContentType = "music";
        } else if (file.mimeType.startsWith("video/")) {
          apiContentType = "videos";
        } else {
          // Default to music for sermon content
          apiContentType = "music";
        }
      } else if (selectedType === "ebook") {
        // Map ebook to books for API compatibility
        apiContentType = "books";
      }

      formData.append("contentType", apiContentType);
      formData.append(
        "genre",
        JSON.stringify([selectedCategory.toLowerCase(), "All"])
      );
      formData.append("topics", JSON.stringify([]));

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

      // Add timeout to prevent hanging requests (extended for Render free tier)
      const controller = new AbortController();

      // Much longer timeouts for Render free tier (cold start can take 30+ seconds)
      const timeoutDuration = file.mimeType?.startsWith("video/")
        ? 600000 // 10 minutes for videos (large file + slow backend)
        : 300000; // 5 minutes for other files

      console.log(`⏱️ Upload timeout set to: ${timeoutDuration / 1000}s`);
      const timeoutId = setTimeout(() => {
        console.log("⏱️ Upload timed out, aborting...");
        controller.abort();
      }, timeoutDuration);

      console.log("📤 Starting upload request...");
      const uploadStartTime = Date.now();

      // Generate uploadId for tracking
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

          // Access underlying socket to listen for upload-progress events
          const socket = (socketManager as any).socket;
          if (socket) {
            socketManagerRef.current = socketManager;

            // Set up upload progress listener BEFORE checking connection status
            // This way we catch events even if connection happens later
            const handleUploadProgress = (progressData: {
              uploadId: string;
              progress: number;
              stage: string;
              message: string;
              timestamp: string;
            }) => {
              // Only process progress for current upload
              if (progressData.uploadId === uploadId) {
                console.log("📊 Real-time progress update:", progressData);

                // Switch to real-time progress if we were using simulated
                if (!isUsingRealTimeProgressRef.current) {
                  console.log("🔄 Switching from simulated to real-time progress");
                  isUsingRealTimeProgressRef.current = true;

                  // Clear simulated progress interval
                  if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                    progressIntervalRef.current = null;
                  }
                }

                // Map backend stages to frontend status
                let status: "verifying" | "uploading" | "success" | "error" = "verifying";
                if (progressData.stage === "complete") {
                  status = "success";
                } else if (progressData.stage === "error" || progressData.stage === "rejected") {
                  status = "error";
                  // Clean up on error/rejection
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

            // Check if already connected, or wait for connection
            if (socket.connected) {
              console.log("✅ Socket.IO already connected for real-time progress");
              isUsingRealTimeProgressRef.current = true;
            } else {
              // Wait for connection event (with timeout)
              const connectionTimeout = setTimeout(() => {
                if (!socket.connected) {
                  console.warn("⚠️ Socket.IO connection timeout, using simulated progress");
                }
              }, 3000); // 3 second timeout

              socket.once("connect", () => {
                clearTimeout(connectionTimeout);
                console.log("✅ Socket.IO connected for real-time progress");
                isUsingRealTimeProgressRef.current = true;

                // Clear simulated progress if it was started
                if (progressIntervalRef.current) {
                  clearInterval(progressIntervalRef.current);
                  progressIntervalRef.current = null;
                }
              });
            }
          } else {
            console.warn("⚠️ Socket.IO socket not available, using simulated progress");
          }
        }
      } catch (socketError) {
        console.warn("⚠️ Failed to initialize Socket.IO, using simulated progress:", socketError);
      }

      // Update state to show verification in progress
      setUploadState({
        status: "verifying",
        progress: 10, // Start at 10%
        message: "Analyzing content... This may take 10-30 seconds.",
      });

      // Start dynamic progress simulation as fallback (only if real-time isn't working)
      let currentProgress = 10;
      progressIntervalRef.current = setInterval(() => {
        // Only update if we're not using real-time progress
        if (!isUsingRealTimeProgressRef.current) {
          // Gradually increase progress, but cap at 85% until upload completes
          currentProgress = Math.min(currentProgress + Math.random() * 3 + 1, 85);
          setUploadState((prev) => ({
            ...prev,
            progress: Math.round(currentProgress),
          }));
        }
      }, 500); // Update every 500ms

      const res = await fetch(`${API_BASE_URL}/api/media/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authStatus.token}`,
          Accept: "application/json",
          "expo-platform": Platform.OS,
          // Optional: Include uploadId in header for backend tracking
          "X-Upload-ID": uploadId,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Clear progress interval when request completes (if still running)
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      const uploadDuration = Date.now() - uploadStartTime;
      console.log(`✅ Upload request completed in ${uploadDuration}ms`);

      // Update progress to 90% when response is received (only if not using real-time)
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
        } catch { }
      }

      // Handle different response statuses
      if (!res.ok) {
        // Clear progress interval on error
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

        // Clean up Socket.IO connection on error
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

        // Handle 413 Payload Too Large (nginx/server body size limit)
        if (res.status === 413) {
          showNotification({
            type: "warning",
            title: "File too large",
            message: "The file exceeds the server's size limit. Please choose a smaller file or compress your media.",
            duration: 5000
          });
          return;
        }

        // Handle 403 Forbidden - Content Rejected or Requires Review (show in-app modal)
        if (res.status === 403 && result) {
          const moderationResult = result.moderationResult || {};
          const errorMessage = result.message || "Content does not meet our community guidelines.";

          // Also show a non-blocking notification for quick feedback
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
            duration: 6000
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

        // Handle other errors
        const message =
          (result && (result.message || result.error)) ||
          (rawText
            ? `Unexpected response (${res.status}).`
            : `HTTP ${res.status}`);

        showNotification({
          type: "error",
          title: "Upload failed",
          message: message || "Please try again.",
          duration: 5000
        });
        return;
      }

      // Clean up Socket.IO connection
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

      // Update state to show upload success
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
          title: uploaded.title
        });
      }

      // 🛡️ Use the new validation method to ensure fresh user data

      await useMediaStore.getState().addMediaWithUserValidation({
        _id: uploaded._id,
        title: uploaded.title,
        description: uploaded.description,
        uri: uploaded.fileUrl,
        category: uploaded.genre,
        type: uploaded.contentType,
        contentType: isSermonContent ? "sermon" : uploaded.contentType, // Override content type for sermon
        fileUrl: uploaded.fileUrl,
        playbackUrl: uploaded.playbackUrl,
        hlsUrl: uploaded.hlsUrl,
        fileMimeType: uploaded.fileMimeType || file.mimeType,
        // Visual cover fields
        thumbnailUrl: uploaded.thumbnailUrl || uploaded.imageUrl || undefined,
        imageUrl: uploaded.thumbnailUrl || uploaded.imageUrl || "",
        // Duration from backend (seconds) - required for progress bar / time display
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
        setTitle("");
        setDescription("");
        setSelectedCategory("");
        setSelectedType("");
        setIsSermonContent(false);
        setFile(null);
        setThumbnail(null);
        setModerationError(null);
        setEligibilityStatus(null);
        setUploadState({ status: "idle", progress: 0, message: "" });
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
      // Clean up on error
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      // Clean up Socket.IO connection
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

      // Provide more specific error messages
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
        duration: 5000
      });
    }
  };

  const renderTag = (
    label: string,
    value: string,
    selected: string,
    setSelected: (val: string) => void
  ) => {
    const isSelected = value === selected;
    const tagPaddingHorizontal = getResponsiveSpacing(10, 14, 18);
    const tagPaddingVertical = getResponsiveSpacing(6, 8, 10);
    const tagFontSize = getResponsiveFontSize(12, 14, 16);
    const touchTargetSize = getTouchTargetSize();

    return (
      <TouchableOpacity
        key={value}
        onPress={() => {
          setSelected(value);
          // Check if Sermons is selected
          if (label === "Sermons") {
            setIsSermonContent(true);
          } else {
            setIsSermonContent(false);
          }
          // Re-validate eligibility when selection changes
          setTimeout(() => {
            const validation = validateMediaEligibilityLocal();
            setEligibilityStatus(validation);
          }, 100);
        }}
        className={`rounded-full mr-2 mb-2 border ${isSelected ? "bg-black border-black" : "bg-white border-gray-300"
          }`}
        style={{
          paddingHorizontal: tagPaddingHorizontal,
          paddingVertical: tagPaddingVertical,
          minHeight: touchTargetSize,
        }}
        activeOpacity={0.8}
      >
        <Text
          className={isSelected ? "text-white" : "text-black"}
          style={{ fontSize: tagFontSize }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Video player for preview (only when file is selected)
  const previewVideoPlayer = useVideoPlayer(
    file && file.mimeType?.startsWith("video") ? file.uri : "",
    (player) => {
      player.loop = false;
      player.muted = false;
    }
  );

  // Responsive layout for media pickers
  const renderMediaPickers = () => {
    const mediaSize = getMediaPickerSize();
    const thumbnailSize = getThumbnailSize();
    const containerPadding = getResponsiveSpacing(16, 20, 24, 32);
    const { width: screenWidth } = getScreenDimensions();

    // On small screens or landscape, stack vertically
    if (isSmallScreen || orientation === "landscape") {
      return (
        <View
          className="items-center"
          style={{ paddingHorizontal: containerPadding }}
        >
          {/* Main Media Picker */}
          <TouchableOpacity
            onPress={pickMedia}
            className="bg-gray-200 rounded-xl items-center justify-center mb-4"
            style={{
              width: mediaSize.width,
              height: mediaSize.height,
            }}
            activeOpacity={0.8}
          >
            {!file ? (
              <View className="items-center">
                <Feather
                  name="plus"
                  size={getResponsiveSize(30, 35, 40)}
                  color="gray"
                />
                <Text
                  className="text-gray-600 text-center mt-2"
                  style={{ fontSize: getResponsiveFontSize(10, 11, 12) }}
                >
                  Select Media
                </Text>
              </View>
            ) : file.mimeType.startsWith("video") && previewVideoPlayer ? (
              <VideoView
                player={previewVideoPlayer}
                contentFit="cover"
                nativeControls={true}
                allowsFullscreen={false}
                style={{ width: "100%", height: "100%", borderRadius: 12 }}
              />
            ) : (
              <Text
                className="px-4 text-gray-700 text-center"
                style={{ fontSize: getResponsiveFontSize(10, 11, 12) }}
              >
                {file.name}
              </Text>
            )}
          </TouchableOpacity>

          {/* Thumbnail Picker */}
          <TouchableOpacity
            onPress={pickThumbnail}
            className="bg-gray-100 rounded-lg items-center justify-center border-2 border-dashed border-gray-300"
            style={{
              width: thumbnailSize.width,
              height: thumbnailSize.height,
            }}
            activeOpacity={0.8}
          >
            {!thumbnail ? (
              <View className="items-center">
                <Feather
                  name="image"
                  size={getResponsiveSize(25, 30, 35)}
                  color="gray"
                />
                <Text
                  className="text-gray-600 text-center mt-2"
                  style={{ fontSize: getResponsiveFontSize(10, 11, 12) }}
                >
                  Select{"\n"}Cover Photo
                </Text>
              </View>
            ) : (
              <Image
                source={{ uri: thumbnail.uri || undefined }}
                style={{ width: "100%", height: "100%", borderRadius: 8 }}
                resizeMode="cover"
              />
            )}
          </TouchableOpacity>
        </View>
      );
    }

    // On larger screens, use horizontal layout
    return (
      <View
        className="flex-row justify-center items-start"
        style={{ paddingHorizontal: containerPadding }}
      >
        {/* Main Media Picker */}
        <TouchableOpacity
          onPress={pickMedia}
          className="bg-gray-200 rounded-xl items-center justify-center mr-3"
          style={{
            width: mediaSize.width,
            height: mediaSize.height,
          }}
          activeOpacity={0.8}
        >
          {!file ? (
            <View className="items-center">
              <Feather
                name="plus"
                size={getResponsiveSize(30, 35, 40)}
                color="gray"
              />
              <Text
                className="text-gray-600 text-center mt-2"
                style={{ fontSize: getResponsiveFontSize(10, 11, 12) }}
              >
                Select Media
              </Text>
            </View>
          ) : file.mimeType.startsWith("video") && previewVideoPlayer ? (
            <VideoView
              player={previewVideoPlayer}
              contentFit="cover"
              nativeControls={true}
              allowsFullscreen={false}
              style={{ width: "100%", height: "100%", borderRadius: 12 }}
            />
          ) : (
            <Text
              className="px-4 text-gray-700 text-center"
              style={{ fontSize: getResponsiveFontSize(10, 11, 12) }}
            >
              {file.name}
            </Text>
          )}
        </TouchableOpacity>

        {/* Thumbnail Picker */}
        <TouchableOpacity
          onPress={pickThumbnail}
          className="bg-gray-100 rounded-lg items-center justify-center border-2 border-dashed border-gray-300"
          style={{
            width: thumbnailSize.width,
            height: thumbnailSize.height,
          }}
          activeOpacity={0.8}
        >
          {!thumbnail ? (
            <View className="items-center">
              <Feather
                name="image"
                size={getResponsiveSize(25, 30, 35)}
                color="gray"
              />
              <Text
                className="text-gray-600 text-center mt-2"
                style={{ fontSize: getResponsiveFontSize(10, 11, 12) }}
              >
                Select{"\n"}Cover Photo
              </Text>
            </View>
          ) : (
            <Image
              source={{ uri: thumbnail.uri || undefined }}
              style={{ width: "100%", height: "100%", borderRadius: 8 }}
              resizeMode="cover"
            />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // Get loading message based on upload state
  const getLoadingMessage = () => {
    if (uploadState.status === "verifying") {
      return uploadState.message || "Analyzing content...";
    }
    if (uploadState.status === "uploading") {
      return "Uploading approved content...";
    }
    return "Processing...";
  };

  return (
    <>
      {/* Upload Progress Modal */}
      <Modal
        visible={loading}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          // Prevent closing during upload
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 20,
              padding: getResponsiveSpacing(24, 32, 40),
              alignItems: "center",
              minWidth: 280,
              maxWidth: "85%",
              shadowColor: "#000",
              shadowOffset: {
                width: 0,
                height: 2,
              },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
          >
            <ActivityIndicator size="large" color="#000" />
            <Text
              style={{
                marginTop: getResponsiveSpacing(16, 20, 24),
                fontSize: getResponsiveFontSize(16, 18, 20),
                fontWeight: "600",
                textAlign: "center",
                color: "#333",
              }}
            >
              {getLoadingMessage()}
            </Text>
            {uploadState.progress > 0 && (
              <View
                style={{
                  width: "100%",
                  marginTop: getResponsiveSpacing(16, 20, 24),
                }}
              >
                <View
                  style={{
                    width: "100%",
                    height: 4,
                    backgroundColor: "#e0e0e0",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${uploadState.progress}%`,
                      height: "100%",
                      backgroundColor: "#000",
                      borderRadius: 2,
                    }}
                  />
                </View>
                {uploadState.progress < 100 && (
                  <Text
                    style={{
                      marginTop: 8,
                      fontSize: getResponsiveFontSize(12, 14, 16),
                      color: "#666",
                      textAlign: "center",
                    }}
                  >
                    {uploadState.progress}%
                  </Text>
                )}
              </View>
            )}
            {uploadState.status === "verifying" && (
              <Text
                style={{
                  marginTop: getResponsiveSpacing(12, 16, 20),
                  fontSize: getResponsiveFontSize(12, 14, 16),
                  color: "#666",
                  textAlign: "center",
                  fontStyle: "italic",
                }}
              >
                This may take 10-30 seconds
              </Text>
            )}
          </View>
        </View>
      </Modal>

      {/* Moderation / under review modal - shown for 403 (rejected or under_review) */}
      <Modal
        visible={!!moderationError}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setModerationError(null);
          setUploadState({ status: "idle", progress: 0, message: "" });
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: getResponsiveSpacing(20, 24, 32),
          }}
          onPress={() => { }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#fff",
              borderRadius: 20,
              padding: getResponsiveSpacing(24, 28, 36),
              width: "100%",
              maxWidth: 400,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            {moderationError && (() => {
              const friendly = formatFriendlyRejectionMessage(
                moderationError.status,
                moderationError.reason,
                moderationError.flags,
                moderationError.message
              );
              const isReview = friendly.isReview;
              return (
                <>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: isReview ? "rgba(255, 193, 7, 0.2)" : "rgba(255, 152, 0, 0.2)",
                      justifyContent: "center",
                      alignItems: "center",
                      alignSelf: "center",
                      marginBottom: getResponsiveSpacing(16, 20, 24),
                    }}
                  >
                    <Ionicons
                      name={isReview ? "time-outline" : "bulb-outline"}
                      size={32}
                      color={isReview ? "#b38600" : "#e65100"}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: getResponsiveFontSize(18, 20, 22),
                      fontWeight: "600",
                      textAlign: "center",
                      color: "#1a1a1a",
                      marginBottom: getResponsiveSpacing(12, 14, 16),
                    }}
                  >
                    {friendly.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: getResponsiveFontSize(14, 15, 16),
                      lineHeight: 22,
                      textAlign: "center",
                      color: "#444",
                      marginBottom: getResponsiveSpacing(16, 20, 24),
                    }}
                  >
                    {friendly.message}
                  </Text>
                  {!isReview && (
                    <View
                      style={{
                        backgroundColor: "rgba(255, 193, 7, 0.08)",
                        padding: getResponsiveSpacing(12, 14, 16),
                        borderRadius: 12,
                        marginBottom: getResponsiveSpacing(16, 20, 24),
                      }}
                    >
                      <Text
                        style={{
                          fontSize: getResponsiveFontSize(12, 13, 14),
                          color: "#666",
                          fontStyle: "italic",
                          textAlign: "center",
                        }}
                      >
                        Tip: Review your content to align with our gospel community guidelines, then try again.
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => {
                      setModerationError(null);
                      if (!isReview) {
                        setUploadState({ status: "idle", progress: 0, message: "" });
                      }
                    }}
                    style={{
                      backgroundColor: isReview ? "#b38600" : "#e65100",
                      paddingVertical: getResponsiveSpacing(14, 16, 18),
                      borderRadius: 12,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: getResponsiveFontSize(15, 16, 17),
                        fontWeight: "600",
                        color: "#fff",
                      }}
                    >
                      {isReview ? "Got it" : "Try again"}
                    </Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <KeyboardAvoidingView
        {...getKeyboardAdjustment()}
        className="flex-1 bg-white"
      >
        <View style={{ flex: 1 }}>
          {/* Fixed top header (back / close) – does NOT scroll */}
          <View
            style={{
              paddingHorizontal: getResponsiveSpacing(16, 20, 24, 32),
              paddingTop: getResponsiveSpacing(16, 20, 24, 32),
            }}
          >
            <AuthHeader title="New Upload" />
          </View>

          {/* Scrollable form content */}
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingBottom: getResponsiveSpacing(20, 30, 40),
              minHeight: getScreenDimensions().height - 100, // Ensure content fills screen
            }}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                paddingHorizontal: getResponsiveSpacing(16, 20, 24, 32),
                paddingTop: getResponsiveSpacing(8, 10, 12, 16),
              }}
            >
              {/* Media and Thumbnail Pickers */}
              <View className="mt-2 mb-6">{renderMediaPickers()}</View>

              {/* Premium Upload Limits Plate */}
              <View
                className="flex-row items-center px-5 py-4 mb-6 rounded-2xl"
                style={{
                  backgroundColor: "#F8FAFC",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 15,
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 12
                  }}
                >
                  <Ionicons
                    name="information-circle"
                    size={22}
                    color="#3B82F6"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: "#1E293B",
                      fontFamily: "Rubik-SemiBold",
                      fontSize: getResponsiveFontSize(13, 14, 15),
                      marginBottom: 2
                    }}
                  >
                    Upload Guidelines
                  </Text>
                  <Text
                    style={{
                      color: "#64748B",
                      fontFamily: "Rubik-Regular",
                      fontSize: getResponsiveFontSize(11, 12, 13),
                      lineHeight: 18,
                    }}
                  >
                    {selectedType === "music"
                      ? "Max 50 MB per file • 50 songs total limit • Max 10 uploads/hr"
                      : selectedType === "sermon" || selectedType === "videos"
                        ? "Max 300 MB per file • 30 videos total limit • Max 10 uploads/hr"
                        : selectedType === "books" || selectedType === "ebook"
                          ? "Max 100 MB per file • Max 10 uploads/hr"
                          : "Max 300 MB (videos) • 50 MB (music) • 100 MB (books)"}
                  </Text>
                </View>
              </View>


              {/* Form Fields */}
              <View className="flex-1">
                <Text className="text-xs text-gray-600 mb-1 font-medium">
                  TITLE
                </Text>
                <TextInput
                  placeholder="Enter title..."
                  value={title}
                  onChangeText={(text) => {
                    setTitle(text);
                    // Re-validate when title changes
                    if (file && selectedCategory && selectedType) {
                      setTimeout(() => {
                        const validation = validateMediaEligibilityLocal();
                        setEligibilityStatus(validation);
                      }, 100);
                    }
                  }}
                  multiline
                  textAlignVertical="top"
                  className="border border-gray-300 rounded-md mb-4 px-3 py-3 bg-white"
                  style={{
                    minHeight: getInputSize().height,
                    maxHeight: 100,
                    fontSize: getInputSize().fontSize,
                  }}
                />

                <Text className="text-xs text-gray-600 mb-1 font-medium">
                  DESCRIPTION
                </Text>
                <TextInput
                  placeholder="Enter description..."
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  textAlignVertical="top"
                  className="border border-gray-300 rounded-md mb-2 px-3 py-3 bg-white"
                  style={{
                    minHeight: getResponsiveSpacing(80, 100, 120),
                    maxHeight: 200,
                    fontSize: getInputSize().fontSize,
                  }}
                />

                {/* AI Description Generation Button */}
                {(() => {
                  const isReady = title && file && thumbnail;
                  const isDisabled = isGeneratingDescription || !isReady;

                  return (
                    <View className="mb-3" style={{ zIndex: 10 }}>
                      <TouchableOpacity
                        onPress={() => {
                          console.log("🔵 Button pressed", {
                            isGeneratingDescription,
                            title: !!title,
                            file: !!file,
                            thumbnail: !!thumbnail,
                            isReady
                          });
                          generateAIDescription();
                        }}
                        disabled={isDisabled}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={{
                          opacity: isDisabled ? 0.5 : 1,
                        }}
                      >
                        <View
                          className="flex-row items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: isGeneratingDescription
                              ? "rgba(223, 147, 14, 0.3)"
                              : isReady
                                ? "rgba(223, 147, 14, 0.12)"
                                : "rgba(223, 147, 14, 0.08)",
                            borderWidth: 1,
                            borderColor: isGeneratingDescription
                              ? "rgba(223, 147, 14, 0.4)"
                              : isReady
                                ? "rgba(223, 147, 14, 0.3)"
                                : "rgba(223, 147, 14, 0.2)",
                            paddingVertical: getResponsiveSpacing(10, 12, 14),
                            paddingHorizontal: getResponsiveSpacing(16, 18, 20),
                            minHeight: getTouchTargetSize(),
                          }}
                        >
                          {isGeneratingDescription ? (
                            <>
                              <ActivityIndicator
                                size="small"
                                color="#DF930E"
                                style={{ marginRight: 8 }}
                              />
                              <Text
                                style={{
                                  fontSize: getResponsiveFontSize(13, 14, 15),
                                  color: "#DF930E",
                                  fontFamily: "Rubik-Medium",
                                }}
                              >
                                Analyzing content...
                              </Text>
                            </>
                          ) : !isReady ? (
                            <>
                              <Ionicons
                                name="sparkles-outline"
                                size={16}
                                color="#94a3b8"
                                style={{ marginRight: 6 }}
                              />
                              <Text
                                style={{
                                  fontSize: getResponsiveFontSize(13, 14, 15),
                                  color: "#94a3b8",
                                  fontFamily: "Rubik-Medium",
                                }}
                              >
                                {!title ? "Enter title to enable" : !file ? "Upload file to enable" : "Upload thumbnail to enable"}
                              </Text>
                            </>
                          ) : (
                            <>
                              <Ionicons
                                name="sparkles"
                                size={16}
                                color="#DF930E"
                                style={{ marginRight: 6 }}
                              />
                              <Text
                                style={{
                                  fontSize: getResponsiveFontSize(13, 14, 15),
                                  color: "#DF930E",
                                  fontFamily: "Rubik-Medium",
                                }}
                              >
                                Generate Description with AI
                              </Text>
                            </>
                          )}
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })()}

                {/* Bible Verses Display */}
                {bibleVerses.length > 0 && (
                  <View
                    className="mb-3 p-3 rounded-lg"
                    style={{
                      backgroundColor: "rgba(223, 147, 14, 0.05)",
                      borderLeftWidth: 3,
                      borderLeftColor: "#DF930E",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: getResponsiveFontSize(11, 12, 13),
                        color: "#475569",
                        fontFamily: "Rubik-Medium",
                        marginBottom: 6,
                      }}
                    >
                      📖 Suggested Bible Verses:
                    </Text>
                    {bibleVerses.map((verse, index) => (
                      <Text
                        key={index}
                        style={{
                          fontSize: getResponsiveFontSize(11, 12, 13),
                          color: "#64748b",
                          fontFamily: "Rubik-Regular",
                          marginLeft: 8,
                          marginBottom: 4,
                        }}
                      >
                        • {verse}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Error/Warning Message */}
                {descriptionGenerationError && (
                  <View
                    className="mb-3 p-2.5 rounded-lg"
                    style={{
                      backgroundColor: descriptionGenerationError.includes("too large") ||
                        descriptionGenerationError.includes("timed out") ||
                        descriptionGenerationError.includes("limitations")
                        ? "rgba(255, 193, 7, 0.1)"
                        : "rgba(239, 68, 68, 0.1)",
                      borderWidth: 1,
                      borderColor: descriptionGenerationError.includes("too large") ||
                        descriptionGenerationError.includes("timed out") ||
                        descriptionGenerationError.includes("limitations")
                        ? "rgba(255, 193, 7, 0.3)"
                        : "rgba(239, 68, 68, 0.3)",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: getResponsiveFontSize(11, 12, 13),
                        color: descriptionGenerationError.includes("too large") ||
                          descriptionGenerationError.includes("timed out") ||
                          descriptionGenerationError.includes("limitations")
                          ? "#92400e"
                          : "#991b1b",
                        fontFamily: "Rubik-Regular",
                      }}
                    >
                      {descriptionGenerationError.includes("too large") ||
                        descriptionGenerationError.includes("timed out") ||
                        descriptionGenerationError.includes("limitations")
                        ? "⚠️ "
                        : "❌ "}
                      {descriptionGenerationError}
                    </Text>
                  </View>
                )}

                {/* Categories */}
                <Text className="text-xs text-gray-600 mb-2 font-medium">
                  CATEGORY
                </Text>
                <View className="flex-row flex-wrap mb-4">
                  {categories.map((item) =>
                    renderTag(item, item, selectedCategory, setSelectedCategory)
                  )}
                </View>

                {/* Content Types */}
                <Text className="text-xs text-gray-600 mb-2 font-medium">
                  CONTENT TYPE
                </Text>
                {file && (
                  <Text
                    className="text-[11px] text-gray-500 mb-1"
                    style={{ fontSize: getResponsiveFontSize(10, 11, 12) }}
                  >
                    {detectedFileType === "video" && "Detected file: Video (e.g. MP4)"}
                    {detectedFileType === "audio" && "Detected file: Audio (e.g. MP3, WAV)"}
                    {detectedFileType === "ebook" &&
                      "Detected file: Document / Ebook (e.g. PDF, EPUB)"}
                    {detectedFileType === "unknown" &&
                      "File type not recognized yet. Please choose the correct content type."}
                  </Text>
                )}
                <View className="flex-row flex-wrap mb-4">
                  {contentTypes.map((item) =>
                    renderTag(
                      item.label,
                      item.value,
                      selectedType,
                      setSelectedType
                    )
                  ) || null}
                </View>

                {/* Redesigned Eligibility Status Indicator */}
                {eligibilityStatus && (
                  <View
                    className="mb-6 p-4 rounded-xl border-l-[4px]"
                    style={{
                      backgroundColor: eligibilityStatus.isValid
                        ? "rgba(34, 197, 94, 0.03)"
                        : "rgba(239, 68, 68, 0.03)",
                      borderLeftColor: eligibilityStatus.isValid ? "#22c55e" : "#ef4444",
                      borderTopColor: "rgba(0,0,0,0.05)",
                      borderRightColor: "rgba(0,0,0,0.05)",
                      borderBottomColor: "rgba(0,0,0,0.05)",
                      borderWidth: 1,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.03,
                      shadowRadius: 4,
                      elevation: 1,
                    }}
                  >
                    {eligibilityStatus.isValid ? (
                      <View className="flex-row items-center">
                        <View
                          style={{
                            width: 24, height: 24, borderRadius: 12,
                            backgroundColor: "rgba(34, 197, 94, 0.15)",
                            justifyContent: 'center', alignItems: 'center'
                          }}
                        >
                          <Ionicons name="checkmark" size={16} color="#166534" />
                        </View>
                        <Text
                          className="ml-3 font-medium"
                          style={{
                            fontSize: getResponsiveFontSize(12, 14, 15),
                            color: "#166534",
                            fontFamily: "Rubik-Medium"
                          }}
                        >
                          Ready to post - AI verification active
                        </Text>
                      </View>
                    ) : (
                      <View>
                        <View className="flex-row items-center mb-3">
                          <View
                            style={{
                              width: 24, height: 24, borderRadius: 12,
                              backgroundColor: "rgba(239, 68, 68, 0.1)",
                              justifyContent: 'center', alignItems: 'center'
                            }}
                          >
                            <Ionicons name="alert-circle" size={18} color="#991b1b" />
                          </View>
                          <Text
                            className="ml-3 font-semibold"
                            style={{
                              fontSize: getResponsiveFontSize(13, 15, 17),
                              color: "#991b1b",
                              fontFamily: "Rubik-SemiBold"
                            }}
                          >
                            Upload Requirements:
                          </Text>
                        </View>
                        <View className="ml-9">
                          {eligibilityStatus.errors.map((error, index) => (
                            <View key={index} className="flex-row items-start mb-1.5">
                              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "#ef4444", marginTop: 7, marginRight: 8 }} />
                              <Text
                                style={{
                                  fontSize: getResponsiveFontSize(11, 13, 14),
                                  color: "#7f1d1d",
                                  lineHeight: 18,
                                  fontFamily: "Rubik-Regular"
                                }}
                              >
                                {error}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                )}

              </View>

              {/* Moderation Error Display */}
              {moderationError && (() => {
                const friendlyMessage = formatFriendlyRejectionMessage(
                  moderationError.status,
                  moderationError.reason,
                  moderationError.flags,
                  moderationError.message
                );

                return (
                  <View
                    className="mt-4 p-4 rounded-lg border"
                    style={{
                      backgroundColor:
                        friendlyMessage.isReview
                          ? "rgba(255, 193, 7, 0.1)"
                          : "rgba(255, 152, 0, 0.1)",
                      borderColor:
                        friendlyMessage.isReview
                          ? "#ffc107"
                          : "#ff9800",
                    }}
                  >
                    <View className="flex-row items-center mb-3">
                      <Ionicons
                        name={
                          friendlyMessage.isReview
                            ? "time-outline"
                            : "bulb-outline"
                        }
                        size={24}
                        color={
                          friendlyMessage.isReview
                            ? "#ffc107"
                            : "#ff9800"
                        }
                      />
                      <Text
                        className="ml-2 font-semibold"
                        style={{
                          fontSize: getResponsiveFontSize(16, 18, 20),
                          color:
                            friendlyMessage.isReview
                              ? "#856404"
                              : "#e65100",
                          fontFamily: "Rubik-Medium",
                        }}
                      >
                        {friendlyMessage.title}
                      </Text>
                    </View>
                    <Text
                      className="mb-3"
                      style={{
                        fontSize: getResponsiveFontSize(14, 16, 18),
                        color: "#333",
                        lineHeight: 22,
                        fontFamily: "Rubik-Regular",
                      }}
                    >
                      {friendlyMessage.message}
                    </Text>
                    {!friendlyMessage.isReview && (
                      <View
                        className="p-3 rounded-md mb-3"
                        style={{
                          backgroundColor: "rgba(255, 193, 7, 0.05)",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: getResponsiveFontSize(12, 13, 14),
                            color: "#666",
                            fontFamily: "Rubik-Regular",
                            fontStyle: "italic",
                          }}
                        >
                          💡 Tip: Review your content and make sure it aligns with our gospel community guidelines.
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => {
                        setModerationError(null);
                        if (!friendlyMessage.isReview) {
                          setUploadState({ status: "idle", progress: 0, message: "" });
                        }
                      }}
                      className="bg-gray-200 rounded-lg py-3 px-4 items-center"
                      style={{
                        backgroundColor: friendlyMessage.isReview ? "#ffc107" : "#ff9800",
                      }}
                    >
                      <Text
                        className="font-medium"
                        style={{
                          fontSize: getResponsiveFontSize(14, 16, 18),
                          color: "#fff",
                          fontFamily: "Rubik-Medium",
                        }}
                      >
                        {friendlyMessage.isReview ? "Got it" : "Try Again"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })()}

              {/* Upload Button Section */}
              <View className="items-center mt-6">
                {/* Redesigned AI Verification Plate (Premium Glass-styled) */}
                <View
                  className="flex-row items-center px-5 py-4 mb-8 rounded-2xl"
                  style={{
                    backgroundColor: "rgba(0, 0, 0, 0.015)",
                    borderWidth: 1,
                    borderColor: "rgba(0, 0, 0, 0.04)",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.02,
                    shadowRadius: 10,
                    width: "100%",
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      backgroundColor: "#FFFFFF",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 16,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: 2
                    }}
                  >
                    <Ionicons
                      name="shield-checkmark"
                      size={24}
                      color="#10b981"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "#1f2937",
                        fontFamily: "Rubik-SemiBold",
                        fontSize: getResponsiveFontSize(13, 14, 15),
                        marginBottom: 1
                      }}
                    >
                      Jevah AI Protected
                    </Text>
                    <Text
                      style={{
                        color: "#6b7280",
                        fontFamily: "Rubik-Regular",
                        fontSize: getResponsiveFontSize(11, 12, 13),
                        lineHeight: 16,
                      }}
                    >
                      Safe community verification active. Ensure you own the rights to this media.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={async () => {
                    const stopAudio = useMediaStore.getState().stopAudioFn;
                    if (stopAudio) await stopAudio();
                    handleUpload();
                  }}
                  className="bg-black justify-center rounded-full items-center"
                  style={{
                    width: Math.min(
                      getScreenDimensions().width -
                      getResponsiveSpacing(16, 20, 24, 32) * 2,
                      300
                    ),
                    height: getButtonSize().height,
                    minHeight: getTouchTargetSize(), // Ensure minimum touch target
                    opacity: uploadState.status === "verifying" ? 0.5 : 1,
                  }}
                  activeOpacity={0.8}
                  disabled={uploadState.status === "verifying"}
                >
                  <Text
                    className="text-white font-semibold"
                    style={{ fontSize: getResponsiveFontSize(16, 18, 20) }}
                  >
                    {uploadState.status === "verifying" ? "Verifying..." : "Post"}
                  </Text>
                </TouchableOpacity>
              </View>
              {/* Close scroll content container View */}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

