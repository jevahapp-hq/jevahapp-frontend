/**
 * CopyrightFreeSongModal - thin shell; logic in useSongModalController.
 */
import {
  Modal,
  Platform,
  StatusBar,
  View,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";

import { SongModalCreatePlaylist } from "./SongModalCreatePlaylist";
import { SongModalOptions } from "./SongModalOptions";
import { SongModalPlayer } from "./SongModalPlayer";
import { SongModalPlaylistDetail } from "./SongModalPlaylistDetail";
import { SongModalPlaylistSelection } from "./SongModalPlaylistSelection";
import { SongModalPlaylistView } from "./SongModalPlaylistView";
import { useSongModalController } from "./hooks/useSongModalController";
import type { CopyrightFreeSongModalProps } from "./types";

export type { CopyrightFreeSongModalProps } from "./types";

export default function CopyrightFreeSongModal(props: CopyrightFreeSongModalProps) {
  const m = useSongModalController(props);

  if (!m.song) return null;

  return (
    <>
      <Modal
        visible={props.visible}
        transparent
        animationType="none"
        onRequestClose={m.onClose}
        statusBarTranslucent
      >
        <StatusBar barStyle="light-content" />
        <View style={{ flex: 1 }}>
          <Animated.View
            collapsable={false}
            style={[
              {
                flex: 1,
                paddingTop: Platform.OS === "ios" ? 50 : 40,
                paddingBottom: Platform.OS === "ios" ? 40 : 30,
              },
              m.modalAnimatedStyle,
            ]}
          >
            <View collapsable={false} style={{ flex: 1 }}>
              <GestureDetector gesture={m.gesture}>
                <View collapsable={false} style={{ flex: 1 }}>
                  <SongModalPlayer
                    song={m.song}
                    albumArtSize={m.albumArtSize}
                    imageSource={m.imageSource}
                    isLiked={m.isLiked}
                    likeCount={m.likeCount}
                    viewCount={m.viewCount}
                    isTogglingLike={m.isTogglingLike}
                    isPlaying={!!m.isPlaying}
                    isSeeking={m.isSeeking}
                    seekProgress={m.seekProgress}
                    audioProgress={m.audioProgress}
                    audioDuration={m.audioDuration}
                    audioPosition={m.audioPosition}
                    repeatMode={m.repeatMode}
                    isShuffled={m.isShuffled}
                    isMuted={!!m.isMuted}
                    progressBarRef={m.progressBarRef}
                    panHandlers={m.panHandlers}
                    formatTime={m.formatTime}
                    onClose={m.onClose}
                    onOptionsPress={m.handleOptionsPress}
                    onToggleLike={m.handleToggleLike}
                    onTogglePlay={() =>
                      m.onTogglePlay ? m.onTogglePlay() : m.onPlay?.(m.song)
                    }
                    onToggleMute={() => m.onToggleMute?.()}
                    onSkip={m.handleSkip}
                    onRepeatCycle={m.handleRepeatCycle}
                    onToggleShuffle={m.toggleShuffle}
                    onOpenPlaylistView={() => m.setShowPlaylistView(true)}
                    onShare={m.handleShare}
                  />
                </View>
              </GestureDetector>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <SongModalPlaylistView
        visible={m.showPlaylistView}
        playlists={m.playlists}
        isLoadingPlaylists={m.isLoadingPlaylists}
        animatedStyle={m.playlistViewAnimatedStyle}
        onClose={() => m.setShowPlaylistView(false)}
        onSelectPlaylist={(playlist) => {
          m.setSelectedPlaylistForDetail(playlist);
          m.setShowPlaylistView(false);
          m.setShowPlaylistDetail(true);
        }}
      />

      <SongModalPlaylistSelection
        visible={m.showPlaylistModal}
        playlists={m.playlists}
        isLoadingPlaylists={m.isLoadingPlaylists}
        onClose={m.handleClosePlaylistModal}
        onCreateNew={async () => {
          await m.loadPlaylistsFromBackend();
          m.setShowCreatePlaylist(true);
          m.setShowPlaylistModal(false);
        }}
        onAddToPlaylist={m.handleAddToExistingPlaylist}
        onDeletePlaylist={m.handleDeletePlaylist}
      />

      <SongModalCreatePlaylist
        visible={m.showCreatePlaylist}
        playlistName={m.newPlaylistName}
        playlistDescription={m.newPlaylistDescription}
        isLoading={m.isLoadingPlaylists}
        onNameChange={m.setNewPlaylistName}
        onDescriptionChange={m.setNewPlaylistDescription}
        onCreate={m.handleCreatePlaylist}
        onCancel={() => {
          m.setShowCreatePlaylist(false);
          m.setNewPlaylistName("");
          m.setNewPlaylistDescription("");
        }}
      />

      <SongModalPlaylistDetail
        visible={m.showPlaylistDetail}
        playlist={m.selectedPlaylistForDetail}
        animatedStyle={m.playlistDetailAnimatedStyle}
        onClose={() => {
          m.setShowPlaylistDetail(false);
          m.setSelectedPlaylistForDetail(null);
        }}
        onBack={() => {
          m.setShowPlaylistDetail(false);
          m.setSelectedPlaylistForDetail(null);
          setTimeout(() => m.setShowPlaylistView(true), 100);
        }}
        onPlaySong={(s) => m.onPlay?.(s)}
      />

      <SongModalOptions
        visible={m.showOptionsModal}
        song={m.song}
        viewCount={m.viewCount}
        shareCount={m.shareCount}
        isInLibrary={m.isInLibrary}
        isTogglingSave={m.isTogglingSave}
        optionsSongData={m.optionsSongData}
        loadingOptionsSong={m.loadingOptionsSong}
        onClose={() => {
          m.setShowOptionsModal(false);
          m.setOptionsSongData(null);
        }}
        onAddToPlaylist={() => {
          m.setShowOptionsModal(false);
          m.setOptionsSongData(null);
          m.setShowPlaylistModal(true);
        }}
        onToggleSave={m.handleToggleSave}
      />
    </>
  );
}
