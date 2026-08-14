import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import SuccessCard from "../../components/SuccessCard";
import { useDownloadStore } from "../../store/useDownloadStore";
import { useMediaStore } from "../../store/useUploadStore";
import { getDisplayName } from "../../utils/userValidation";
import MiniCardRow from "./components/MiniCardRow";
import SermonCard from "./components/SermonCard";
import {
  useSermonAudio,
  useSermonContent,
  useSermonInteractions,
  useSermonVideoSync,
} from "./hooks";

export default function SermonComponent() {
  const mediaStore = useMediaStore();
  const { loadDownloadedItems } = useDownloadStore();
  const videoRefs = useRef<Record<string, any>>({});

  const [pvModalIndex, setPvModalIndex] = useState<number | null>(null);
  const [trendingModalIndex, setTrendingModalIndex] = useState<number | null>(
    null
  );
  const [recommendedModalIndex, setRecommendedModalIndex] = useState<
    number | null
  >(null);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const {
    sermonContent,
    recentSermons,
    exploreMoreSermons,
    trendingSermons,
    recommendedSermons,
    previouslyViewed,
  } = useSermonContent(mediaStore.mediaList);

  const { playingAudioId, audioProgressMap, playAudio } = useSermonAudio();

  const {
    comments,
    showCommentModal,
    modalVisible,
    setModalVisible,
    contentStats,
    userFavorites,
    globalFavoriteCounts,
    viewCounted,
    setViewCounted,
    videoErrors,
    setVideoErrors,
    videoVolume,
    handleVideoReload,
    handleVideoTap,
    handleShare,
    handleSave,
    handleFavorite,
    incrementView,
    handleComment,
  } = useSermonInteractions({ videoRefs });

  useSermonVideoSync(videoRefs);

  useFocusEffect(
    useCallback(() => {
      mediaStore.refreshUserDataForExistingMedia();
      loadDownloadedItems();
    }, [])
  );

  const onDownloadSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessCard(true);
  };

  const closeAllMenus = () => {
    setModalVisible(null);
    setPvModalIndex(null);
    setTrendingModalIndex(null);
    setRecommendedModalIndex(null);
  };

  const cardProps = {
    videoRefs,
    playingAudioId,
    audioProgressMap,
    contentStats,
    userFavorites,
    globalFavoriteCounts,
    modalVisible,
    comments,
    videoErrors,
    viewCounted,
    videoVolume,
    playAudio,
    handleFavorite,
    handleSave,
    handleShare,
    handleVideoTap,
    handleVideoReload,
    incrementView,
    setModalVisible,
    setVideoErrors,
    setViewCounted,
    showCommentModal,
    handleComment,
    onDownloadSuccess,
  };

  return (
    <View className="flex-1">
      {showSuccessCard && (
        <SuccessCard
          message={successMessage}
          onClose={() => setShowSuccessCard(false)}
          duration={3000}
        />
      )}
      <ScrollView
        className="flex-1"
        onScrollBeginDrag={closeAllMenus}
        onTouchStart={closeAllMenus}
      >
        {/* 1. Most Recent Upload */}
        {recentSermons.length > 0 && (
          <View className="mt-4">
            <Text className="text-[#344054] text-[16px] font-rubik-semibold mb-4 ml-2">
              Most Recent
            </Text>
            {recentSermons.map((item, index) => (
              <SermonCard
                key={`recent-${item._id || index}`}
                item={{
                  ...item,
                  views: (item as any).views || 0,
                  favorite: item.favorite || 0,
                  saved: item.saved || 0,
                  sheared: item.sheared || 0,
                }}
                index={index}
                sectionId="recent"
                playType="progress"
                {...cardProps}
              />
            ))}
          </View>
        )}

        {/* 2. Previously Viewed */}
        {previouslyViewed.length > 0 && (
          <MiniCardRow
            title="Previously Viewed"
            items={previouslyViewed}
            modalIndex={pvModalIndex}
            setModalIndex={setPvModalIndex}
            onDownloadSuccess={onDownloadSuccess}
          />
        )}

        {/* 3. First 4 Explore More Sermon */}
        {exploreMoreSermons.length > 0 && (
          <>
            <Text className="text-[#344054] text-[16px] font-rubik-semibold my-4">
              Explore More Sermon
            </Text>
            <View className="gap-12">
              {exploreMoreSermons.map((video, index) => (
                <View key={`ExploreMoreFirst-${video._id}-${index}`}>
                  <SermonCard
                    item={video}
                    index={index}
                    sectionId="explore"
                    playType="center"
                    {...cardProps}
                  />
                </View>
              ))}
            </View>
          </>
        )}

        {/* 4. Trending Now */}
        {trendingSermons.length > 0 && (
          <MiniCardRow
            title="Trending Now"
            items={trendingSermons.map((item, index) => ({
              key: `trending-sermon-${(item as any)._id || index}`,
              fileUrl: item.fileUrl,
              title: item.title,
              imageUrl: item.imageUrl || { uri: item.fileUrl },
              subTitle: getDisplayName(item.speaker, item.uploadedBy),
              views: (item as any).views || 0,
              onPress: () => console.log("Viewing", item.title),
            }))}
            modalIndex={trendingModalIndex}
            setModalIndex={setTrendingModalIndex}
            onDownloadSuccess={onDownloadSuccess}
          />
        )}

        {/* 5. Second 4 Explore More Sermon */}
        {sermonContent.length > 5 && (
          <>
            <Text className="text-[#344054] text-[16px] font-rubik-semibold my-4">
              Explore More Sermon
            </Text>
            <View className="gap-12">
              {sermonContent.slice(5, 9).map((video, index) => (
                <View key={`ExploreMoreSecond-${video._id}-${index}`}>
                  <SermonCard
                    item={video}
                    index={index}
                    sectionId="exploreSecond"
                    playType="center"
                    {...cardProps}
                  />
                </View>
              ))}
            </View>
          </>
        )}

        {/* 6. Recommended For You */}
        {recommendedSermons.length > 0 && (
          <MiniCardRow
            title="Recommended for you"
            items={recommendedSermons.map((item, index) => ({
              key: `recommended-sermon-${(item as any)._id || index}`,
              fileUrl: item.fileUrl,
              title: item.title,
              imageUrl: item.imageUrl || { uri: item.fileUrl },
              subTitle: getDisplayName(item.speaker, item.uploadedBy),
              views: (item as any).views || 0,
              onPress: () => console.log("Viewing", item.title),
            }))}
            modalIndex={recommendedModalIndex}
            setModalIndex={setRecommendedModalIndex}
            onDownloadSuccess={onDownloadSuccess}
          />
        )}

        {/* 7. Remaining Explore More Sermon */}
        {sermonContent.length > 9 && (
          <>
            <Text className="text-[#344054] text-[16px] font-rubik-semibold my-4">
              Explore More Sermon
            </Text>
            <View className="gap-12">
              {sermonContent.slice(9).map((video, index) => (
                <View key={`ExploreMoreRest-${video._id}-${index}`}>
                  <SermonCard
                    item={video}
                    index={index}
                    sectionId="exploreRest"
                    playType="center"
                    {...cardProps}
                  />
                </View>
              ))}
            </View>
          </>
        )}

        {/* Empty State */}
        {sermonContent.length === 0 && (
          <View className="flex-1 justify-center items-center mt-20">
            <Text className="text-gray-500 text-center text-lg font-rubik">
              No sermon content available yet.
            </Text>
            <Text className="text-gray-400 text-center text-sm font-rubik mt-2">
              Upload sermon content to see it here.
            </Text>
          </View>
        )}

        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
