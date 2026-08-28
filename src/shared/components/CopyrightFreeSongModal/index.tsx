/**
 * CopyrightFreeSongModal - thin shell; logic in useSongModalController.
 */
import {
  Modal,
  StatusBar,
  View,
} from "react-native";

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

  const isOverlay = props.presentation === "overlay";

  const player = (
        <View style={{ flex: 1 }} pointerEvents={props.visible ? "auto" : "none"}>
          <View
            collapsable={false}
            style={{
              flex: 1,
              paddingTop: m.safeTop + 4,
            }}
          >
            <View collapsable={false} style={{ flex: 1 }}>
                  <SongModalPlayer
                    song={m.song}
                    bottomInset={m.contentBottomInset}
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
                    onBarLayout={m.onBarLayout}
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
          </View>
        </View>
  );

  return (
    <>
      {isOverlay ? (
        <View
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          pointerEvents={props.visible ? "auto" : "none"}
        >
          {props.visible ? <StatusBar barStyle="light-content" /> : null}
          {player}
        </View>
      ) : (
        <Modal
          visible={props.visible}
          transparent
          animationType="none"
          onRequestClose={m.onClose}
          statusBarTranslucent
          presentationStyle="overFullScreen"
        >
          <StatusBar barStyle="light-content" />
          <View style={{ flex: 1, backgroundColor: "#0A0D14" }}>{player}</View>
        </Modal>
      )}

      <SongModalPlaylistView
        visible={m.showPlaylistView}
        playlists={m.playlists}
        isLoadingPlaylists={m.isLoadingPlaylists}
        animatedStyle={m.playlistViewAnimatedStyle}
        bottomInset={m.safeBottom}
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
        bottomInset={m.safeBottom}
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
        bottomInset={m.safeBottom}
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

