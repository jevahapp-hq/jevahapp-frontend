import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import gospelMusicService, {
  GospelPlaylist,
  GospelTrack,
} from "../services/gospelMusicService";

const { width } = Dimensions.get("window");

interface GospelMusicPlayerProps {
  onClose?: () => void;
}

export default function GospelMusicPlayer({ onClose }: GospelMusicPlayerProps) {
  const [tracks, setTracks] = useState<GospelTrack[]>([]);
  const [playlists, setPlaylists] = useState<GospelPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<GospelPlaylist | null>(null);
  const [currentTrack, setCurrentTrack] = useState<GospelTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    loadFeaturedContent();
  }, []);

  const loadFeaturedContent = async () => {
    try {
      setLoading(true);
      const response = await gospelMusicService.getFeaturedPlaylists();
      if (response.success) {
        setPlaylists(response.data.playlists);
        setTracks(response.data.tracks);
      }
    } catch (error) {
      console.error("Failed to load gospel music:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const response = await gospelMusicService.searchGospelMusic(searchQuery);
      if (response.success) {
        setTracks(response.data.tracks);
        setPlaylists(response.data.playlists);
      }
    } catch (error) {
      console.error("Search failed:", error);
      Alert.alert(
        "Search Error",
        "Unable to search for gospel music. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePlayTrack = (track: GospelTrack) => {
    setCurrentTrack(track);
    setIsPlaying(true);

    // Show info about the track source
    if (track.source === "copyright-free") {
      Alert.alert(
        "Copyright-Free Music",
        "This is a traditional hymn in the public domain. You can play and download it freely.",
        [{ text: "OK" }]
      );
    } else if (track.source === "spotify") {
      Alert.alert(
        "Spotify Integration",
        "This track requires Spotify Premium for full playback. A preview is available.",
        [{ text: "OK" }]
      );
    }
  };

  const handlePlaylistSelect = (playlist: GospelPlaylist) => {
    setSelectedPlaylist(playlist);
    setTracks(playlist.tracks);
  };

  const renderTrackItem = ({ item }: { item: GospelTrack }) => (
    <TouchableOpacity
      style={styles.trackItem}
      onPress={() => handlePlayTrack(item)}
    >
      <View style={styles.trackInfo}>
        <Image
          source={{
            uri: item.thumbnailUrl || "/images/default-music-thumb.jpg",
          }}
          style={styles.trackThumbnail}
          defaultSource={require("../../assets/images/icon.png")}
        />
        <View style={styles.trackDetails}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {item.artist}
          </Text>
          <View style={styles.trackMeta}>
            <Text style={styles.trackDuration}>
              {Math.floor(item.duration / 60)}:
              {(item.duration % 60).toString().padStart(2, "0")}
            </Text>
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceText}>
                {item.source === "copyright-free"
                  ? "Free"
                  : item.source.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.playButton}>
        <Ionicons
          name={currentTrack?.id === item.id && isPlaying ? "pause" : "play"}
          size={24}
          color="#256E63"
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderPlaylistItem = ({ item }: { item: GospelPlaylist }) => (
    <TouchableOpacity
      style={styles.playlistItem}
      onPress={() => handlePlaylistSelect(item)}
    >
      <Image
        source={{
          uri: item.thumbnailUrl || "/images/default-playlist-thumb.jpg",
        }}
        style={styles.playlistThumbnail}
        defaultSource={require("../../assets/images/icon.png")}
      />
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.playlistDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.playlistTracks}>{item.totalTracks} tracks</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#256E63" />
        <Text style={styles.loadingText}>Loading gospel music...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#256E63" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gospel Music</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search" size={24} color="#256E63" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#9CA3AF"
            style={styles.searchIcon}
          />
          <Text
            style={styles.searchInput}
            placeholder="Search gospel music..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Playlists Section */}
      {!selectedPlaylist && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Playlists</Text>
          <FlatList
            data={playlists}
            renderItem={renderPlaylistItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.playlistList}
          />
        </View>
      )}

      {/* Tracks Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {selectedPlaylist ? selectedPlaylist.name : "Gospel Tracks"}
          </Text>
          {selectedPlaylist && (
            <TouchableOpacity onPress={() => setSelectedPlaylist(null)}>
              <Text style={styles.backToPlaylists}>← Back to Playlists</Text>
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          data={tracks}
          renderItem={renderTrackItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.trackList}
        />
      </View>

      {/* Legal Notice */}
      <View style={styles.legalNotice}>
        <Ionicons name="information-circle" size={16} color="#6B7280" />
        <Text style={styles.legalText}>
          Music is provided for spiritual enrichment. Some tracks require proper
          licensing for commercial use.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  searchButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    paddingVertical: 12,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#256E63",
  },
  section: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  backToPlaylists: {
    fontSize: 14,
    color: "#256E63",
    fontWeight: "500",
  },
  playlistList: {
    paddingRight: 20,
  },
  playlistItem: {
    width: 160,
    marginRight: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  playlistThumbnail: {
    width: "100%",
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  playlistDescription: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  playlistTracks: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  trackList: {
    paddingBottom: 20,
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  trackInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  trackThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  trackDetails: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  trackMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  trackDuration: {
    fontSize: 12,
    color: "#9CA3AF",
    marginRight: 8,
  },
  sourceBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceText: {
    fontSize: 10,
    color: "#256E63",
    fontWeight: "500",
  },
  playButton: {
    padding: 8,
  },
  legalNotice: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  legalText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 8,
    flex: 1,
  },
});
