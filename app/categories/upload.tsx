import { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ResizeMode, Video } from "expo-av";
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
  isSmallScreen
} from "../../utils/responsive";
import AuthHeader from "../components/AuthHeader";
import LoadingOverlay from "../components/LoadingOverlay";
import { useMediaStore } from "../store/useUploadStore";
import { API_BASE_URL } from "../utils/api";
import { logUserDataStatus, validateUserForUpload } from "../utils/userValidation";

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
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(getOrientation());

  // Handle orientation changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const newOrientation = window.width > window.height ? 'landscape' : 'portrait';
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

  const pickMedia = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["video/mp4", "audio/mpeg", "application/pdf", "application/epub+zip"],
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

    setFile({
      uri,
      name,
      mimeType: guessedMime,
    });
  };

  const pickThumbnail = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert("Permission needed", "Please allow access to photo library to select thumbnail.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setThumbnail({
          uri: asset.uri,
          name: `thumbnail_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
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

  const handleUpload = async () => {
    if (!file || !title || !selectedCategory || !selectedType) {
      Alert.alert("Missing fields", "Please complete all required fields.");
      return;
    }

    // Recommend thumbnail for music uploads
    if (selectedType === "music" && !thumbnail) {
      Alert.alert(
        "Thumbnail Recommended", 
        "Adding a thumbnail image will help your music stand out. Would you like to continue without one?",
        [
          { text: "Add Thumbnail", style: "cancel" },
          { text: "Continue", onPress: () => proceedWithUpload() }
        ]
      );
      return;
    }

    proceedWithUpload();
  };

  const proceedWithUpload = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const userRaw = await AsyncStorage.getItem("user");
      const user = userRaw ? JSON.parse(userRaw) : null;

      console.log("🔍 Upload Debug - Retrieved data:", {
        hasToken: !!token,
        hasUser: !!user,
        userRaw: userRaw,
        userData: user,
        userAvatar: user?.avatar,
        userImageUrl: user?.imageUrl,
        userProfileImage: user?.profileImage
      });

      if (!token || !user) {
        setLoading(false);
        console.error("❌ Upload failed: Missing token or user data");
        Alert.alert("Unauthorized", "Please log in to upload.");
        return;
      }

      // ✅ Validate and normalize user data
      const validation = validateUserForUpload(user);
      const normalizedUser = validation.normalizedUser;
      
      logUserDataStatus(user, "Upload");
      
      // Warn about missing data but don't block upload
      if (!validation.isValid) {
        console.warn("⚠️ Upload with incomplete user data:", validation.missingFields);
      }

      // Ensure user data includes avatar for upload
      if (!normalizedUser.avatar && user) {
        // Try to get avatar from various possible fields
        const avatar = user.avatar || user.imageUrl || user.profileImage || '';
        if (avatar) {
          normalizedUser.avatar = avatar;
          console.log("✅ Found user avatar for upload:", avatar);
        }
      }

      console.log("🔍 Upload Debug - Normalized user data:", {
        fullName: normalizedUser.fullName,
        avatar: normalizedUser.avatar,
        hasAvatar: !!normalizedUser.avatar,
        validation: validation
      });

      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        type: file.mimeType,
        name: file.name,
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

      const res = await fetch(`${API_BASE_URL}/api/media/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: formData,
      });

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
      setLoading(false);

      if (!res.ok) {
        console.error("❌ Upload failed:", {
          status: res.status,
          contentType,
          result,
          rawTextPreview: rawText ? rawText.slice(0, 300) : null,
        });
        const message =
          (result && (result.message || result.error)) ||
          (rawText ? `Unexpected response (${res.status}).` : `HTTP ${res.status}`);
        Alert.alert("Upload failed", message || "Please try again.");
        return;
      }

      if (!result) {
        console.error("❌ Upload response not JSON:", {
          status: res.status,
          contentType,
          rawTextPreview: rawText ? rawText.slice(0, 300) : null,
        });
        Alert.alert("Upload failed", "Server returned unexpected response. Please try again.");
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

      Alert.alert("Upload successful");

      // Reset
      setTitle("");
      setDescription("");
      setSelectedCategory("");
      setSelectedType("");
      setIsSermonContent(false);
      setFile(null);
      setThumbnail(null);

      const destination =
        selectedType.toUpperCase() === "BOOKS"
          ? "E-BOOKS"
          : selectedType.toUpperCase();

      router.push(`/categories/HomeScreen?default=${destination}`);
    } catch (error: any) {
      setLoading(false);
      console.error("❌ Upload error:", error?.message ?? error);
      Alert.alert("Error", error?.message || "Something went wrong.");
    }
  };

  const renderTag = (
    label: string,
    value: string,
    selected: string,
    setSelected: (val: string) => void
  ) => {
    const isSelected = value === selected;
    const tagPadding = getResponsiveSpacing(8, 12, 16);
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
        }}
        className={`rounded-full mr-2 mb-2 border ${
          isSelected ? "bg-black border-black" : "bg-white border-gray-300"
        }`}
        style={{
          paddingHorizontal: tagPadding,
          paddingVertical: tagPadding * 0.75,
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

  // Responsive layout for media pickers
  const renderMediaPickers = () => {
    const mediaSize = getMediaPickerSize();
    const thumbnailSize = getThumbnailSize();
    const containerPadding = getResponsiveSpacing(16, 20, 24, 32);
    const { width: screenWidth } = getScreenDimensions();
    
    // On small screens or landscape, stack vertically
    if (isSmallScreen || orientation === 'landscape') {
      return (
        <View className="items-center" style={{ paddingHorizontal: containerPadding }}>
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
                <Feather name="plus" size={getResponsiveSize(30, 35, 40)} color="gray" />
                <Text className="text-gray-600 text-center mt-2" style={{ fontSize: getResponsiveFontSize(10, 11, 12) }}>
                  Select Media
                </Text>
              </View>
            ) : file.mimeType.startsWith("video") ? (
              <Video
                source={{ uri: file.uri }}
                useNativeControls
                resizeMode={ResizeMode.COVER}
                style={{ width: "100%", height: "100%", borderRadius: 12 }}
              />
            ) : (
              <Text className="px-4 text-gray-700 text-center" style={{ fontSize: getResponsiveFontSize(10, 11, 12) }}>
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
                <Feather name="image" size={getResponsiveSize(25, 30, 35)} color="gray" />
                <Text className="text-gray-600 text-center mt-2" style={{ fontSize: getResponsiveFontSize(10, 11, 12) }}>
                  Select{'\n'}Thumbnail
                </Text>
              </View>
            ) : (
              <Image
                source={{ uri: thumbnail.uri }}
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
      <View className="flex-row justify-center items-start" style={{ paddingHorizontal: containerPadding }}>
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
              <Feather name="plus" size={getResponsiveSize(30, 35, 40)} color="gray" />
              <Text className="text-gray-600 text-center mt-2" style={{ fontSize: getResponsiveFontSize(10, 11, 12) }}>
                Select Media
              </Text>
            </View>
          ) : file.mimeType.startsWith("video") ? (
            <Video
              source={{ uri: file.uri }}
              useNativeControls
              resizeMode={ResizeMode.COVER}
              style={{ width: "100%", height: "100%", borderRadius: 12 }}
            />
          ) : (
            <Text className="px-4 text-gray-700 text-center" style={{ fontSize: getResponsiveFontSize(10, 11, 12) }}>
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
              <Feather name="image" size={getResponsiveSize(25, 30, 35)} color="gray" />
              <Text className="text-gray-600 text-center mt-2" style={{ fontSize: getResponsiveFontSize(10, 11, 12) }}>
                Select{'\n'}Thumbnail
              </Text>
            </View>
          ) : (
            <Image
              source={{ uri: thumbnail.uri }}
              style={{ width: "100%", height: "100%", borderRadius: 8 }}
              resizeMode="cover"
            />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      {loading && <LoadingOverlay />}
      <KeyboardAvoidingView 
        {...getKeyboardAdjustment()}
        className="flex-1 bg-white"
      >
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ 
            paddingBottom: getResponsiveSpacing(20, 30, 40),
            minHeight: getScreenDimensions().height - 100 // Ensure content fills screen
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingHorizontal: getResponsiveSpacing(16, 20, 24, 32) }}>
            <View className="mt-6">
              <AuthHeader title="New Upload" />
            </View>

            {/* Media and Thumbnail Pickers */}
            <View className="mt-4 mb-6">
              {renderMediaPickers()}
            </View>

            {/* Form Fields */}
            <View className="flex-1">
              <Text className="text-xs text-gray-600 mb-1 font-medium">TITLE</Text>
              <TextInput
                placeholder="Enter title..."
                value={title}
                onChangeText={setTitle}
                multiline
                textAlignVertical="top"
                className="border border-gray-300 rounded-md mb-4 px-3 py-3 bg-white"
                style={{
                  minHeight: getInputSize().height,
                  maxHeight: 100,
                  fontSize: getInputSize().fontSize,
                }}
              />

              <Text className="text-xs text-gray-600 mb-1 font-medium">DESCRIPTION</Text>
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
              <Text className="text-xs text-gray-600 mb-2 font-medium">CATEGORY</Text>
              <View className="flex-row flex-wrap mb-4">
                {categories.map((item) =>
                  renderTag(item, item, selectedCategory, setSelectedCategory)
                )}
              </View>

              {/* Content Types */}
              <Text className="text-xs text-gray-600 mb-2 font-medium">CONTENT TYPE</Text>
              <View className="flex-row flex-wrap mb-6">
                {contentTypes.map((item) =>
                  renderTag(item.label, item.value, selectedType, setSelectedType)
                )}
              </View>
            </View>

            {/* Upload Button */}
            <View className="items-center mt-4">
              <TouchableOpacity
                onPress={async () => {
                  const stopAudio = useMediaStore.getState().stopAudioFn;
                  if (stopAudio) await stopAudio();
                  handleUpload();
                }}
                className="bg-black justify-center rounded-full items-center"
                style={{
                  width: Math.min(getScreenDimensions().width - (getResponsiveSpacing(16, 20, 24, 32) * 2), 300),
                  height: getButtonSize().height,
                  minHeight: getTouchTargetSize(), // Ensure minimum touch target
                }}
                activeOpacity={0.8}
              >
                <Text 
                  className="text-white font-semibold"
                  style={{ fontSize: getResponsiveFontSize(16, 18, 20) }}
                >
                  Upload
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
