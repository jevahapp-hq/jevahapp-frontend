import {
    Feather,
    Ionicons,
    MaterialIcons
} from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    Image,
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
import { getPersistedStats, getViewed, persistStats, toggleFavorite } from "../utils/persistentStorage";
import { getUserAvatarFromContent, getUserDisplayNameFromContent } from "../utils/userValidation";

interface EbookCard {
  _id?: string;
  title: string;
  description?: string;
  speaker?: string;
  uploadedBy?: string;
  createdAt: string;
  timeAgo?: string;
  speakerAvatar?: any;
  views?: number;
  favorite?: number;
  saved?: number;
  sheared?: number;
  imageUrl?: any;
  fileUrl?: string;
  onPress?: () => void;
}

interface RecommendedItem {
  _id?: string;
  title: string;
  subTitle: string;
  views: number;
  imageUrl: any;
  onPress?: () => void;
  isHot?: boolean;
  isRising?: boolean;
  trendingScore?: number;
}

export default function EbookComponent() {
  const mediaStore = useMediaStore();
  const libraryStore = useLibraryStore();
  
  // ✅ Use global comment modal and interaction store
  const { showCommentModal } = useCommentModal();
  const { comments } = useInteractionStore();
  
  // Download functionality
  const { handleDownload, checkIfDownloaded } = useDownloadHandler();
  const { loadDownloadedItems } = useDownloadStore();
  
  const [modalVisible, setModalVisible] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<any>(null);
  
  // 🎯 New favorite system state - local state for favorites
  const [userFavorites, setUserFavorites] = useState<Record<string, boolean>>({});
  const [globalFavoriteCounts, setGlobalFavoriteCounts] = useState<Record<string, number>>({});
  
  const [ebookStats, setEbookStats] = useState<Record<string, Partial<EbookCard>>>({});
  const [previouslyViewedState, setPreviouslyViewedState] = useState<RecommendedItem[]>([]);

  const getEbookKey = (fileUrl: string): string => `ebook-${fileUrl}`;

  // Close all open menus/popovers across the component
  const closeAllMenus = () => {
    setModalVisible(null);
    setSelectedContent(null);
  };

  // ContentActionModal handlers
  const handleOpenContentModal = (item: any, modalKey: string) => {
    console.log("🔧 Opening modal for:", item.title, "with key:", modalKey);
    setSelectedContent(item);
    setModalVisible(modalKey);
    console.log("🔧 Modal state set - selectedContent:", !!item, "modalVisible:", modalKey);
  };

  const handleViewDetails = () => {
    if (selectedContent) {
      console.log("View details for:", selectedContent.title);
      // For now, just show an alert since EbookDetailScreen might not exist
      // You can implement navigation to a proper ebook detail screen later
      Alert.alert("View Details", `Viewing details for: ${selectedContent.title}`);
      closeAllMenus();
    }
  };

  // Helper functions
  const getContentKey = (item: EbookCard) => item._id || item.fileUrl || item.title;
  
  const handleFavorite = async (key: string, item: EbookCard) => {
    try {
      const { isUserFavorite, globalCount } = await toggleFavorite(key);
      setUserFavorites(prev => ({ ...prev, [key]: isUserFavorite }));
      setGlobalFavoriteCounts(prev => ({ ...prev, [key]: globalCount }));
    } catch (error) {
      console.error(`❌ Failed to toggle favorite for ${item.title}:`, error);
    }
  };

  const handleComment = (key: string, item: EbookCard) => {
    const contentId = item._id || key;
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
    showCommentModal(formattedComments, contentId);
  };

  const handleSave = async (key: string, item: EbookCard) => {
    try {
      const isCurrentlyUserSaved = libraryStore.isItemSaved(key);

      if (!isCurrentlyUserSaved) {
        const libraryItem = {
          id: key,
          contentType: "ebook",
          fileUrl: item.fileUrl || '',
          title: item.title,
          speaker: item.speaker || item.uploadedBy || "Unknown",
          uploadedBy: item.uploadedBy,
          createdAt: item.createdAt || new Date().toISOString(),
          speakerAvatar: item.speakerAvatar,
          views: ebookStats[key]?.views || 0,
          sheared: ebookStats[key]?.sheared || item.sheared || 0,
          favorite: ebookStats[key]?.favorite || item.favorite || 0,
          saved: 1,
          imageUrl: item.imageUrl,
          originalKey: key
        } as const;

        await libraryStore.addToLibrary(libraryItem as any);

        setEbookStats((prev) => {
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
        setEbookStats((prev) => {
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
      console.error("❌ Save operation failed for ebook:", error);
    }
    setModalVisible(null);
  };

  const handleShare = async (key: string, ebook: EbookCard) => {
    try {
      const result = await Share.share({
        title: ebook.title,
        message: `Check out this Ebook: ${ebook.title}\n${ebook.fileUrl}`,
        url: ebook.fileUrl,
      });

      if (result.action === Share.sharedAction) {
        setEbookStats((prev) => {
          const updatedStats = {
            ...prev,
            [key]: {
              ...prev[key],
              sheared: (prev[key]?.sheared || ebook.sheared || 0) + 1,
            },
          };
          persistStats(updatedStats);
          return updatedStats;
        });
      }
    } catch (error) {
      console.warn("❌ Share error:", error);
    }
  };

  const handleDownloadPress = async (item: EbookCard) => {
    const downloadableItem = convertToDownloadableItem(item, 'ebook');
    const result = await handleDownload(downloadableItem);
    if (result.success) {
      await loadDownloadedItems();
    }
  };

  // Filter ebooks from media store
  const ebookItems = mediaStore.mediaList.filter(item => 
    item.contentType === "ebook" || item.contentType === "books"
  );

  // 🔧 Fix infinite loop: Memoize allIndexedEbooks calculation
  const allIndexedEbooks = useMemo(() => 
    ebookItems.map((ebook: any) => {
      const key = getEbookKey(ebook.fileUrl);

      const stats = ebookStats[key] || {};
      const isItemSaved = libraryStore.isItemSaved(key);
      const views = Math.max(stats.views ?? 0, ebook.viewCount ?? 0);
      const shares = Math.max(stats.sheared ?? 0, ebook.sheared ?? 0);
      const favorites = Math.max(stats.favorite ?? 0, ebook.favorite ?? 0);
      const saves = Math.max((stats as any).totalSaves ?? stats.saved ?? 0, ebook.saved ?? 0);
      const score = views + shares + favorites + saves;

      return {
        key,
        fileUrl: ebook.fileUrl,
        title: ebook.title,
        subTitle: ebook.speaker || "Unknown",
        views,
        shares,
        favorites,
        saves,
        score,
        isItemSaved,
        imageUrl: ebook.imageUrl || require("../../assets/images/image (12).png"),
      };
    }), [ebookItems, ebookStats, libraryStore.savedItems]
  );

  // ✅ Trending score using velocity + exponential time-decay
  const calculateTrendingScore = (ebook: any, ebookData: any) => {
    const now = Date.now();
    const createdAt = new Date(ebookData?.createdAt || now).getTime();
    const ageInHours = Math.max(1, (now - createdAt) / (1000 * 60 * 60));

    const views = ebook.views ?? 0;
    const shares = ebook.shares ?? 0;
    const favorites = ebook.favorites ?? 0;
    const saves = ebook.saves ?? 0;

    const viewsPerHour = views / ageInHours;
    const favoritesPerHour = favorites / ageInHours;
    const sharesPerHour = shares / ageInHours;
    const savesPerHour = saves / ageInHours;

    const weightedVelocity =
      1 * Math.sqrt(Math.max(0, viewsPerHour)) +
      2 * Math.log1p(Math.max(0, savesPerHour)) +
      3 * Math.log1p(Math.max(0, favoritesPerHour)) +
      5 * Math.log1p(Math.max(0, sharesPerHour));

    const halfLifeHours = 24;
    const decay = Math.exp(-ageInHours / halfLifeHours);

    const earlyBoost = ageInHours < 6 && (shares + favorites) >= 10 ? 1.25 : 1.0;
    const score = weightedVelocity * decay * earlyBoost * 300;
    const recency = 1 / ageInHours;

    return { score, recency };
  };

  // 🔧 Fix infinite loop: Memoize trendingItems calculation
  const trendingItems: RecommendedItem[] = useMemo(() => {
    const scored = allIndexedEbooks
      .map(ebook => {
        const originalEbook = ebookItems.find(e => e.fileUrl === ebook.fileUrl);
        const { score, recency } = calculateTrendingScore(ebook, originalEbook || {});
        return {
          ...ebook,
          trendingScore: score,
          recency,
          createdAt: originalEbook?.createdAt,
        } as any;
      })
      .filter(e => (e as any).trendingScore > 0);

    const takeTop = (list: any[]) => list
      .sort((a: any, b: any) => {
        if ((b.trendingScore ?? 0) !== (a.trendingScore ?? 0)) return (b.trendingScore ?? 0) - (a.trendingScore ?? 0);
        const av = a.views ?? 0;
        const bv = b.views ?? 0;
        if (bv !== av) return bv - av;
        return (b.recency ?? 0) - (a.recency ?? 0);
      })
      .slice(0, 20)
      .map(({ fileUrl, title, subTitle, imageUrl, trendingScore, views }: any) => {
        const scoreNum = Number(trendingScore || 0);
        const isHot = scoreNum > 1200;
        const isRising = scoreNum > 600 && scoreNum <= 1200;
        return {
          fileUrl,
          title,
          subTitle,
          views: views ?? 0,
          imageUrl,
          isHot,
          isRising,
          trendingScore: scoreNum,
        } as RecommendedItem;
      });

    if (scored.length > 0) return takeTop(scored);

    const fallback = allIndexedEbooks
      .map(ebook => {
        const originalEbook = ebookItems.find(e => e.fileUrl === ebook.fileUrl);
        const createdAt = new Date(originalEbook?.createdAt || Date.now()).getTime();
        return { ...ebook, createdAt } as any;
      })
      .sort((a: any, b: any) => {
        const bv = b.views ?? 0;
        const av = a.views ?? 0;
        if (bv !== av) return bv - av;
        return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      })
      .slice(0, 20)
      .map(({ fileUrl, title, subTitle, imageUrl, views }: any) => ({
        fileUrl,
        title,
        subTitle,
        views: views ?? 0,
        imageUrl,
        isHot: false,
        isRising: false,
        trendingScore: 0,
      } as RecommendedItem));

    return fallback;
  }, [allIndexedEbooks, ebookItems]);

  useEffect(() => {
    const loadPersistedData = async () => {
      console.log("📚 EbookComponent: Loading persisted data...");
      
      // 📚 Load library data first
      if (!libraryStore.isLoaded) {
        await libraryStore.loadSavedItems();
      }
      
      // 📥 Load downloaded items
      await loadDownloadedItems();
      
      // 📊 Load ebook stats and viewed ebooks
      const stats = await getPersistedStats();
      const viewed = await getViewed();

      setEbookStats(stats);
      setPreviouslyViewedState(viewed);

      // 🎯 Load favorite states for all ebooks
      const favoriteStates: Record<string, boolean> = {};
      const favoriteCounts: Record<string, number> = {};
      
      await Promise.all(ebookItems.map(async (ebook) => {
        const key = getEbookKey(ebook.fileUrl);
        const { isUserFavorite, globalCount } = await toggleFavorite(key);
        favoriteStates[key] = isUserFavorite;
        favoriteCounts[key] = globalCount;
      }));
      
      setUserFavorites(favoriteStates);
      setGlobalFavoriteCounts(favoriteCounts);
      
      console.log(`✅ EbookComponent: Loaded ${ebookItems.length} ebooks and stats for ${Object.keys(stats).length} items`);
    };

    loadPersistedData();
  }, [ebookItems.length]);

  // Get time ago for items
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

  // 🔧 Fix infinite loop: Memoize explore ebook arrays
  const firstExploreEbooks = useMemo(() => ebookItems.slice(1, 5), [ebookItems]);
  const middleExploreEbooks = useMemo(() => ebookItems.slice(5, 9), [ebookItems]);
  const remainingExploreEbooks = useMemo(() => ebookItems.slice(9), [ebookItems]);

  // 🎯 Enhanced Recommendation Logic
  const enhancedRecommendedForYou = useMemo((): RecommendedItem[] => {
    if (!ebookItems.length) return [];

    const watchedSpeakers = previouslyViewedState.length > 0 
      ? [...new Set(previouslyViewedState.map(v => (v.subTitle || '').toLowerCase()))]
      : [];

    const likedKeys = Object.keys(userFavorites || {}).filter(k => userFavorites[k]);
    const likedSpeakers = new Set<string>();
    likedKeys.forEach((k) => {
      const ebook = allIndexedEbooks.find(v => v.key === k);
      if (ebook?.subTitle) likedSpeakers.add(String(ebook.subTitle).toLowerCase());
    });

    const scoreEbook = (ebook: any) => {
      const originalEbook = ebookItems.find(e => e.fileUrl === ebook.fileUrl);
      let recommendationScore = 1;

      const titleLower = (ebook.title || '').toLowerCase();
      const speakerLower = (ebook.subTitle || '').toLowerCase();

      const fromLikedSpeaker = likedSpeakers.has(speakerLower);
      if (fromLikedSpeaker) recommendationScore *= 3.0;

      const fromWatchedSpeaker = watchedSpeakers.includes(speakerLower);
      if (fromWatchedSpeaker) recommendationScore *= 1.8;

      const now = new Date().getTime();
      const createdAt = new Date(originalEbook?.createdAt || Date.now()).getTime();
      const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.max(0.75, 1 - (ageInDays / 45));
      recommendationScore *= recencyBoost;

      const globalTieBreaker = (ebook.views || 0) * 0.001 + (ebook.favorites || 0) * 0.01 + (ebook.shares || 0) * 0.02;
      recommendationScore += globalTieBreaker;

      return {
        ...ebook,
        recommendationScore,
        isFromFavoriteSpeaker: fromLikedSpeaker || fromWatchedSpeaker
      };
    };

    const scoredFiltered = allIndexedEbooks
      .filter(ebook => !previouslyViewedState.some(v => v.fileUrl === ebook.fileUrl))
      .map(scoreEbook)
      .sort((a, b) => b.recommendationScore - a.recommendationScore);

    const source = scoredFiltered.length > 0
      ? scoredFiltered
      : allIndexedEbooks.map(scoreEbook).sort((a, b) => b.recommendationScore - a.recommendationScore);

    const combinedRecommendations = source
      .slice(0, 12)
      .map(({ fileUrl, title, subTitle, views, imageUrl }) => ({
        fileUrl,
        title,
        subTitle,
        views,
        imageUrl
      }));

    return combinedRecommendations;
  }, [ebookItems, previouslyViewedState, allIndexedEbooks, trendingItems, ebookStats, userFavorites]);

  const renderEbookCard = (
    ebook: EbookCard,
    index: number,
    sectionId: string
  ) => {
    const modalKey = getEbookKey(ebook.fileUrl);
    const stats = ebookStats[modalKey] || {};
    const isItemSaved = libraryStore.isItemSaved(modalKey);

    return (
      <View key={modalKey} className="flex flex-col mb-6">
        <TouchableOpacity
          onPress={() => {
            // For now, just show an alert since EbookDetailScreen might not exist
            Alert.alert("View Details", `Viewing details for: ${ebook.title}`);
          }}
          className="mr-4 w-full h-[436px]"
          activeOpacity={0.9}
        >
          <View className="w-full h-[393px] overflow-hidden relative">
            <Image
              source={ebook.imageUrl}
              className="w-full h-full absolute"
              resizeMode="cover"
            />

            <View className="absolute bottom-3 left-3 right-3">
              <Text
                className="text-white text-base font-bold"
                numberOfLines={2}
              >
                {ebook.title}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between mt-1 px-3 mb-4">
            <View className="flex flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1 mt-2">
                <Image
                  source={getUserAvatarFromContent(ebook)}
                  style={{ width: 30, height: 30, borderRadius: 999 }}
                  resizeMode="cover"
                />
              </View>
              <View className="ml-3">
                <View className="flex-row items-center">
                  <Text className="ml-1 text-[13px] font-rubik-semibold text-[#344054] mt-1">
                    {getUserDisplayNameFromContent(ebook)}
                  </Text>
                  <View className="flex flex-row mt-2 ml-2">
                    <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                    <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                      {ebook.timeAgo || getTimeAgo(ebook.createdAt)}
                    </Text>
                  </View>
                </View>
                <View className="flex-row mt-2 items-center justify-between">
                  <View className="flex-row items-center mr-6">
                    <MaterialIcons name="visibility" size={28} color="#98A2B3" />
                    <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                      {stats.views ?? ebook.views ?? 0}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleFavorite(modalKey, ebook)} className="flex-row items-center mr-6">
                    <MaterialIcons
                      name={userFavorites[modalKey] ? "favorite" : "favorite-border"}
                      size={28}
                      color={userFavorites[modalKey] ? "#D22A2A" : "#98A2B3"}
                    />
                    <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                      {globalFavoriteCounts[modalKey] || 0}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className="flex-row items-center mr-6"
                    onPress={() => handleComment(modalKey, ebook)}
                  >
                    <CommentIcon 
                      comments={[]}
                      size={28}
                      color="#98A2B3"
                      showCount={true}
                      count={stats.comment === 1 ? (ebook.comment ?? 0) + 1 : ebook.comment ?? 0}
                      layout="horizontal"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleSave(modalKey, ebook)} className="flex-row items-center mr-6">
                    <MaterialIcons
                      name={isItemSaved ? "bookmark" : "bookmark-border"}
                      size={28}
                      color={isItemSaved ? "#FEA74E" : "#98A2B3"}
                    />
                    <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                      {(ebookStats[modalKey] as any)?.totalSaves || ebook.saved || 0}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className="flex-row items-center"
                    onPress={() => handleShare(modalKey, ebook)}
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
              onPress={() => handleOpenContentModal(ebook, modalKey)}
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
    items: RecommendedItem[]
  ) => (
    <View className="mb-6">
      <Text className="text-[16px] mb-3 font-rubik-semibold text-[#344054] mt-4">
        {title}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {items.map((item, index) => (
          <View key={`${title}-${item.title}-${index}`} className="mr-4 w-[154px] flex-col items-center">
            <TouchableOpacity
              onPress={() => {
                // For now, just show an alert since EbookDetailScreen might not exist
                Alert.alert("View Details", `Viewing details for: ${item.title}`);
              }}
              className="w-full h-[232px] rounded-2xl overflow-hidden relative"
              activeOpacity={0.9}
            >
              <Image
                source={item.imageUrl}
                className="w-full h-full absolute"
                resizeMode="cover"
              />

              <View className="absolute bottom-2 left-2 right-2">
                <Text
                  className="text-white text-start text-[14px] ml-1 mb-6 font-rubik"
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
              </View>
            </TouchableOpacity>
            <View className="mt-2 flex flex-col w-full">
              <View className="flex flex-row justify-between items-center">
                <Text
                  className="text-[12px] text-[#98A2B3] font-rubik font-medium"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.subTitle?.split(" ").slice(0, 4).join(" ") + " ..."}
                </Text>
                <TouchableOpacity
                  onPress={() => handleOpenContentModal(item, `mini-${title}-${index}`)}
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
                <MaterialIcons name="visibility" size={16} color="#98A2B3" />
                <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                  {item.views}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  useFocusEffect(
    useCallback(() => {
      mediaStore.refreshUserDataForExistingMedia();
      loadDownloadedItems();
    }, [])
  );

  return (
    <ScrollView
      className="flex-1 px-3 w-full"
      onScrollBeginDrag={closeAllMenus}
      onTouchStart={closeAllMenus}
    >
      {ebookItems.length > 0 && (
        <>
          <Text className="text-[#344054] text-[16px] font-rubik-semibold my-4">
            Most Recent
          </Text>
          {renderEbookCard(
            {
              fileUrl: ebookItems[0].fileUrl,
              title: ebookItems[0].title,
              speaker: ebookItems[0].speaker || "Unknown",
              timeAgo: getTimeAgo(ebookItems[0].createdAt),
              speakerAvatar:
                typeof ebookItems[0].speakerAvatar === "string"
                  ? ebookItems[0].speakerAvatar.trim()
                  : require("../../assets/images/Avatar-1.png"),
              views: ebookItems[0].viewCount || 0,
              favorite: ebookItems[0].favorite || 0,
              saved: ebookItems[0].saved || 0,
              sheared: ebookItems[0].sheared || 0,
              comment: ebookItems[0].comment || 0,
              createdAt: ebookItems[0].createdAt,
              imageUrl: ebookItems[0].imageUrl || require("../../assets/images/image (12).png"),
            },
            0,
            "uploaded"
          )}
        </>
      )}

      {renderMiniCards(
        "Previously Read",
        previouslyViewedState
      )}

      {firstExploreEbooks.length > 0 && (
        <>
          <Text className="text-[#344054] text-[16px] font-rubik-semibold my-3">
            Explore More
          </Text>
          <View className="gap-8">
            {firstExploreEbooks.map((ebook, index) =>
              renderEbookCard(
                {
                  fileUrl: ebook.fileUrl,
                  title: ebook.title,
                  speaker: ebook.speaker || "Unknown",
                  timeAgo: getTimeAgo(ebook.createdAt),
                  speakerAvatar:
                    typeof ebook.speakerAvatar === "string"
                      ? ebook.speakerAvatar.trim()
                      : require("../../assets/images/Avatar-1.png"),
                  views: ebook.viewCount || 0,
                  favorite: ebook.favorite || 0,
                  saved: ebook.saved || 0,
                  sheared: ebook.sheared || 0,
                  comment: ebook.comment || 0,
                  createdAt: ebook.createdAt,
                  imageUrl: ebook.imageUrl || require("../../assets/images/image (12).png"),
                },
                index + 1,
                "explore-early"
              )
            )}
          </View>
        </>
      )}

      {/* 🔥 Trending Section */}
      {trendingItems.length > 0 ? (
        renderMiniCards(
          `Trending • ${trendingItems.length} ebooks`,
          trendingItems
        )
      ) : (
        <View className="mt-5 mb-4">
          <Text className="text-[16px] font-rubik-semibold text-[#344054] mt-4 mb-2 ml-2">
            Trending
          </Text>
          <View className="bg-gray-50 rounded-lg p-6 mx-2 items-center">
            <Text className="text-[32px] mb-2">📈</Text>
            <Text className="text-[14px] font-rubik-medium text-[#98A2B3] text-center">
              No trending ebooks yet
            </Text>
            <Text className="text-[12px] font-rubik text-[#D0D5DD] text-center mt-1">
              Keep engaging with content to see trending ebooks here
            </Text>
          </View>
        </View>
      )}

      {/* 🎯 Enhanced Recommendation Sections */}
      {enhancedRecommendedForYou.length > 0 && (
        renderMiniCards(
          `Recommended for You • ${enhancedRecommendedForYou.length} ebooks`,
          enhancedRecommendedForYou
        )
      )}

      {remainingExploreEbooks.length > 0 && (
        <>
          <Text className="text-[#344054] text-[16px] font-rubik-semibold my-4">
            More Ebooks
          </Text>
          <View className="gap-8">
            {remainingExploreEbooks.map((ebook, index) =>
              renderEbookCard(
                {
                  fileUrl: ebook.fileUrl,
                  title: ebook.title,
                  speaker: ebook.speaker || "Unknown",
                  timeAgo: getTimeAgo(ebook.createdAt),
                  speakerAvatar:
                    typeof ebook.speakerAvatar === "string"
                      ? ebook.speakerAvatar.trim()
                      : require("../../assets/images/Avatar-1.png"),
                  views: ebook.viewCount || 0,
                  favorite: ebook.favorite || 0,
                  saved: ebook.saved || 0,
                  sheared: ebook.sheared || 0,
                  comment: ebook.comment || 0,
                  createdAt: ebook.createdAt,
                  imageUrl: ebook.imageUrl || require("../../assets/images/image (12).png"),
                },
                index + 100,
                "explore-remaining"
              )
            )}
          </View>
        </>
      )}

      {/* Content Action Modal */}
      {selectedContent && (
        <>
          {console.log("🔧 Rendering modal - selectedContent:", !!selectedContent, "modalVisible:", modalVisible)}
          <ContentActionModal
            isVisible={modalVisible !== null}
            onClose={() => {
              console.log("🔧 Closing modal");
              closeAllMenus();
            }}
            onViewDetails={handleViewDetails}
            onSaveToLibrary={() => {
              if (selectedContent) {
                const key = getEbookKey(selectedContent.fileUrl);
                handleSave(key, selectedContent);
              }
            }}
            onShare={() => {
              if (selectedContent) {
                const key = getEbookKey(selectedContent.fileUrl);
                handleShare(key, selectedContent);
              }
            }}
            onDownload={() => {
              if (selectedContent) {
                handleDownloadPress(selectedContent);
              }
            }}
          />
        </>
      )}
    </ScrollView>
  );
}
