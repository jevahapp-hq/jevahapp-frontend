import {
    Feather,
    Ionicons,
    MaterialIcons
} from "@expo/vector-icons";
import { Audio } from "expo-av";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Image,
    PanResponder, View as RNView,
    ScrollView,
    Share,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import CommentIcon from "../components/CommentIcon";
import ContentActionModal from "../components/ContentActionModal";
import { useCommentModal } from "../context/CommentModalContext";
import { useDownloadStore } from "../store/useDownloadStore";
import { useInteractionStore } from "../store/useInteractionStore";
import { useLibraryStore } from "../store/useLibraryStore";
import { useMediaStore } from "../store/useUploadStore";
import { convertToDownloadableItem, useDownloadHandler } from "../utils/downloadUtils";
import {
    getPersistedStats,
    getViewedAudio,
    persistStats,
    persistViewedAudio,
} from "../utils/persistentStorage";
import { getUserAvatarFromContent, getUserDisplayNameFromContent } from "../utils/userValidation";

interface AudioCard {
  fileUrl: any;
  title: string;
  speaker: string;
  uploadedBy?: string;
  timeAgo: string;
  speakerAvatar: any;
  favorite: number;
  views: number;
  saved: number;
  sheared: number;
  comment?: number;
  onPress?: () => void;
  // Optional visual cover fields
  imageUrl?: string | { uri: string };
  thumbnailUrl?: string;
  contentId?: string; // for global interaction system
}

interface RecommendedItem {
  title: string;
  audioUrl: string;
  imageUrl: any;
  subTitle: string;
  views: number;
  onPress?: () => void;
  isHot?: boolean;
  isRising?: boolean;
  trendingScore?: number;
}

