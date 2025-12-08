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
import { useVideoPlayer, VideoView } from "expo-video";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
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
import { useMediaStore } from "../store/useUploadStore";
import SocketManager from "../services/SocketManager";
import TokenUtils from "../utils/tokenUtils";

import {
  logUserDataStatus,
  validateUserForUpload,
} from "../utils/userValidation";

// Use the correct API base URL for uploads
const API_BASE_URL = "https://jevahapp-backend-rped.onrender.com";

const categories = [
  "Worship",
  "Inspiration",
  "Youth",
  "Teachings",
  "Marriage",
  "Counselling",
];

const contentTypes = [
  { label: "Music", value: "music" },
  { label: "Videos", value: "videos" },
  { label: "Books", value: "books" },
  { label: "Ebook", value: "ebook" },
  { label: "Podcasts", value: "podcasts" },
  { label: "Sermons", value: "sermon" },
];

export default function UploadScreen() {
  const router = useRouter();
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
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const socketManagerRef = useRef<SocketManager | null>(null);
  const currentUploadIdRef = useRef<string | null>(null);
  const isUsingRealTimeProgressRef = useRef<boolean>(false);

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

  // Cleanup Socket.IO connection on unmount
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

  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(name);

  const getMimeTypeFromName = (filename: string): string => {
    if (filename.endsWith(".mp4")) return "video/mp4";
    if (filename.endsWith(".mov")) return "video/quicktime";
    if (filename.endsWith(".mp3")) return "audio/mpeg";
    if (filename.endsWith(".wav")) return "audio/wav";
    if (filename.endsWith(".pdf")) return "application/pdf";
    if (filename.endsWith(".epub")) return "application/epub+zip";
    return "application/octet-stream";
  };

  // Detect actual file type from file extension and mime type
  const detectFileType = (file: any): "video" | "audio" | "ebook" | "unknown" => {
    if (!file) return "unknown";
    
    const fileExtension = file.name?.split(".").pop()?.toLowerCase() || "";
    const mimeType = file.mimeType || "";
    
    // Video formats
    const videoFormats = ["mp4", "mov", "avi", "mkv", "webm"];
    const videoMimes = ["video/"];
    
    // Audio formats
    const audioFormats = ["mp3", "wav", "aac", "m4a", "ogg", "flac", "wma"];
    const audioMimes = ["audio/"];
    
    // Ebook formats
    const ebookFormats = ["pdf", "epub", "mobi"];
    const ebookMimes = [
      "application/pdf",
      "application/epub",
      "application/epub+zip",
      "application/x-mobipocket-ebook",
    ];
    
    // Check by mime type first (more reliable)
    if (mimeType) {
      if (videoMimes.some((mime) => mimeType.toLowerCase().startsWith(mime))) {
        return "video";
      }
      if (audioMimes.some((mime) => mimeType.toLowerCase().startsWith(mime))) {
        return "audio";
      }
      if (ebookMimes.some((mime) => mimeType.toLowerCase().includes(mime.toLowerCase()))) {
        return "ebook";
      }
    }
    
    // Fallback to file extension
    if (videoFormats.includes(fileExtension)) {
      return "video";
    }
    if (audioFormats.includes(fileExtension)) {
      return "audio";
    }
    if (ebookFormats.includes(fileExtension)) {
      return "ebook";
    }
    
    return "unknown";
  };

  // Validate media eligibility before upload
  const validateMediaEligibility = (): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!file) {
      errors.push("Please select a media file");
    }

    if (!title || title.trim().length === 0) {
      errors.push("Title is required");
    } else if (title.length > 100) {
      errors.push("Title must be 100 characters or less");
    }

    if (!selectedCategory) {
      errors.push("Please select a category");
    }

    if (!selectedType) {
      if (file) {
        const actualFileType = detectFileType(file);
        if (actualFileType === "video") {
          errors.push(
            "Please select a content type. Detected a video file; choose Videos or Sermon."
          );
        } else if (actualFileType === "audio") {
          errors.push(
            "Please select a content type. Detected an audio file; choose Music, Podcasts, or Sermon."
          );
        } else if (actualFileType === "ebook") {
          errors.push(
            "Please select a content type. Detected an ebook/PDF; choose Books or Ebook."
          );
        } else {
          errors.push("Please select a content type.");
        }
      } else {
        errors.push("Please select a content type.");
      }
    }

    // Validate file type - detect actual file type first, then check compatibility
    if (file) {
      const actualFileType = detectFileType(file);
      const fileExtension = file.name?.split(".").pop()?.toLowerCase() || "";
      const mimeType = file.mimeType || "";

      // Define valid formats for each content type
      const validAudioFormats = ["mp3", "wav", "aac", "m4a", "ogg", "flac"];
      const validAudioMimes = [
        "audio/mpeg",
        "audio/wav",
        "audio/aac",
        "audio/mp4",
        "audio/ogg",
        "audio/flac",
        "audio/x-m4a",
      ];
      
      const validVideoFormats = ["mp4"];
      const validVideoMimes = ["video/mp4"];
      
      const validBookFormats = ["pdf", "epub"];
      const validBookMimes = [
        "application/pdf",
        "application/epub+zip",
        "application/epub",
      ];

      // Validate based on selected content type and actual file type
      if (selectedType === "music" || selectedType === "podcasts") {
        // Music and Podcasts require audio files
        if (actualFileType === "video") {
          errors.push(
            "Invalid file type. You selected Music/Podcast but uploaded a video file. Please select a video content type or upload an audio file."
          );
        } else if (actualFileType === "ebook") {
          errors.push(
            "Invalid file type. You selected Music/Podcast but uploaded an ebook file. Please select Books/Ebook content type or upload an audio file."
          );
        } else if (actualFileType === "unknown" || (!validAudioFormats.includes(fileExtension) && !validAudioMimes.some((mime) => mimeType.toLowerCase().includes(mime.toLowerCase())))) {
          errors.push(
            "Invalid audio format. Supported: MP3, WAV, AAC, M4A, OGG, FLAC"
          );
        }
      } else if (selectedType === "videos") {
        // Videos require video files
        if (actualFileType === "audio") {
          errors.push(
            "Invalid file type. You selected Videos but uploaded an audio file. Please select Music/Podcast/Sermon content type or upload a video file."
          );
        } else if (actualFileType === "ebook") {
          errors.push(
            "Invalid file type. You selected Videos but uploaded an ebook file. Please select Books/Ebook content type or upload a video file."
          );
        } else if (actualFileType === "unknown" || (!validVideoFormats.includes(fileExtension) && !validVideoMimes.some((mime) => mimeType.toLowerCase().includes(mime.toLowerCase())))) {
          errors.push("Invalid video format. Supported: MP4");
        }
      } else if (selectedType === "books" || selectedType === "ebook") {
        // Books require ebook files
        if (actualFileType === "video") {
          errors.push(
            "Invalid file type. You selected Books/Ebook but uploaded a video file. Please select Videos content type or upload an ebook file."
          );
        } else if (actualFileType === "audio") {
          errors.push(
            "Invalid file type. You selected Books/Ebook but uploaded an audio file. Please select Music/Podcast/Sermon content type or upload an ebook file."
          );
        } else if (actualFileType === "unknown" || (!validBookFormats.includes(fileExtension) && !validBookMimes.some((mime) => mimeType.toLowerCase().includes(mime.toLowerCase())))) {
          errors.push("Invalid book format. Supported: PDF, EPUB");
        }
      } else if (selectedType === "sermon") {
        // Sermons can be either audio or video
        if (actualFileType === "ebook") {
          errors.push(
            "Invalid file type. Sermons must be either audio or video files, not ebooks."
          );
        } else if (actualFileType === "video") {
          // Validate video format
          if (!validVideoFormats.includes(fileExtension) && !validVideoMimes.some((mime) => mimeType.toLowerCase().includes(mime.toLowerCase()))) {
            errors.push("Invalid video format. Supported: MP4");
          }
        } else if (actualFileType === "audio") {
          // Validate audio format
          if (!validAudioFormats.includes(fileExtension) && !validAudioMimes.some((mime) => mimeType.toLowerCase().includes(mime.toLowerCase()))) {
            errors.push(
              "Invalid audio format. Supported: MP3, WAV, AAC, M4A, OGG, FLAC"
            );
          }
        } else if (actualFileType === "unknown") {
          errors.push(
            "Unable to detect file type. Please ensure you're uploading a valid audio or video file."
          );
        }
      }
    }

    // Validate file size based on actual file type and selected content type
    if (file && file.size) {
      const maxVideoSize = 100 * 1024 * 1024; // 100MB
      const maxAudioSize = 50 * 1024 * 1024; // 50MB
      const maxBookSize = 50 * 1024 * 1024; // 50MB

      const actualFileType = detectFileType(file);

      // For videos content type
      if (selectedType === "videos") {
        if (file.size > maxVideoSize) {
          errors.push("Video file size exceeds 100MB limit");
        }
      }
      // For music and podcasts content types (should be audio)
      else if (selectedType === "music" || selectedType === "podcasts") {
        if (actualFileType === "audio" && file.size > maxAudioSize) {
          errors.push("Audio file size exceeds 50MB limit");
        }
      }
      // For sermon content type (can be audio or video)
      else if (selectedType === "sermon") {
        if (actualFileType === "video" && file.size > maxVideoSize) {
          errors.push("Video file size exceeds 100MB limit");
        } else if (actualFileType === "audio" && file.size > maxAudioSize) {
          errors.push("Audio file size exceeds 50MB limit");
        }
      }
      // For books and ebook content types (should be ebooks)
      else if (selectedType === "books" || selectedType === "ebook") {
        if (file.size > maxBookSize) {
          errors.push("Book file size exceeds 50MB limit");
        }
      }
    }

    // Warnings
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
      isValid: errors.length === 0,
      errors,
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
      const validation = validateMediaEligibility();
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

  const handleUpload = async () => {
    // Validate eligibility before proceeding
    const validation = validateMediaEligibility();
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
        } catch {}
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

        console.error("❌ Upload failed:", {
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

        // Handle 403 Forbidden - Content Rejected or Requires Review
        if (res.status === 403 && result) {
          const moderationResult = result.moderationResult || {};
          const errorMessage = result.message || "Content does not meet our community guidelines.";

          setModerationError({
            message: errorMessage,
            reason: moderationResult.reason,
            flags: moderationResult.flags || [],
            status: moderationResult.status,
          });

          // Show detailed rejection message
          let alertMessage = errorMessage;
          if (moderationResult.reason) {
            alertMessage += `\n\nReason: ${moderationResult.reason}`;
          }
          if (moderationResult.flags && moderationResult.flags.length > 0) {
            alertMessage += `\n\nIssues found:\n${moderationResult.flags.map((flag: string) => `• ${flag.replace(/_/g, " ")}`).join("\n")}`;
          }

          Alert.alert(
            moderationResult.status === "under_review"
              ? "Review Required"
              : "Content Rejected",
            alertMessage,
            [
              { text: "OK", onPress: () => setModerationError(null) },
              {
                text: "Retry",
                onPress: () => {
                  setModerationError(null);
                  setUploadState({ status: "idle", progress: 0, message: "" });
                },
              },
            ]
          );
          return;
        }

        // Handle other errors
        const message =
          (result && (result.message || result.error)) ||
          (rawText
            ? `Unexpected response (${res.status}).`
            : `HTTP ${res.status}`);
        Alert.alert("Upload failed", message || "Please try again.");
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
        fileMimeType: uploaded.fileMimeType || file.mimeType,
        // Visual cover fields
        thumbnailUrl: uploaded.thumbnailUrl || uploaded.imageUrl || undefined,
        imageUrl: uploaded.thumbnailUrl || uploaded.imageUrl || "",
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

      Alert.alert(
        "Upload Successful",
        "Your content has been verified and approved. It is now live!",
        [
          {
            text: "OK",
            onPress: () => {
              // Reset
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

              const destination =
                selectedType.toUpperCase() === "BOOKS"
                  ? "E-BOOKS"
                  : selectedType.toUpperCase();

              router.push(`/categories/HomeScreen?default=${destination}`);
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
      console.error("❌ Upload error:", error?.message ?? error);
      console.error("❌ Upload error details:", {
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

      Alert.alert("Upload Failed", errorMessage);
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
            const validation = validateMediaEligibility();
            setEligibilityStatus(validation);
          }, 100);
        }}
        className={`rounded-full mr-2 mb-2 border ${
          isSelected ? "bg-black border-black" : "bg-white border-gray-300"
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
                fullscreenOptions={{ enterFullscreenButton: false }}
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
              fullscreenOptions={{ enterFullscreenButton: false }}
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
                      const validation = validateMediaEligibility();
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
                className="border border-gray-300 rounded-md mb-4 px-3 py-3 bg-white"
                style={{
                  minHeight: getResponsiveSpacing(80, 100, 120),
                  maxHeight: 200,
                  fontSize: getInputSize().fontSize,
                }}
              />

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
                )}
              </View>

              {/* Eligibility Status Indicator */}
              {eligibilityStatus && (
                <View
                  className="mb-4 p-3 rounded-lg border"
                  style={{
                    backgroundColor: eligibilityStatus.isValid
                      ? "rgba(34, 197, 94, 0.1)"
                      : "rgba(239, 68, 68, 0.1)",
                    borderColor: eligibilityStatus.isValid ? "#22c55e" : "#ef4444",
                  }}
                >
                  {eligibilityStatus.isValid ? (
                    <View className="flex-row items-center">
                      <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                      <Text
                        className="ml-2 font-medium"
                        style={{
                          fontSize: getResponsiveFontSize(12, 14, 16),
                          color: "#166534",
                        }}
                      >
                        ✓ Ready to upload - Content will be verified automatically
                      </Text>
                    </View>
                  ) : (
                    <View>
                      <View className="flex-row items-center mb-2">
                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                        <Text
                          className="ml-2 font-semibold"
                          style={{
                            fontSize: getResponsiveFontSize(14, 16, 18),
                            color: "#991b1b",
                          }}
                        >
                          Please fix the following issues:
                        </Text>
                      </View>
                      {eligibilityStatus.errors.map((error, index) => (
                        <Text
                          key={index}
                          className="ml-7 mb-1"
                          style={{
                            fontSize: getResponsiveFontSize(12, 14, 16),
                            color: "#991b1b",
                          }}
                        >
                          • {error}
                        </Text>
                      ))}
                    </View>
                  )}
                  {eligibilityStatus.warnings.length > 0 && (
                    <View className="mt-2">
                      {eligibilityStatus.warnings.map((warning, index) => (
                        <View key={index} className="flex-row items-center mt-1">
                          <Ionicons
                            name="information-circle"
                            size={16}
                            color="#f59e0b"
                          />
                          <Text
                            className="ml-2"
                            style={{
                              fontSize: getResponsiveFontSize(11, 13, 15),
                              color: "#92400e",
                            }}
                          >
                            {warning}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Multilingual Support Hint */}
              {eligibilityStatus?.isValid && (
                <View
                  className="mb-4 p-3 rounded-lg"
                  style={{
                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                    borderWidth: 1,
                    borderColor: "#3b82f6",
                  }}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="language" size={18} color="#3b82f6" />
                    <Text
                      className="ml-2 flex-1"
                      style={{
                        fontSize: getResponsiveFontSize(11, 13, 15),
                        color: "#1e40af",
                      }}
                    >
                      <Text className="font-semibold">Multilingual Support: </Text>
                      Your content will be automatically detected and verified in any
                      language (English, Yoruba, Hausa, Igbo, and more).
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Moderation Error Display */}
            {moderationError && (
              <View
                className="mt-4 p-4 rounded-lg border"
                style={{
                  backgroundColor:
                    moderationError.status === "under_review"
                      ? "rgba(255, 193, 7, 0.1)"
                      : "rgba(220, 53, 69, 0.1)",
                  borderColor:
                    moderationError.status === "under_review"
                      ? "#ffc107"
                      : "#dc3545",
                }}
              >
                <View className="flex-row items-center mb-2">
                  <Ionicons
                    name={
                      moderationError.status === "under_review"
                        ? "warning-outline"
                        : "close-circle-outline"
                    }
                    size={24}
                    color={
                      moderationError.status === "under_review"
                        ? "#ffc107"
                        : "#dc3545"
                    }
                  />
                  <Text
                    className="ml-2 font-semibold"
                    style={{
                      fontSize: getResponsiveFontSize(16, 18, 20),
                      color:
                        moderationError.status === "under_review"
                          ? "#856404"
                          : "#721c24",
                    }}
                  >
                    {moderationError.status === "under_review"
                      ? "Review Required"
                      : "Content Rejected"}
                  </Text>
                </View>
                <Text
                  className="mb-2"
                  style={{
                    fontSize: getResponsiveFontSize(14, 16, 18),
                    color: "#333",
                  }}
                >
                  {moderationError.message}
                </Text>
                {moderationError.reason && (
                  <View className="mb-2">
                    <Text
                      className="font-medium mb-1"
                      style={{
                        fontSize: getResponsiveFontSize(12, 14, 16),
                        color: "#666",
                      }}
                    >
                      Reason:
                    </Text>
                    <Text
                      style={{
                        fontSize: getResponsiveFontSize(12, 14, 16),
                        color: "#666",
                      }}
                    >
                      {moderationError.reason}
                    </Text>
                  </View>
                )}
                {moderationError.flags && moderationError.flags.length > 0 && (
                  <View>
                    <Text
                      className="font-medium mb-1"
                      style={{
                        fontSize: getResponsiveFontSize(12, 14, 16),
                        color: "#666",
                      }}
                    >
                      Issues found:
                    </Text>
                    {moderationError.flags.map((flag, index) => (
                      <Text
                        key={index}
                        className="ml-2"
                        style={{
                          fontSize: getResponsiveFontSize(12, 14, 16),
                          color: "#666",
                        }}
                      >
                        • {flag.replace(/_/g, " ")}
                      </Text>
                    ))}
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => {
                    setModerationError(null);
                    setUploadState({ status: "idle", progress: 0, message: "" });
                  }}
                  className="mt-3 bg-gray-200 rounded-lg py-2 px-4 items-center"
                >
                  <Text
                    className="font-medium"
                    style={{
                      fontSize: getResponsiveFontSize(14, 16, 18),
                      color: "#333",
                    }}
                  >
                    Dismiss
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Upload Button */}
            <View className="items-center mt-4">
              <View
                className="flex-row items-center px-4 py-3 mb-3 rounded-lg border"
                style={{
                  backgroundColor: "rgba(223, 147, 14, 0.12)",
                  borderColor: "#DF930E",
                  borderStyle: "dashed",
                  maxWidth: Math.min(
                    getScreenDimensions().width -
                      getResponsiveSpacing(16, 20, 24, 32) * 2,
                    320
                  ),
                }}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color="#8C5A00"
                  style={{ marginRight: 8 }}
                />
                <Text
                  className="flex-1 text-xs"
                  style={{
                    color: "#4B2C00",
                    fontFamily: "Rubik-Regular",
                    lineHeight: 16,
                  }}
                >
                  Your content will be verified by AI. By uploading, you confirm you own or have the right to distribute this content.
                </Text>
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

