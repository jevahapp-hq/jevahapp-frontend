import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import hymnAudioService from "../services/hymnAudioService";

interface Hymn {
  id: string;
  title: string;
  composer: string;
  year: number;
  lyrics: string[];
  audioUrl?: string;
  thumbnailUrl?: string;
  category: string;
  duration: number;
}

interface TraditionalHymnsProps {
  onClose?: () => void;
}

export default function TraditionalHymns({ onClose }: TraditionalHymnsProps) {
  const [hymns, setHymns] = useState<Hymn[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    loadTraditionalHymns();

    // Cleanup audio when component unmounts
    return () => {
      hymnAudioService.cleanup();
    };
  }, []);

  const loadTraditionalHymns = () => {
    // These are all public domain hymns - no copyright issues!
    const traditionalHymns: Hymn[] = [
      {
        id: "amazing-grace",
        title: "Amazing Grace",
        composer: "John Newton",
        year: 1779,
        lyrics: [
          "Amazing grace! How sweet the sound",
          "That saved a wretch like me!",
          "I once was lost, but now am found;",
          "Was blind, but now I see.",
          "",
          "'Twas grace that taught my heart to fear,",
          "And grace my fears relieved;",
          "How precious did that grace appear",
          "The hour I first believed.",
          "",
          "Through many dangers, toils and snares,",
          "I have already come;",
          "'Tis grace hath brought me safe thus far,",
          "And grace will lead me home.",
          "",
          "When we've been there ten thousand years,",
          "Bright shining as the sun,",
          "We've no less days to sing God's praise",
          "Than when we'd first begun.",
        ],
        audioUrl: "/audio/amazing-grace.mp3",
        thumbnailUrl: "/images/amazing-grace-thumb.jpg",
        category: "Traditional Hymn",
        duration: 240,
      },
      {
        id: "how-great-thou-art",
        title: "How Great Thou Art",
        composer: "Carl Boberg",
        year: 1885,
        lyrics: [
          "O Lord my God, when I in awesome wonder",
          "Consider all the worlds Thy hands have made",
          "I see the stars, I hear the rolling thunder",
          "Thy power throughout the universe displayed",
          "",
          "Then sings my soul, my Saviour God, to Thee,",
          "How great Thou art, how great Thou art!",
          "Then sings my soul, my Saviour God, to Thee,",
          "How great Thou art, how great Thou art!",
          "",
          "When through the woods and forest glades I wander",
          "And hear the birds sing sweetly in the trees",
          "When I look down from lofty mountain grandeur",
          "And hear the brook and feel the gentle breeze",
          "",
          "Then sings my soul, my Saviour God, to Thee,",
          "How great Thou art, how great Thou art!",
          "Then sings my soul, my Saviour God, to Thee,",
          "How great Thou art, how great Thou art!",
        ],
        audioUrl: "/audio/how-great-thou-art.mp3",
        thumbnailUrl: "/images/how-great-thou-art-thumb.jpg",
        category: "Traditional Hymn",
        duration: 280,
      },
      {
        id: "blessed-assurance",
        title: "Blessed Assurance",
        composer: "Fanny Crosby",
        year: 1873,
        lyrics: [
          "Blessed assurance, Jesus is mine!",
          "O what a foretaste of glory divine!",
          "Heir of salvation, purchase of God,",
          "Born of His Spirit, washed in His blood.",
          "",
          "This is my story, this is my song,",
          "Praising my Savior all the day long;",
          "This is my story, this is my song,",
          "Praising my Savior all the day long.",
          "",
          "Perfect submission, perfect delight,",
          "Visions of rapture now burst on my sight;",
          "Angels descending, bring from above",
          "Echoes of mercy, whispers of love.",
          "",
          "This is my story, this is my song,",
          "Praising my Savior all the day long;",
          "This is my story, this is my song,",
          "Praising my Savior all the day long.",
        ],
        audioUrl: "/audio/blessed-assurance.mp3",
        thumbnailUrl: "/images/blessed-assurance-thumb.jpg",
        category: "Traditional Hymn",
        duration: 220,
      },
      {
        id: "great-is-thy-faithfulness",
        title: "Great Is Thy Faithfulness",
        composer: "Thomas Chisholm",
        year: 1923,
        lyrics: [
          "Great is Thy faithfulness, O God my Father,",
          "There is no shadow of turning with Thee;",
          "Thou changest not, Thy compassions, they fail not",
          "As Thou hast been Thou forever wilt be.",
          "",
          "Great is Thy faithfulness! Great is Thy faithfulness!",
          "Morning by morning new mercies I see;",
          "All I have needed Thy hand hath provided—",
          "Great is Thy faithfulness, Lord, unto me!",
          "",
          "Summer and winter, and springtime and harvest,",
          "Sun, moon and stars in their courses above,",
          "Join with all nature in manifold witness",
          "To Thy great faithfulness, mercy and love.",
          "",
          "Great is Thy faithfulness! Great is Thy faithfulness!",
          "Morning by morning new mercies I see;",
          "All I have needed Thy hand hath provided—",
          "Great is Thy faithfulness, Lord, unto me!",
        ],
        audioUrl: "/audio/great-is-thy-faithfulness.mp3",
        thumbnailUrl: "/images/great-is-thy-faithfulness-thumb.jpg",
        category: "Traditional Hymn",
        duration: 260,
      },
      {
        id: "it-is-well",
        title: "It Is Well With My Soul",
        composer: "Horatio Spafford",
        year: 1873,
        lyrics: [
          "When peace like a river attendeth my way,",
          "When sorrows like sea billows roll;",
          "Whatever my lot, Thou hast taught me to say,",
          "It is well, it is well with my soul.",
          "",
          "It is well with my soul,",
          "It is well, it is well with my soul.",
          "",
          "Though Satan should buffet, though trials should come,",
          "Let this blest assurance control,",
          "That Christ hath regarded my helpless estate,",
          "And hath shed His own blood for my soul.",
          "",
          "It is well with my soul,",
          "It is well, it is well with my soul.",
        ],
        audioUrl: "/audio/it-is-well.mp3",
        thumbnailUrl: "/images/it-is-well-thumb.jpg",
        category: "Traditional Hymn",
        duration: 200,
      },
      {
        id: "nearer-my-god",
        title: "Nearer, My God, to Thee",
        composer: "Sarah Adams",
        year: 1841,
        lyrics: [
          "Nearer, my God, to Thee, nearer to Thee!",
          "E'en though it be a cross that raiseth me,",
          "Still all my song shall be, nearer, my God, to Thee.",
          "Nearer, my God, to Thee, nearer to Thee!",
          "",
          "Though like the wanderer, the sun gone down,",
          "Darkness be over me, my rest a stone;",
          "Yet in my dreams I'd be nearer, my God, to Thee.",
          "Nearer, my God, to Thee, nearer to Thee!",
          "",
          "There let the way appear, steps unto heaven;",
          "All that Thou sendest me, in mercy given;",
          "Angels to beckon me nearer, my God, to Thee.",
          "Nearer, my God, to Thee, nearer to Thee!",
        ],
        audioUrl: "/audio/nearer-my-god.mp3",
        thumbnailUrl: "/images/nearer-my-god-thumb.jpg",
        category: "Traditional Hymn",
        duration: 180,
      },
    ];

    setHymns(traditionalHymns);
    setLoading(false);
  };

  const handlePlayHymn = async (hymn: Hymn) => {
    try {
      if (currentPlayingId === hymn.id && isPlaying) {
        // Pause if currently playing
        await hymnAudioService.pauseHymn();
        setIsPlaying(false);
      } else if (currentPlayingId === hymn.id && !isPlaying) {
        // Resume if paused
        await hymnAudioService.resumeHymn();
        setIsPlaying(true);
      } else {
        // Play new hymn
        setCurrentPlayingId(hymn.id);
        setIsPlaying(true);

        await hymnAudioService.playHymn({
          id: hymn.id,
          title: hymn.title,
          audioUrl: hymn.audioUrl || "",
          duration: hymn.duration,
        });
      }
    } catch (error) {
      console.error("Error playing hymn:", error);
      Alert.alert(
        "Playback Error",
        "Unable to play this hymn. The audio file may not be available yet.",
        [{ text: "OK" }]
      );
    }
  };

  const showLyrics = (hymn: Hymn) => {
    Alert.alert(hymn.title, hymn.lyrics.join("\n"), [{ text: "Close" }]);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const renderHymnCard = ({ item }: { item: Hymn }) => (
    <TouchableOpacity
      style={styles.hymnCard}
      onPress={() => handlePlayHymn(item)}
    >
      <View style={styles.hymnThumbnailContainer}>
        <Image
          source={{
            uri: item.thumbnailUrl || "/images/default-hymn-thumb.jpg",
          }}
          style={styles.hymnThumbnail}
          defaultSource={require("../../assets/images/icon.png")}
        />
        <View style={styles.playOverlay}>
          <Ionicons
            name={currentPlayingId === item.id && isPlaying ? "pause" : "play"}
            size={32}
            color="#FFFFFF"
          />
        </View>
      </View>

      <View style={styles.hymnInfo}>
        <Text style={styles.hymnTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.hymnComposer} numberOfLines={1}>
          by {item.composer}
        </Text>
        <View style={styles.hymnMeta}>
          <View style={styles.yearBadge}>
            <Text style={styles.yearText}>{item.year}</Text>
          </View>
          <Text style={styles.durationText}>
            {formatDuration(item.duration)}
          </Text>
        </View>
        <View style={styles.publicDomainBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.publicDomainText}>Public Domain</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.lyricsButton}
          onPress={() => showLyrics(item)}
        >
          <Ionicons name="document-text" size={18} color="#256E63" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#256E63" />
        <Text style={styles.loadingText}>Loading traditional hymns...</Text>
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
        <Text style={styles.headerTitle}>Traditional Hymns</Text>
        <TouchableOpacity style={styles.infoButton}>
          <Ionicons name="information-circle" size={24} color="#256E63" />
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="shield-checkmark" size={20} color="#10B981" />
        <Text style={styles.infoText}>
          All hymns are in the public domain - free to use, share, and download
        </Text>
      </View>

      {/* Hymns List */}
      <FlatList
        data={hymns}
        renderItem={renderHymnCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.hymnsList}
        showsVerticalScrollIndicator={false}
      />
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
  infoButton: {
    padding: 8,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#D1FAE5",
  },
  infoText: {
    fontSize: 14,
    color: "#065F46",
    marginLeft: 8,
    flex: 1,
  },
  hymnsList: {
    padding: 20,
  },
  hymnCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  hymnThumbnailContainer: {
    position: "relative",
    marginRight: 16,
  },
  hymnThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  hymnInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  hymnTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  hymnComposer: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  hymnMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  yearBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
  },
  yearText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
  },
  durationText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  publicDomainBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  publicDomainText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "500",
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: "column",
    alignItems: "center",
  },
  lyricsButton: {
    padding: 8,
    marginBottom: 4,
  },
  moreButton: {
    padding: 8,
  },
});
