import { MutableRefObject } from "react";
import { isSermonVideo } from "../utils";
import { PlayType } from "../types";
import SermonAudioCard from "./SermonAudioCard";
import SermonVideoCard from "./SermonVideoCard";

export interface SermonCardProps {
  item: any;
  index: number;
  sectionId: string;
  playType?: PlayType;
  videoRefs: MutableRefObject<Record<string, any>>;
  playingAudioId: string | null;
  audioProgressMap: Record<string, number>;
  contentStats: Record<string, any>;
  userFavorites: Record<string, boolean>;
  globalFavoriteCounts: Record<string, number>;
  modalVisible: string | null;
  comments: Record<string, any[]>;
  videoErrors: Record<string, boolean>;
  viewCounted: Record<string, boolean>;
  videoVolume: number;
  playAudio: (uri: string, id: string) => void;
  handleFavorite: (key: string, item: any) => void;
  handleSave: (key: string, item: any) => void;
  handleShare: (key: string, item: any) => void;
  handleVideoTap: (key: string, video: any, index: number) => void;
  handleVideoReload: (key: string) => void;
  incrementView: (key: string, item: any) => void;
  setModalVisible: (key: string | null) => void;
  setVideoErrors: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  setViewCounted: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  showCommentModal: (comments: any[], contentId: string) => void;
  onDownloadSuccess: (message: string) => void;
}

export default function SermonCard({
  item,
  index,
  sectionId,
  playType: _playType = "center",
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
  onDownloadSuccess,
}: SermonCardProps) {
  if (isSermonVideo(item)) {
    return (
      <SermonVideoCard
        video={item}
        index={index}
        sectionId={sectionId}
        videoRefs={videoRefs}
        contentStats={contentStats}
        userFavorites={userFavorites}
        globalFavoriteCounts={globalFavoriteCounts}
        modalVisible={modalVisible}
        videoErrors={videoErrors}
        viewCounted={viewCounted}
        videoVolume={videoVolume}
        handleFavorite={handleFavorite}
        handleSave={handleSave}
        handleShare={handleShare}
        handleVideoTap={handleVideoTap}
        handleVideoReload={handleVideoReload}
        incrementView={incrementView}
        setModalVisible={setModalVisible}
        setVideoErrors={setVideoErrors}
        setViewCounted={setViewCounted}
        showCommentModal={showCommentModal}
      />
    );
  }

  return (
    <SermonAudioCard
      audio={item}
      index={index}
      sectionId={sectionId}
      playingAudioId={playingAudioId}
      audioProgressMap={audioProgressMap}
      contentStats={contentStats}
      userFavorites={userFavorites}
      globalFavoriteCounts={globalFavoriteCounts}
      modalVisible={modalVisible}
      comments={comments}
      playAudio={playAudio}
      handleFavorite={handleFavorite}
      handleSave={handleSave}
      handleShare={handleShare}
      setModalVisible={setModalVisible}
      onDownloadSuccess={onDownloadSuccess}
    />
  );
}
