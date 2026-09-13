/**
 * CopyrightFreeSongModal - thin shell; logic in useSongModalController.
 */
import {
  Modal,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";

import { PlaylistDetailSheet } from "../../../../app/screens/library/components/PlaylistDetailSheet";
import { SongModalCreatePlaylist } from "./SongModalCreatePlaylist";
import { SongModalOptions } from "./SongModalOptions";
import { SongModalPlayer } from "./SongModalPlayer";
import { SongModalPlaylistSelection } from "./SongModalPlaylistSelection";
import { useSongModalController } from "./hooks/useSongModalController";
import type { CopyrightFreeSongModalProps } from "./types";

export type { CopyrightFreeSongModalProps } from "./types";

export default function CopyrightFreeSongModal(props: CopyrightFreeSongModalProps) {
  const m = useSongModalController(props);

  if (!m.song) return null;

  const isOverlay = props.presentation === "overlay";
  const isInline = props.presentation === "inline";

  const player = (
        <View style={{ flex: 1 }} pointerEvents={props.visible ? "auto" : "none"}>
          <View collapsable={false} style={{ flex: 1 }}>
            <View collapsable={false} style={{ flex: 1 }}>
                  <SongModalPlayer
                    song={m.song}
                    topInset={m.safeTop}
                    bottomInset={m.contentBottomInset}
                    albumArtSize={m.albumArtSize}
                    imageSource={m.imageSource}
                    isLiked={m.isLiked}
                    isTogglingLike={m.isTogglingLike}
                    isPlaying={!!m.isPlaying}
                    isSeeking={m.isSeeking}
                    seekProgress={m.seekProgress}
                    repeatMode={m.repeatMode}
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
                    onPrevious={m.handlePrevious}
                    onNext={m.handleNext}
                    onRepeatCycle={m.handleRepeatCycle}
                    onOpenPlaylistView={() => m.setShowPlaylistModal(true)}
                    onSelectQueueSong={m.handleSelectQueueSong}
                    queueSongs={m.queueSongs}
                    onShare={m.handleShare}
                    isInLibrary={m.isInLibrary}
                    isTogglingSave={m.isTogglingSave}
                    onToggleSave={m.handleToggleSave}
                  />
            </View>
          </View>
        </View>
  );

  const playerBody = player;

  return (
    <View style={{ flex: 1, backgroundColor: "#07110F" }}>
      {isInline ? (
        playerBody
      ) : isOverlay ? (
        <View
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          pointerEvents={props.visible ? "auto" : "none"}
        >
          {props.visible ? (
            <StatusBar
              barStyle="light-content"
              backgroundColor="transparent"
              translucent
            />
          ) : null}
          {playerBody}
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
          <StatusBar
            barStyle="light-content"
            backgroundColor="transparent"
            translucent
          />
          <View style={{ flex: 1, backgroundColor: "#07110F" }}>{playerBody}</View>
        </Modal>
      )}

      {m.showPlaylistModal ? (
        <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]} pointerEvents="box-none">
          <SongModalPlaylistSelection
            visible={m.showPlaylistModal}
            embedded={isOverlay || isInline}
            playlists={m.playlists}
            isLoadingPlaylists={m.isLoadingPlaylists}
            onClose={m.handleClosePlaylistModal}
            onCreateNew={async () => {
              await m.loadPlaylistsFromBackend();
              m.setShowCreatePlaylist(true);
              m.setShowPlaylistModal(false);
            }}
            currentSongId={m.song?._id || m.song?.id}
            onAddToPlaylist={m.handleAddToExistingPlaylist}
            onOpenPlaylist={m.openPlaylistDetail}
            onDeletePlaylist={m.handleDeletePlaylist}
          />
        </View>
      ) : null}

      {m.showCreatePlaylist ? (
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
      ) : null}

      {m.showPlaylistDetail ? (
        <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]} pointerEvents="box-none">
          <PlaylistDetailSheet
            visible={m.showPlaylistDetail}
            embedded={isOverlay || isInline}
            playlist={m.selectedPlaylistForDetail}
            onClose={() => {
              void m.resumePlayerAfterPlaylist();
            }}
            onPlayAll={() => {
              void m.playSelectedPlaylistAt(0);
            }}
            onPlayTrack={(_track, index) => {
              void m.playSelectedPlaylistAt(index);
            }}
            onRemoveTrack={(track) => {
              void m.handleRemovePlaylistTrack(track);
            }}
            onDeletePlaylist={() => {
              if (!m.selectedPlaylistForDetail) return;
              m.handleDeletePlaylist(m.selectedPlaylistForDetail.id);
              void m.resumePlayerAfterPlaylist();
            }}
          />
        </View>
      ) : null}

      {m.showOptionsModal ? (
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
      ) : null}
    </View>
  );
}