const Audios: AudioCard[] = [
  {
    fileUrl: require("../../assets/images/image (12).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    favorite: 600,
    saved: 400,
    sheared: 540,
  },
];

const AudiosA: AudioCard[] = [
  {
    fileUrl: require("../../assets/images/image (14).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    favorite: 600,
    saved: 400,
    sheared: 540,
  },
  {
    fileUrl: require("../../assets/images/image (15).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    favorite: 600,
    saved: 400,
    sheared: 540,
  },
  {
    fileUrl: require("../../assets/images/image (16).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    favorite: 600,
    saved: 400,
    sheared: 540,
  },
  {
    fileUrl: require("../../assets/images/image (17).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    favorite: 600,
    saved: 400,
    sheared: 540,
  },
];

const AudiosB: AudioCard[] = [
  {
    fileUrl: require("../../assets/images/image (14).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    favorite: 600,
    saved: 400,
    sheared: 540,
  },
  {
    fileUrl: require("../../assets/images/image (15).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    favorite: 600,
    saved: 400,
    sheared: 540,
  },
  {
    fileUrl: require("../../assets/images/image (16).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    favorite: 600,
    saved: 400,
    sheared: 540,
  },
  {
    fileUrl: require("../../assets/images/image (17).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    favorite: 600,
    saved: 400,
    sheared: 540,
  },
];

const previouslyViewed: RecommendedItem[] = [
  {
    title: "The Beatitudes: The Path to Blessings",
    audioUrl: "",
    imageUrl: require("../../assets/images/image12a.png"),
    subTitle: "The Gospel of Lord by Andrew Farlay",
    views: 100,
    onPress: () => console.log("Viewing The Chosen"),
  },
  {
    title: "The Beatitudes: The Path to Blessings",
    audioUrl: "",
    imageUrl: require("../../assets/images/image (13).png"),
    subTitle: "The Gospel of Lord by Andrew Farlay",
    views: 150,
    onPress: () => console.log("Viewing Overflow Worship"),
  },
  {
    title: "Revival Nights",
    audioUrl: "",
    imageUrl: require("../../assets/images/image (13).png"),
    subTitle: "The Gospel of Lord by Andrew Farlay",
    views: 300,
    onPress: () => console.log("Viewing Revival Nights"),
  },
];
const recommendedItems: RecommendedItem[] = [
  {
    title: "The Beatitudes: The Path to Blessings",
    audioUrl: "",
    imageUrl: require("../../assets/images/image (6).png"),
    subTitle: "The Gospel of Lord by Andrew Farlay",
    views: 100,
    onPress: () => console.log("Viewing The Chosen"),
  },
  {
    title: "The Beatitudes: The Path to Blessings",
    audioUrl: "",
    imageUrl: require("../../assets/images/image (7).png"),
    subTitle: "The Gospel of Lord by Andrew Farlay",
    views: 150,
    onPress: () => console.log("Viewing Overflow Worship"),
  },
  {
    title: "Revival Nights",
    audioUrl: "",
    imageUrl: require("../../assets/images/image (7).png"),
    subTitle: "The Gospel of Lord by Andrew Farlay",
    views: 300,
    onPress: () => console.log("Viewing Revival Nights"),
  },
];

export default function Music() {
  const mediaStore = useMediaStore();
  const libraryStore = useLibraryStore();
  
  // ✅ Use global comment modal and interaction store
  const { showCommentModal } = useCommentModal();
  const { comments, userFavorites, globalFavoriteCounts } = useInteractionStore();
  
  // Download functionality
  const { handleDownload, checkIfDownloaded } = useDownloadHandler();
  const { loadDownloadedItems } = useDownloadStore();
  
  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgressMap, setAudioProgressMap] = useState<Record<string, number>>({});
  const [audioMuteMap, setAudioMuteMap] = useState<Record<string, boolean>>({});
  const [modalVisible, setModalVisible] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [pvModalIndex, setPvModalIndex] = useState<number | null>(null);
  const [rsModalIndex, setRsModalIndex] = useState<number | null>(null);
  const [recModalIndex, setRecModalIndex] = useState<number | null>(null);
  
  const soundMap = useRef<Record<string, Audio.Sound>>({});
  const audioRefs = useRef<Record<string, Audio.Sound>>({});
  // Prevent infinite refresh loops: run refresh once after mount using static accessor
  const hasRefreshedRef = useRef(false);
  useEffect(() => {
    if (!hasRefreshedRef.current) {
      hasRefreshedRef.current = true;
      // Use static accessor to avoid capturing store instance in deps
      useMediaStore.getState().refreshUserDataForExistingMedia();
    }
  }, []);
  useEffect(() => {
    if (!libraryStore.isLoaded) {
      libraryStore.loadSavedItems();
    }
  }, [libraryStore.isLoaded]);
  const musicItems = mediaStore.mediaList.filter(item => item.contentType === "music");
  
  // 🧮 Build mini-card datasets from uploaded music
  const indexedMusic: RecommendedItem[] = useMemo(() => {
    return musicItems.map((audio: any) => {
      const audioUrl = typeof audio.fileUrl === "string" ? audio.fileUrl : (audio.fileUrl?.uri || "");
      const imageSrc = audio?.thumbnailUrl
        ? { uri: audio.thumbnailUrl }
        : audio?.imageUrl
          ? (typeof audio.imageUrl === "string" ? { uri: audio.imageUrl } : audio.imageUrl)
          : require("../../assets/images/image (10).png");
      return {
        title: audio.title,
        subTitle: audio.speaker || audio.uploadedBy || "Unknown",
        audioUrl,
        imageUrl: imageSrc,
        views: audio.viewCount || 0,
      } as RecommendedItem;
    });
  }, [musicItems]);

  const trendingMusic: RecommendedItem[] = useMemo(() => {
    const now = Date.now();
    const scored = musicItems.map((audio: any) => {
      const audioUrl = typeof audio.fileUrl === "string" ? audio.fileUrl : (audio.fileUrl?.uri || "");
      const imageSrc = audio?.thumbnailUrl
        ? { uri: audio.thumbnailUrl }
        : audio?.imageUrl
          ? (typeof audio.imageUrl === "string" ? { uri: audio.imageUrl } : audio.imageUrl)
          : require("../../assets/images/image (10).png");
      const createdAt = new Date(audio?.createdAt || now).getTime();
      const ageHours = Math.max(1, (now - createdAt) / (1000 * 60 * 60));
      const views = Math.max(0, audio.viewCount || 0);
      const likes = Math.max(0, audio.favorite || 0);
      const saves = Math.max(0, audio.saved || 0);
      const shares = Math.max(0, audio.sheared || 0);
      const viewsPerHour = views / ageHours;
      const likesPerHour = likes / ageHours;
      const savesPerHour = saves / ageHours;
      const sharesPerHour = shares / ageHours;
      const weightedVelocity = 1 * Math.sqrt(viewsPerHour) +
        2 * Math.log1p(savesPerHour) +
        3 * Math.log1p(likesPerHour) +
        5 * Math.log1p(sharesPerHour);
      const halfLifeHours = 24;
      const decay = Math.exp(-ageHours / halfLifeHours);
      const score = weightedVelocity * decay * 300;
      const scoreNum = Number(score || 0);
      const isHot = scoreNum > 1200;
      const isRising = scoreNum > 600 && scoreNum <= 1200;
      return {
        title: audio.title,
        subTitle: audio.speaker || audio.uploadedBy || "Unknown",
        audioUrl,
        imageUrl: imageSrc,
        views,
        trendingScore: scoreNum,
        isHot,
        isRising,
      } as RecommendedItem;
    });
    return scored
      .filter((x: any) => (x.trendingScore || 0) > 0)
      .sort((a: any, b: any) => (b.trendingScore || 0) - (a.trendingScore || 0))
      .slice(0, 12);
  }, [musicItems]);

  // UI-facing trending list with fallback to top viewed if engagement scores are zero
  const trendingUiList: RecommendedItem[] = useMemo(() => {
    if (trendingMusic.length > 0) return trendingMusic;
    return [...indexedMusic]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 12);
  }, [trendingMusic, indexedMusic]);

  const recommendedMusic: RecommendedItem[] = useMemo(() => {
    const trendingSet = new Set(trendingUiList.map((t) => t.audioUrl));
    return indexedMusic
      .filter((m) => !trendingSet.has(m.audioUrl))
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 12);
  }, [indexedMusic, trendingUiList]);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [previouslyViewedState, setPreviouslyViewedState] = useState<RecommendedItem[]>([]);


  const getAudioKey = (fileUrl: string): string => `Audio-${fileUrl}`;

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [progressMap, setProgressMap] = useState<{ [key: string]: number }>({});
  const [durationMap, setDurationMap] = useState<{ [key: string]: number }>({});
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [pausedMap, setPausedMap] = useState<Record<string, number>>({});
  const [muteMap, setMuteMap] = useState<Record<string, boolean>>({});
  const [AudioStats, setAudioStats] = useState<
    Record<
      string,
      Partial<AudioCard> & {
        favoriteCount?: number;
        savedCount?: number;
      }
    >
  >({});
  // Comments disabled for now

  // Close all open menus/popovers across the component
  const closeAllMenus = () => {
    setModalVisible(null);
    setSelectedContent(null);
    setPvModalIndex(null);
    setRsModalIndex(null);
    setRecModalIndex(null);
  };

  // ContentActionModal handlers
  const handleOpenContentModal = (item: any, modalKey: string) => {
    setSelectedContent(item);
    setModalVisible(modalKey);
  };

  const handleViewDetails = () => {
    if (selectedContent) {
      console.log("View details for:", selectedContent.title);
      // Navigate to music detail screen
      const detailParams = {
        title: selectedContent.title,
        speaker: selectedContent.speaker || selectedContent.subTitle || "Unknown",
        description: selectedContent.description || 'No description available',
        audioUrl: selectedContent.fileUrl || selectedContent.audioUrl,
        imageUrl: selectedContent?.thumbnailUrl || (selectedContent?.imageUrl ? (typeof selectedContent.imageUrl === "string" ? selectedContent.imageUrl : selectedContent.imageUrl.uri) : ''),
        thumbnailUrl: selectedContent?.thumbnailUrl,
        speakerAvatar: selectedContent?.speakerAvatar ? (typeof selectedContent.speakerAvatar === "string" ? selectedContent.speakerAvatar : selectedContent.speakerAvatar.uri) : '',
        views: (selectedContent.views || 0).toString(),
        favorites: (selectedContent.favorite || 0).toString(),
        shares: (selectedContent.sheared || 0).toString(),
        comments: (selectedContent.comment || 0).toString(),
        saved: (selectedContent.saved || 0).toString(),
        timeAgo: selectedContent.timeAgo || "Recent",
        contentId: selectedContent.contentId || modalKey,
      };
      
      router.push({
        pathname: '/categories/MusicDetailScreen',
        params: detailParams,
      });
    }
  };

  const handleShare = async (key: string, Audio: AudioCard) => {
    try {
      const result = await Share.share({
        title: Audio.title,
        message: `Check out this Audio: ${Audio.title}\n${Audio.fileUrl}`,
        url: Audio.fileUrl,
      });

      if (result.action === Share.sharedAction) {
        setAudioStats((prev) => {
          const updatedStats = {
            ...prev,
            [key]: {
              ...prev[key],
              sheared: (prev[key]?.sheared || Audio.sheared || 0) + 1,
            },
          };
          persistStats(updatedStats); // 👈 Add this
          return updatedStats;
        });
      }
    } catch (error) {
      console.warn("❌ Share error:", error);
    }
  };

  const handleSave = async (key: string, Audio: AudioCard) => {
    try {
      const isCurrentlyUserSaved = libraryStore.isItemSaved(key);

      if (!isCurrentlyUserSaved) {
        const audioUrl = typeof Audio.fileUrl === "string" ? Audio.fileUrl : (Audio.fileUrl?.uri || "");
        const libraryItem = {
          id: key,
          contentType: "music",
          fileUrl: audioUrl,
          title: Audio.title,
          speaker: Audio.speaker,
          uploadedBy: Audio.uploadedBy,
          createdAt: new Date().toISOString(),
          speakerAvatar: Audio.speakerAvatar,
          views: AudioStats[key]?.views || 0,
          sheared: AudioStats[key]?.sheared || Audio.sheared || 0,
          favorite: AudioStats[key]?.favorite || Audio.favorite || 0,
          // comment omitted in music save payload
          saved: 1,
          imageUrl: Audio.imageUrl,
          thumbnailUrl: Audio.thumbnailUrl || audioUrl,
          originalKey: key
        } as const;

        await libraryStore.addToLibrary(libraryItem as any);

        setAudioStats((prev) => {
          const updated = {
            ...prev,
            [key]: {
              ...prev[key],
              saved: 1,
            },
          };
          persistStats(updated);
          return updated;
        });
      } else {
        await libraryStore.removeFromLibrary(key);
        setAudioStats((prev) => {
          const updated = {
            ...prev,
            [key]: {
              ...prev[key],
              saved: 0,
            },
          };
          persistStats(updated);
          return updated;
        });
      }
    } catch (error) {
      console.error("❌ Save operation failed for audio:", error);
    }

    // Close modal after action
    setModalVisible(null);
  };

  const handleFavorite = (key: string, Audio: AudioCard) => {
    setAudioStats((prev) => {
      const isFavorited = prev[key]?.favorite === 1;
      const updatedStats = {
        ...prev,
        [key]: {
          ...prev[key],
          favorite: isFavorited ? 0 : 1,
        },
      };
      persistStats(updatedStats);
      return updatedStats;
    });
  };

  const handleComment = (key: string, item: any) => {
    // Get the content ID for this item
    const contentId = item.contentId || key;
    
    // Get existing comments for this item
    const currentComments = comments[contentId] || [];
    const formattedComments = currentComments.map((comment: any) => ({
      id: comment.id,
      userName: comment.username || 'Anonymous',
      avatar: comment.userAvatar || '',
      timestamp: comment.timestamp,
      comment: comment.comment,
      likes: comment.likes || 0,
      isLiked: comment.isLiked || false,
    }));

    // Show the global comment modal
    showCommentModal(formattedComments, contentId);
  };

  const handleDownloadPress = async (item: any) => {
    console.log("🔄 Download button clicked for:", item.title);
    try {
      const downloadableItem = convertToDownloadableItem(item, 'audio');
      const result = await handleDownload(downloadableItem);
      
      if (result.success) {
        console.log("✅ Download successful:", result.message);
      } else {
        console.log("ℹ️ Download info:", result.message);
      }
    } catch (error) {
      console.error("❌ Download failed:", error);
    }
  };

  useEffect(() => {
    const loadPersistedData = async () => {
      const stats = await getPersistedStats();
      const viewedAudio = await getViewedAudio();

      setAudioStats(stats);
      try {
        const mapped: RecommendedItem[] = (Array.isArray(viewedAudio) ? viewedAudio : []).map((v: any) => ({
          title: v.title || '',
          subTitle: v.subTitle || v.speaker || v.uploadedBy || 'Unknown',
          imageUrl: v.imageUrl || (v.thumbnailUrl ? { uri: v.thumbnailUrl } : require("../../assets/images/image (10).png")),
          views: v.views || 0,
          audioUrl: v.audioUrl || v.fileUrl || '',
        }));
        setPreviouslyViewedState(mapped);
      } catch {
        setPreviouslyViewedState([]);
      }

      // Optional: Restore miniCardViews (just views count from stats)
      const miniViews: Record<string, number> = {};
      Object.keys(stats).forEach((key) => {
        if (typeof stats[key]?.views === "number") {
          miniViews[key] = stats[key].views;
        }
      });
      // setMiniCardViews(miniViews);
    };

    loadPersistedData();
    // Cleanup: ensure any playing audio stops when leaving Music screen
    return () => {
      try {
        // Use the same stopAudio registered into the store
        useMediaStore.getState().stopAudioFn?.();
      } catch (e) {
        // no-op
      }
    };
  }, []);

 

  // const allIndexedAudios = uploadedAudios.map((Audio, i) => {
  //   const key = getAudioKey(Audio.fileUrl); // ✅ Stable unique key

  //   const stats = AudioStats[key] || {};
  //   const views = Math.max(stats.views ?? 0, Audio.viewCount ?? 0);
  //   const shares = Math.max(stats.sheared ?? 0, Audio.sheared ?? 0);
  //   const favorites = Math.max(stats.favorite ?? 0, Audio.favorite ?? 0);
  //   const score = views + shares + favorites;

  //   return {
  //     key,
  //     fileUrl: Audio.fileUrl,
  //     title: Audio.title,
  //     subTitle: Audio.speaker || "Unknown",
  //     views,
  //     shares,
  //     favorites,
  //     score,
  //     imageUrl: {
  //       uri: Audio.fileUrl.replace("/upload/", "/upload/so_1/") + ".jpg",
  //     },
  //   };
  // });

  const recordViewed = useCallback(async (item: { title: string; subTitle: string; imageUrl: any; views?: number; audioUrl: string; }) => {
    try {
      setPreviouslyViewedState((prev) => {
        const existing = prev.filter((p) => p.audioUrl !== item.audioUrl);
        const updated = [
          { ...item, views: (item.views ?? 0) + 1 },
          ...existing,
        ].slice(0, 20);
        // fire and forget persistence
        persistViewedAudio(updated as any);
        return updated as any;
      });
    } catch (e) {
      // no-op
    }
  }, []);

  const playAudio = async (
    uri: string,
    id: string,
    meta?: { title?: string; subTitle?: string; imageUrl?: any; audioUrl?: string; views?: number }
  ) => {
    if (isLoadingAudio) return;
    setIsLoadingAudio(true);
  
    try {
      // Pause currently playing audio if different
      if (playingId && playingId !== id && soundMap[playingId]) {
        await soundMap[playingId].pauseAsync();
        const status = await soundMap[playingId].getStatusAsync();
        if (status.isLoaded) {
          setPausedMap((prev) => ({
            ...prev,
            [playingId]: status.positionMillis ?? 0,
          }));
        }
      }
  
      const existingSound = soundMap[id];
  
      if (existingSound) {
        const status = await existingSound.getStatusAsync();
  
        if (status.isLoaded) {
          if (status.isPlaying) {
            const pos = status.positionMillis ?? 0;
            await existingSound.pauseAsync();
            setPausedMap((prev) => ({ ...prev, [id]: pos }));
            setPlayingId(null);
          } else {
            const resumePos = pausedMap[id] ?? 0;
            await existingSound.playFromPositionAsync(resumePos);
            setPlayingId(id);
  
            // Ensure duration is set
            let duration = durationMap[id];
            if (!duration) {
              const updatedStatus = await existingSound.getStatusAsync();
              if (updatedStatus.isLoaded && updatedStatus.durationMillis) {
                duration = updatedStatus.durationMillis;
                setDurationMap((prev) => ({
                  ...prev,
                  [id]: duration,
                }));
              }
            }
  
            setProgressMap((prev) => ({
              ...prev,
              [id]: resumePos / Math.max(duration || 1, 1),
            }));
  
            // ✅ View tracking block
            if (!viewedIds.has(id)) {
              setAudioStats((prevStats) => {
                const currentViews = prevStats[id]?.views ?? 0;
                const updatedStats = {
                  ...prevStats,
                  [id]: {
                    ...prevStats[id],
                    views: currentViews + 1,
                  },
                };
                persistStats(updatedStats);
                return updatedStats;
              });
              setViewedIds((prev) => new Set(prev).add(id));
              if (meta?.audioUrl || uri) {
                recordViewed({
                  title: meta?.title || "",
                  subTitle: meta?.subTitle || "Unknown",
                  imageUrl: meta?.imageUrl || require("../../assets/images/image (10).png"),
                  views: meta?.views ?? 0,
                  audioUrl: meta?.audioUrl || uri,
                });
              }
            }
  
          }
          return;
        } else {
          setSoundMap((prev) => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
          });
        }
      }
  
      const resumePos = pausedMap[id] ?? 0;
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: true,
          isMuted: muteMap[id] ?? false,
          positionMillis: resumePos,
        }
      );
  
      setSoundMap((prev) => ({ ...prev, [id]: newSound }));
      setPlayingId(id);
  
      // ✅ View tracking block
      if (!viewedIds.has(id)) {
        setAudioStats((prevStats) => {
          const currentViews = prevStats[id]?.views ?? 0;
          const updatedStats = {
            ...prevStats,
            [id]: {
              ...prevStats[id],
              views: currentViews + 1,
            },
          };
          persistStats(updatedStats);
          return updatedStats;
        });
        setViewedIds((prev) => new Set(prev).add(id));
        if (meta?.audioUrl || uri) {
          recordViewed({
            title: meta?.title || "",
            subTitle: meta?.subTitle || "Unknown",
            imageUrl: meta?.imageUrl || require("../../assets/images/image (10).png"),
            views: meta?.views ?? 0,
            audioUrl: meta?.audioUrl || uri,
          });
        }
      }
  
      const initialStatus = await newSound.getStatusAsync();
      if (initialStatus.isLoaded && typeof initialStatus.durationMillis === 'number') {
        const safeDuration = initialStatus.durationMillis || 1;
        setDurationMap((prev) => ({
          ...prev,
          [id]: safeDuration,
        }));

        setProgressMap((prev) => ({
          ...prev,
          [id]: resumePos / safeDuration,
        }));
      }
  
      newSound.setOnPlaybackStatusUpdate(async (status) => {
        if (!status.isLoaded || typeof status.durationMillis !== 'number') return;
        const safeDuration = status.durationMillis || 1;

        setProgressMap((prev) => ({
          ...prev,
          [id]: (status.positionMillis || 0) / safeDuration,
        }));

        setDurationMap((prev) => ({
          ...prev,
          [id]: safeDuration,
        }));
  
        if (status.didJustFinish) {
          setPlayingId(null);
          setProgressMap((prev) => ({ ...prev, [id]: 0 }));
          setPausedMap((prev) => ({ ...prev, [id]: 0 }));
  
          await newSound.unloadAsync();
          setSoundMap((prev) => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
          });
        }
      });
    } catch (err) {
      console.error("❌ Audio playback error:", err);
    } finally {
      setIsLoadingAudio(false);
    }
  };
  
  
  


const stopAudio = useCallback(async () => {
  if (playingId && soundMap[playingId]) {
    await soundMap[playingId].stopAsync();
    await soundMap[playingId].unloadAsync();
    setSoundMap((prev) => {
      const updated = { ...prev };
      delete updated[playingId];
      return updated;
    });
    setPlayingId(null);
  }
}, [playingId, soundMap]);
// ✅ 2. Then register it inside useEffect (AFTER the function is declared)
useEffect(() => {
  useMediaStore.getState().setStopAudioFn(stopAudio);
  return () => {
    useMediaStore.getState().clearStopAudioFn();
  };
}, [stopAudio]);


  useEffect(() => {
    const loadPersistedData = async () => {
      const stats = await getPersistedStats();
      const viewedAudio = await getViewedAudio();

      setAudioStats(stats);
      // show previously viewed audio mini-cards
      setPreviouslyViewedState(Array.isArray(viewedAudio) ? viewedAudio : []);

      // Optional: Restore miniCardViews (just views count from stats)
      const miniViews: Record<string, number> = {};
      Object.keys(stats).forEach((key) => {
        if (typeof stats[key]?.views === "number") {
          miniViews[key] = stats[key].views;
        }
      });
      // setMiniCardViews(miniViews);
    };

    loadPersistedData();
  }, []);

  const getTimeAgo = (createdAt: string): string => {
    const now = new Date();
    const posted = new Date(createdAt);
    const diff = now.getTime() - posted.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (minutes < 1) return "NOW";
    if (minutes < 60) return `${minutes}MIN AGO`;
    if (hours < 24) return `${hours}HRS AGO`;
    return `${days}DAYS AGO`;
  };

  const renderAudioCard = (
    Audio: AudioCard,
    index: number,
    sectionId: string,
    playType: "progress" | "center" = "center"
  ) => {
    const modalKey = `${sectionId}-${index}`;
    const audioUri =
      typeof Audio.fileUrl === "string" ? Audio.fileUrl : Audio.fileUrl?.uri;
    const stats = AudioStats[modalKey] || {};
    const isItemSaved = libraryStore.isItemSaved(modalKey);

    const currentProgress = progressMap[modalKey] || 0;
    const currentDuration = durationMap[modalKey] || 1;

    // Use stable content id for interactions
    const interactionContentId = Audio.contentId || modalKey;

    // Navigate to detail screen
    const navigateToDetail = () => {
      const detailParams = {
        title: Audio.title,
        speaker: Audio.speaker,
        description: Audio.description || 'No description available',
        audioUrl: audioUri,
        imageUrl: Audio?.thumbnailUrl || (Audio?.imageUrl ? (typeof Audio.imageUrl === "string" ? Audio.imageUrl : Audio.imageUrl.uri) : ''),
        thumbnailUrl: Audio?.thumbnailUrl,
        speakerAvatar: Audio?.speakerAvatar ? (typeof Audio.speakerAvatar === "string" ? Audio.speakerAvatar : Audio.speakerAvatar.uri) : '',
        views: (stats.views ?? Audio.views ?? 0).toString(),
        favorites: (stats.favorite ?? Audio.favorite ?? 0).toString(),
        shares: (stats.sheared ?? Audio.sheared ?? 0).toString(),
        comments: (Audio.comment ?? 0).toString(),
        saved: (stats.saved ?? Audio.saved ?? 0).toString(),
        timeAgo: Audio.timeAgo,
        contentId: interactionContentId,
      };
      
      router.push({
        pathname: '/categories/MusicDetailScreen',
        params: detailParams,
      });
    };

    const handleSeek = async (newProgress: number) => {
      const pos = newProgress * currentDuration;
      const currentSound = soundMap[modalKey];
      if (currentSound) {
        await currentSound.setPositionAsync(pos);
      }
      setProgressMap((prev) => ({ ...prev, [modalKey]: newProgress }));
    };

    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const layoutWidth = 260;
        const x = e.nativeEvent.locationX;
        const newProgress = Math.max(0, Math.min(1, x / layoutWidth));
        handleSeek(newProgress);
      },
      onPanResponderMove: (e) => {
        const layoutWidth = 260;
        const x = e.nativeEvent.locationX;
        const newProgress = Math.max(0, Math.min(1, x / layoutWidth));
        handleSeek(newProgress);
      },
    });

    return (
      <View className="flex flex-col">
        <TouchableOpacity
          key={modalKey}
          onPress={navigateToDetail}
          className="mr-4 w-full h-[436px]"
          activeOpacity={0.9}
        >
          <View className="w-full h-[393px] overflow-hidden relative">
            {(() => {
              const coverSource =
                Audio?.thumbnailUrl
                  ? { uri: Audio.thumbnailUrl }
                  : Audio?.imageUrl
                  ? (typeof Audio.imageUrl === "string"
                      ? { uri: Audio.imageUrl }
                      : Audio.imageUrl)
                  : undefined;
              return (
                <Image
                  source={
                    coverSource || require("../../assets/images/image (10).png")
                  }
                  className="w-full h-full absolute"
                  resizeMode="cover"
                />
              );
            })()}

            {playType !== "progress" && (
              <View className="absolute bottom-3 left-3 right-3 z-10 px-3 py-2 rounded">
                <Text
                  className="text-white text-sm font-rubik"
                  numberOfLines={2}
                >
                  {Audio.title}
                </Text>
              </View>
            )}

            {playType === "progress" ? (
              <View className="absolute bottom-3 left-3 right-3 flex-row items-center gap-2 px-2">
                <TouchableOpacity
                 onPress={() => playAudio(audioUri, modalKey, { title: Audio.title, subTitle: getUserDisplayNameFromContent(Audio), imageUrl: (() => { const coverSource = Audio?.thumbnailUrl ? { uri: Audio.thumbnailUrl } : (Audio?.imageUrl ? (typeof Audio.imageUrl === "string" ? { uri: Audio.imageUrl } : Audio.imageUrl) : require("../../assets/images/image (10).png")); return coverSource; })(), audioUrl: audioUri, views: stats.views ?? Audio.views ?? 0, })}

                  className="mr-2"
                >
                  <Ionicons
                    name={playingId === modalKey ? "pause" : "play"}
                    size={24}
                    color="#FEA74E"
                  />
                </TouchableOpacity>

                <View className="flex-1 justify-center px-2">
                  <RNView
                    className="w-full h-1 bg-white/30 rounded-full relative"
                    {...panResponder.panHandlers}
                  >
                    <View
                      className="h-full bg-[#FEA74E] rounded-full"
                      style={{ width: `${currentProgress * 100}%` }}
                    />
                    <View
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-[#FEA74E] rounded-full"
                      style={{
                        left: `${currentProgress * 100}%`,
                        marginLeft: -8,
                      }}
                    />
                  </RNView>
                </View>

                <TouchableOpacity
                  onPress={async () => {
                    const currentMute = muteMap[modalKey] ?? false;
                    const newMuted = !currentMute;
                    setMuteMap((prev) => ({ ...prev, [modalKey]: newMuted }));

                    const currentSound = soundMap[modalKey];
                    if (currentSound) {
                      await currentSound.setIsMutedAsync(newMuted);
                    }
                  }}
                  className="ml-2"
                >
                  <Ionicons
                    name={muteMap[modalKey] ? "volume-mute" : "volume-high"}
                    size={20}
                    color="#FEA74E"
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="absolute inset-0 justify-center items-center">
                <TouchableOpacity
                 onPress={() => playAudio(audioUri, modalKey, { title: Audio.title, subTitle: getUserDisplayNameFromContent(Audio), imageUrl: (() => { const coverSource = Audio?.thumbnailUrl ? { uri: Audio.thumbnailUrl } : (Audio?.imageUrl ? (typeof Audio.imageUrl === "string" ? { uri: Audio.imageUrl } : Audio.imageUrl) : require("../../assets/images/image (10).png")); return coverSource; })(), audioUrl: audioUri, views: stats.views ?? Audio.views ?? 0, })}

                  className="bg-white/70 p-2 rounded-full"
                >
                  <Ionicons
                    name={playingId === modalKey ? "pause" : "play"}
                    size={40}
                    color="#FEA74E"
                  />
                </TouchableOpacity>
              </View>
            )}


       

          
{/* ContentActionModal will be rendered at the bottom */}
          </View>

          <View className="flex-row items-center justify-between mt-1 px-3 mb-4">
          <View className="flex flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1 mt-2">
              <Image
                source={getUserAvatarFromContent(Audio)}
                style={{ width: 30, height: 30, borderRadius: 999 }}
                resizeMode="cover"
              />
            </View>
            <View className="ml-3">
              <View className="flex-row items-center">
                <Text className="ml-1 text-[13px] font-rubik-semibold text-[#344054] mt-1">
                  {getUserDisplayNameFromContent(Audio)}
                </Text>
                <View className="flex flex-row mt-2 ml-2">
                  <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {Audio.timeAgo}
                  </Text>
                </View>
              </View>
              <View className="flex-row mt-2 items-center justify-between">
                <View className="flex-row items-center mr-6">
                  <MaterialIcons name="visibility" size={28} color="#98A2B3" />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {(() => {
                      const displayViews = stats.views ?? Audio.views ?? 0;
                      console.log(`👁️ Displaying views for ${Audio.title}:`, {
                        "stats.views": stats.views,
                        "Audio.views": Audio.views,
                        "displayViews": displayViews,
                        "modalKey": modalKey,
                        "AudioStats[modalKey]": AudioStats[modalKey]
                      });
                      return displayViews;
                    })()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleFavorite(modalKey, Audio)} className="flex-row items-center mr-6">
                  <MaterialIcons
                    name={userFavorites?.[modalKey] ? "favorite" : "favorite-border"}
                    size={28}
                    color={userFavorites?.[modalKey] ? "#D22A2A" : "#98A2B3"}
                  />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {globalFavoriteCounts?.[modalKey] || 0}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="flex-row items-center mr-6"
                  onPress={() => handleComment(modalKey, Audio)}
                >
                  <CommentIcon 
                    comments={[]}
                    size={28}
                    color="#98A2B3"
                    showCount={true}
                    count={stats.comment === 1 ? (Audio.comment ?? 0) + 1 : Audio.comment ?? 0}
                    layout="horizontal"
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleSave(modalKey, Audio)} className="flex-row items-center mr-6">
                  <MaterialIcons
                    name={isItemSaved ? "bookmark" : "bookmark-border"}
                    size={28}
                    color={isItemSaved ? "#FEA74E" : "#98A2B3"}
                  />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {(AudioStats[modalKey] as any)?.totalSaves || Audio.saved || 0}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="flex-row items-center"
                  onPress={() => handleShare(modalKey, Audio)}
                >
                  <Feather 
                    name="send" 
                    size={28} 
                    color="#98A2B3" 
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => handleOpenContentModal(Audio, modalKey)}
            className="mr-2"
          >
            <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMiniCards = (
    title: string,
    items: RecommendedItem[],
    modalIndex: number | null,
    setModalIndex: any
  ) => (
    <View className="mt-9 mb-3">
      <Text className="text-[16px] font-rubik-semibold text-[#344054] mt-4 mb-3 ">
        {title}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {items.map((item, index) => (
          <View
            key={`${title}-${item.title}-${index}`}
            className="mr-4 w-[154px] flex-col items-center"
          >
            <TouchableOpacity
              onPress={() => {
                const detailParams = {
                  title: item.title,
                  speaker: item.subTitle,
                  description: item.description || 'No description available',
                  audioUrl: item.audioUrl,
                  imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : item.imageUrl.uri,
                  views: item.views.toString(),
                  favorites: '1200',
                  shares: '1200',
                  comments: '1200',
                  saved: '1200',
                  timeAgo: '3HRS AGO',
                  contentId: getAudioKey(item.audioUrl),
                };
                
                router.push({
                  pathname: '/categories/MusicDetailScreen',
                  params: detailParams,
                });
              }}
              className="w-full h-[232px] rounded-2xl overflow-hidden relative"
              activeOpacity={0.9}
            >
              <Image
                source={item.imageUrl}
                className="w-full h-full absolute"
                resizeMode="cover"
              />
              <View className="absolute inset-0 justify-center items-center">
                <View className="bg-white/70 p-2 rounded-full">
                  <Ionicons name="play" size={24} color="#FEA74E" />
                </View>
              </View>
              <View className="absolute bottom-2 left-2 right-2">
                <Text
                  className="text-white text-start text-[14px] ml-1 mb-6 font-rubik"
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
              </View>
            </TouchableOpacity>
{/* ContentActionModal will be rendered at the bottom */}
            <View className="mt-2 flex flex-col w-full">
              <View className="flex flex-row justify-between items-center">
                <Text
                  className="text-[12px] text-[#1D2939] font-rubik font-medium"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.subTitle?.split(" ").slice(0, 4).join(" ") + " ..."}
                </Text>
                <TouchableOpacity
                  onPress={() => handleOpenContentModal(item, `mini-${index}`)}
                  className="mr-2"
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={14}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
              <View className="flex-row items-center">
              <MaterialIcons name="visibility" size={24} color="#98A2B3" />
                <Text className="text-[10px] text-gray-500 ml-2 mt-1 font-rubik">
                  {item.views}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <ScrollView
      className="flex-1"
      onScrollBeginDrag={closeAllMenus}
      onTouchStart={closeAllMenus}
    >
      {/* 1. Most Recent */}
      {musicItems.length > 0 && (
        <>
          <Text className="text-[#344054] text-[16px] font-rubik-semibold my-4">
            Most Recent
          </Text>
          {renderAudioCard(
            {
              fileUrl:
                typeof musicItems[0].fileUrl === "string"
                  ? { uri: musicItems[0].fileUrl }
                  : musicItems[0].fileUrl,
              thumbnailUrl: musicItems[0]?.thumbnailUrl,
              imageUrl:
                musicItems[0]?.imageUrl
                  ? (typeof musicItems[0].imageUrl === "string"
                      ? { uri: musicItems[0].imageUrl }
                      : musicItems[0].imageUrl)
                  : undefined,
              title: musicItems[0].title,
              speaker: musicItems[0].speaker ?? "Uploaded Speaker",
              timeAgo: getTimeAgo(musicItems[0].createdAt),
              speakerAvatar:
                typeof musicItems[0].speakerAvatar === "string"
                  ? { uri: musicItems[0].speakerAvatar }
                  : musicItems[0].speakerAvatar ||
                    require("../../assets/images/Avatar-1.png"),
              favorite: musicItems[0].favorite ?? 0,
              views: musicItems[0].viewCount ?? 0,
              saved: musicItems[0].saved ?? 0,
              sheared: musicItems[0].sheared ?? 0,
            },
            0,
            `uploaded-recent-${musicItems[0]._id ?? "0"}`,
            "progress"
          )}
        </>
      )}

      {/* 2. Previously Viewed */}
      {renderMiniCards(
        "Previously Viewed",
        previouslyViewedState,
        pvModalIndex,
        setPvModalIndex
      )}

      {/* 3. Explore More Music */}
      {musicItems.length > 1 && (
        <>
          <Text className="text-[#344054] text-[16px] font-rubik-semibold my-3">
            Explore More Music
          </Text>
          <View className="gap-8">
            {musicItems.slice(1, 5).map((audio, index) => (
              <View key={`ExploreMoreFirst-${audio._id}-${index}`}>
                {renderAudioCard(
                  {
                    fileUrl: { uri: audio.fileUrl },
                    thumbnailUrl: audio?.thumbnailUrl,
                    imageUrl:
                      audio?.imageUrl
                        ? (typeof audio.imageUrl === "string"
                            ? { uri: audio.imageUrl }
                            : audio.imageUrl)
                        : undefined,
                    title: audio.title,
                    speaker: audio.speaker ?? "Uploaded Speaker",
                    timeAgo: getTimeAgo(audio.createdAt),
                    speakerAvatar:
                      typeof audio.speakerAvatar === "string"
                        ? { uri: audio.speakerAvatar }
                        : audio.speakerAvatar ||
                          require("../../assets/images/Avatar-1.png"),
                    favorite: audio.favorite ?? 0,
                    views: audio.viewCount ?? 0,
                    saved: audio.saved ?? 0,
                    sheared: audio.sheared ?? 0,
                  },
                  index,
                  `exploreMoreFirst-${index}`,
                  "center"
                )}
              </View>
            ))}
          </View>
        </>
      )}

      {/* 4. Trending Now */}
      {trendingUiList.length > 0 ? (
        renderMiniCards(
          `Trending Now • ${trendingUiList.length} audio`,
          trendingUiList,
          rsModalIndex,
          setRsModalIndex
        )
      ) : (
        <View className="mt-5 mb-4">
          <Text className="text-[16px] font-rubik-semibold text-[#344054] mt-4 mb-2 ml-2">
            Trending Now
          </Text>
          <View className="bg-gray-50 rounded-lg p-6 mx-2 items-center">
            <Text className="text-[32px] mb-2">📈</Text>
            <Text className="text-[14px] font-rubik-medium text-[#98A2B3] text-center">
              No trending music yet
            </Text>
            <Text className="text-[12px] font-rubik text-[#D0D5DD] text-center mt-1">
              Keep engaging with content to see trending music here
            </Text>
          </View>
        </View>
      )}

      {/* 5. Exploring More */}
      {musicItems.length > 5 && (
        <>
          <Text className="text-[#344054] text-[16px] font-rubik-semibold my-4">
            Exploring More
          </Text>
          <View className="gap-8">
            {musicItems.slice(5, 9).map((audio, index) => (
              <View key={`ExploreMoreSecond-${audio._id}-${index}`}>
                {renderAudioCard(
                  {
                    fileUrl: { uri: audio.fileUrl },
                    thumbnailUrl: audio?.thumbnailUrl,
                    imageUrl:
                      audio?.imageUrl
                        ? (typeof audio.imageUrl === "string"
                            ? { uri: audio.imageUrl }
                            : audio.imageUrl)
                        : undefined,
                    title: audio.title,
                    speaker: audio.speaker ?? "Uploaded Speaker",
                    timeAgo: getTimeAgo(audio.createdAt),
                    speakerAvatar:
                      typeof audio.speakerAvatar === "string"
                        ? { uri: audio.speakerAvatar }
                        : audio.speakerAvatar ||
                          require("../../assets/images/Avatar-1.png"),
                    favorite: audio.favorite ?? 0,
                    views: audio.viewCount ?? 0,
                    saved: audio.saved ?? 0,
                    sheared: audio.sheared ?? 0,
                  },
                  index,
                  `exploreMoreSecond-${index}`,
                  "center"
                )}
              </View>
            ))}
          </View>
        </>
      )}

      {/* 6. Recommended for You */}
      {recommendedMusic.length > 0 && (
        renderMiniCards(
          `Recommended for You • ${recommendedMusic.length} audio`,
          recommendedMusic,
          recModalIndex,
          setRecModalIndex
        )
      )}

      {/* 7. More Music */}
      {musicItems.length > 9 && (
        <>
          <Text className="text-[#344054] text-[16px] font-rubik-semibold my-4">
            More Music
          </Text>
          <View className="gap-8">
            {musicItems.slice(9).map((audio, index) => (
              <View key={`ExploreMoreRest-${audio._id}-${index}`}>
                {renderAudioCard(
                  {
                    fileUrl: { uri: audio.fileUrl },
                    thumbnailUrl: audio?.thumbnailUrl,
                    imageUrl:
                      audio?.imageUrl
                        ? (typeof audio.imageUrl === "string"
                            ? { uri: audio.imageUrl }
                            : audio.imageUrl)
                        : undefined,
                    title: audio.title,
                    speaker: audio.speaker ?? "Uploaded Speaker",
                    timeAgo: getTimeAgo(audio.createdAt),
                    speakerAvatar:
                      typeof audio.speakerAvatar === "string"
                        ? { uri: audio.speakerAvatar }
                        : audio.speakerAvatar ||
                          require("../../assets/images/Avatar-1.png"),
                    favorite: audio.favorite ?? 0,
                    views: audio.viewCount ?? 0,
                    saved: audio.saved ?? 0,
                    sheared: audio.sheared ?? 0,
                  },
                  index,
                  `exploreMoreRest-${index}`,
                  "center"
                )}
              </View>
            ))}
          </View>
        </>
      )}

      {/* Bottom spacing to ensure last card footer is fully visible */}
      <View className="h-20" />

      {/* Content Action Modal */}
      {selectedContent && (
        <ContentActionModal
          isVisible={modalVisible !== null}
          onClose={closeAllMenus}
          onViewDetails={handleViewDetails}
          onSaveToLibrary={() => {
            if (selectedContent) {
              const key = getAudioKey(selectedContent.fileUrl || selectedContent.audioUrl);
              handleSave(key, selectedContent);
            }
          }}
          onShare={() => {
            if (selectedContent) {
              const key = getAudioKey(selectedContent.fileUrl || selectedContent.audioUrl);
              handleShare(key, selectedContent);
            }
          }}
          onDownload={() => {
            if (selectedContent) {
              handleDownloadPress(selectedContent);
            }
          }}
        />
      )}
    </ScrollView>
  );
}


  