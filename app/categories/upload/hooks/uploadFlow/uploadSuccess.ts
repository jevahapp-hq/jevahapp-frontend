import { Alert } from "react-native";
import type { QueryClient } from "@tanstack/react-query";
import type { Router } from "expo-router";
import { useMediaStore } from "../../../../store/useUploadStore";
import { getTimeAgo } from "../../utils";
import type { MediaFile, UploadState } from "../../types";

type UploadedMedia = {
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

export async function persistUploadedMedia(params: {
  uploaded: UploadedMedia;
  file: MediaFile;
  isSermonContent: boolean;
}) {
  const { uploaded, file, isSermonContent } = params;
  const now = new Date();

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
}

export function scheduleUploadSuccessNavigation(params: {
  router: Router;
  queryClient: QueryClient;
  selectedType: string;
  resetForm: () => void;
  setLoading: (v: boolean) => void;
  setUploadState: (v: UploadState) => void;
  successNavigateTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
}) {
  const {
    router,
    queryClient,
    selectedType,
    resetForm,
    setLoading,
    setUploadState,
    successNavigateTimeoutRef,
  } = params;

  setLoading(false);
  setUploadState({
    status: "success",
    progress: 100,
    message: "Content has been verified and approved!",
  });

  queryClient.invalidateQueries({ queryKey: ["all-content"] });

  const destination =
    selectedType.toUpperCase() === "BOOKS" ? "E-BOOKS" : selectedType.toUpperCase();

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
}
