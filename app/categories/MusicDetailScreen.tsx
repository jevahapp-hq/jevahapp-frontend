import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    ScrollView,
    Share,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import AuthHeader from '../components/AuthHeader';
import { useCommentModal } from '../context/CommentModalContext';
import { useInteractionStore } from '../store/useInteractionStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { convertToDownloadableItem, useDownloadHandler } from '../utils/downloadUtils';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MusicDetailProps {
  // Content data
  title: string;
  speaker: string;
  description?: string;
  audioUrl: string;
  imageUrl?: any;
  thumbnailUrl?: string;
  speakerAvatar?: any;
  views?: number;
  favorites?: number;
  shares?: number;
  comments?: number;
  saved?: number;
  timeAgo?: string;
  contentId?: string;
}

export default function MusicDetailScreen() {
  const params = useLocalSearchParams();
  const { showCommentModal } = useCommentModal();
  const { comments, userFavorites, globalFavoriteCounts } = useInteractionStore();
  const { handleDownload, checkIfDownloaded } = useDownloadHandler();
  const libraryStore = useLibraryStore();

  // Audio playback state
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Extract data from params
  const musicData: MusicDetailProps = {
    title: (params.title as string) || 'The Beatitudes: The Path to Blessings',
    speaker: (params.speaker as string) || 'Minister Joseph Eluwa',
    description: (params.description as string) || 'No description available',
    audioUrl: (params.audioUrl as string) || '',
    imageUrl: params.imageUrl ? { uri: params.imageUrl as string } : require('../../assets/images/image (12).png'),
    thumbnailUrl: params.thumbnailUrl as string,
    speakerAvatar: params.speakerAvatar ? { uri: params.speakerAvatar as string } : require('../../assets/images/Avatar-1.png'),
    views: parseInt(params.views as string) || 1200,
    favorites: parseInt(params.favorites as string) || 1200,
    shares: parseInt(params.shares as string) || 1200,
    comments: parseInt(params.comments as string) || 1200,
    saved: parseInt(params.saved as string) || 1200,
    timeAgo: (params.timeAgo as string) || '3HRS AGO',
    contentId: (params.contentId as string) || 'default-music-id',
  };

  const contentId = musicData.contentId || 'default-music-id';
  const isItemSaved = libraryStore.isItemSaved(contentId);

  // Audio playback functions
  const playAudio = async () => {
    if (!musicData.audioUrl) {
      Alert.alert('Error', 'Audio URL not available');
      return;
    }

    setIsLoading(true);
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: musicData.audioUrl },
          { shouldPlay: true }
        );
        
        setSound(newSound);
        setIsPlaying(true);

        // Set up status update listener
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setProgress(status.positionMillis || 0);
            setDuration(status.durationMillis || 0);
            setIsPlaying(status.isPlaying || false);
          }
        });
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      Alert.alert('Error', 'Failed to play audio');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMute = async () => {
    if (sound) {
      const newMuted = !isMuted;
      await sound.setIsMutedAsync(newMuted);
      setIsMuted(newMuted);
    }
  };

  const handleSeek = async (newProgress: number) => {
    if (sound && duration > 0) {
      const position = newProgress * duration;
      await sound.setPositionAsync(position);
      setProgress(position);
    }
  };

  // Interaction handlers
  const handleShare = async () => {
    try {
      await Share.share({
        title: musicData.title,
        message: `Check out this music: ${musicData.title}`,
        url: musicData.audioUrl,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleSave = async () => {
    try {
      if (!isItemSaved) {
        const libraryItem = {
          id: contentId,
          contentType: 'music',
          fileUrl: musicData.audioUrl,
          title: musicData.title,
          speaker: musicData.speaker,
          createdAt: new Date().toISOString(),
          speakerAvatar: musicData.speakerAvatar,
          views: musicData.views || 0,
          sheared: musicData.shares || 0,
          favorite: musicData.favorites || 0,
          saved: 1,
          imageUrl: musicData.imageUrl,
          thumbnailUrl: musicData.thumbnailUrl || musicData.audioUrl,
        };

        await libraryStore.addToLibrary(libraryItem as any);
      } else {
        await libraryStore.removeFromLibrary(contentId);
      }
    } catch (error) {
      console.error('Save operation failed:', error);
    }
  };

  const handleFavorite = () => {
    // This would integrate with your global interaction store
    console.log('Toggle favorite for:', contentId);
  };

  const handleComment = () => {
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

  const handleDownloadPress = async () => {
    try {
      const downloadableItem = convertToDownloadableItem(musicData, 'audio');
      const result = await handleDownload(downloadableItem);
      
      if (result.success) {
        Alert.alert('Success', 'Download started');
      } else {
        Alert.alert('Info', result.message);
      }
    } catch (error) {
      console.error('Download failed:', error);
      Alert.alert('Error', 'Download failed');
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const formatTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Fullscreen view
  if (isFullscreen) {
    return (
      <View className="flex-1 bg-black">
        {/* Fullscreen Header */}
        <View className="absolute top-0 left-0 right-0 z-50 bg-black/50">
          <View className="flex-row items-center justify-between px-4 py-3 pt-12">
            <TouchableOpacity 
              onPress={toggleFullscreen}
              className="w-10 h-10 items-center justify-center rounded-full bg-black/50"
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-lg font-rubik-semibold">
              {musicData.title}
            </Text>
            <View className="w-10" />
          </View>
        </View>

        {/* Fullscreen Content */}
        <View className="flex-1 justify-center items-center">
          <Image
            source={musicData.imageUrl}
            className="w-full h-full"
            resizeMode="cover"
          />
          
          {/* Play/Pause Overlay */}
          <View className="absolute inset-0 justify-center items-center">
            <TouchableOpacity
              onPress={playAudio}
              disabled={isLoading}
              className="bg-white/70 p-6 rounded-full"
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={60}
                color="#FEA74E"
              />
            </TouchableOpacity>
          </View>

          {/* Audio Controls */}
          <View className="absolute bottom-20 left-4 right-4 flex-row items-center gap-4">
            <TouchableOpacity onPress={playAudio} disabled={isLoading}>
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={32}
                color="#FEA74E"
              />
            </TouchableOpacity>

            {/* Progress Bar */}
            <View className="flex-1 h-2 bg-white/30 rounded-full relative">
              <TouchableOpacity
                className="absolute inset-0"
                onPress={(e) => {
                  const { locationX } = e.nativeEvent;
                  const newProgress = locationX / (screenWidth - 120);
                  handleSeek(Math.max(0, Math.min(1, newProgress)));
                }}
              >
                <View
                  className="h-full bg-[#FEA74E] rounded-full"
                  style={{ width: `${(progress / duration) * 100}%` }}
                />
                <View
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-[#FEA74E] rounded-full"
                  style={{
                    left: `${(progress / duration) * 100}%`,
                    marginLeft: -8,
                  }}
                />
              </TouchableOpacity>
            </View>

            {/* Mute Button */}
            <TouchableOpacity onPress={toggleMute}>
              <Ionicons
                name={isMuted ? "volume-mute" : "volume-high"}
                size={28}
                color="#FEA74E"
              />
            </TouchableOpacity>
          </View>

          {/* Content Info Overlay */}
          <View className="absolute bottom-4 left-4 right-4">
            <View className="bg-black/70 rounded-lg p-4">
              <Text className="text-white text-lg font-rubik-bold mb-2">
                {musicData.title}
              </Text>
              <Text className="text-white/80 text-sm font-rubik">
                {musicData.speaker}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <AuthHeader 
        title="Detail" 
        showBack={true}
        showCancel={true}
        onBackPress={() => router.back()}
        onCancelPress={() => router.back()}
      />
      
      <View className="flex-1">
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Video Player Section */}
          <View className="w-full h-[393px] relative bg-black">
            <Image
              source={musicData.imageUrl}
              className="w-full h-full"
              resizeMode="cover"
            />
            
            {/* Play/Pause Overlay */}
            <View className="absolute inset-0 justify-center items-center">
              <TouchableOpacity
                onPress={playAudio}
                disabled={isLoading}
                className="bg-white/70 p-4 rounded-full"
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={40}
                  color="#FEA74E"
                />
              </TouchableOpacity>
            </View>

            {/* Audio Controls */}
            <View className="absolute bottom-4 left-4 right-4 flex-row items-center gap-3">
              <TouchableOpacity onPress={playAudio} disabled={isLoading}>
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={24}
                  color="#FEA74E"
                />
              </TouchableOpacity>

              {/* Progress Bar */}
              <View className="flex-1 h-1 bg-white/30 rounded-full relative">
                <TouchableOpacity
                  className="absolute inset-0"
                  onPress={(e) => {
                    const { locationX } = e.nativeEvent;
                    const newProgress = locationX / (screenWidth - 120);
                    handleSeek(Math.max(0, Math.min(1, newProgress)));
                  }}
                >
                  <View
                    className="h-full bg-[#FEA74E] rounded-full"
                    style={{ width: `${(progress / duration) * 100}%` }}
                  />
                  <View
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-[#FEA74E] rounded-full"
                    style={{
                      left: `${(progress / duration) * 100}%`,
                      marginLeft: -6,
                    }}
                  />
                </TouchableOpacity>
              </View>

              {/* Mute Button */}
              <TouchableOpacity onPress={toggleMute}>
                <Ionicons
                  name={isMuted ? "volume-mute" : "volume-high"}
                  size={20}
                  color="#FEA74E"
                />
              </TouchableOpacity>

            {/* Fullscreen Button */}
            <TouchableOpacity onPress={toggleFullscreen}>
              <Ionicons name="expand" size={20} color="#FEA74E" />
            </TouchableOpacity>
            </View>
          </View>

          {/* Content Section */}
          <View className="px-4 py-4 pb-24">
            {/* Author Info */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative">
                  <Image
                    source={musicData.speakerAvatar}
                    style={{ width: 30, height: 30, borderRadius: 999 }}
                    resizeMode="cover"
                  />
                </View>
                <View className="ml-3">
                  <Text className="text-[16px] font-rubik-semibold text-[#344054]">
                    {musicData.speaker}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <TouchableOpacity 
                      onPress={() => {
                        // Views are automatically tracked when audio is played
                        console.log('Views:', musicData.views);
                      }}
                      className="flex-row items-center"
                    >
                      <MaterialIcons name="visibility" size={28} color="#98A2B3" />
                      <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                        {musicData.views}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={handleShare}
                      className="flex-row items-center ml-3"
                    >
                      <Feather name="send" size={28} color="#98A2B3" />
                      <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                        {musicData.shares}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={handleSave}
                      className="flex-row items-center ml-3"
                    >
                      <MaterialIcons
                        name={isItemSaved ? "bookmark" : "bookmark-border"}
                        size={28}
                        color={isItemSaved ? "#FEA74E" : "#98A2B3"}
                      />
                      <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                        {musicData.saved}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={handleFavorite}
                      className="flex-row items-center ml-3"
                    >
                      <MaterialIcons
                        name="favorite-border"
                        size={28}
                        color="#98A2B3"
                      />
                      <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                        {musicData.favorites}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Options',
                    'Choose an action',
                    [
                      { text: 'View Details', onPress: () => console.log('View Details') },
                      { text: 'Share', onPress: handleShare },
                      { text: isItemSaved ? 'Remove from Library' : 'Save to Library', onPress: handleSave },
                      { text: 'Download', onPress: handleDownloadPress },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                }}
              >
                <Ionicons name="ellipsis-vertical" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Title */}
            <Text className="text-[20px] font-rubik-bold text-[#344054] mb-4">
              {musicData.title}
            </Text>

            {/* Author Info (Repeated) */}
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative">
                <Image
                  source={musicData.speakerAvatar}
                  style={{ width: 30, height: 30, borderRadius: 999 }}
                  resizeMode="cover"
                />
              </View>
              <Text className="text-[14px] font-rubik-semibold text-[#344054] ml-3">
                {musicData.speaker}
              </Text>
            </View>

            {/* Description */}
            <Text className="text-[14px] font-rubik text-[#667085] leading-6 mb-6">
              {musicData.description}
            </Text>
          </View>
        </ScrollView>

        {/* Fixed Bottom Interaction Buttons */}
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100">
          <View className="flex-row items-center justify-around py-4 px-4 pb-6">
            <TouchableOpacity 
              className="items-center"
              onPress={handleDownloadPress}
            >
              <Ionicons 
                name={checkIfDownloaded(musicData.audioUrl) ? "checkmark-circle" : "download-outline"} 
                size={28} 
                color={checkIfDownloaded(musicData.audioUrl) ? "#256E63" : "#98A2B3"} 
              />
              <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                {musicData.views}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              className="items-center"
              onPress={() => {
                // Views are automatically tracked when audio is played
                console.log('Views:', musicData.views);
              }}
            >
              <MaterialIcons name="visibility" size={28} color="#98A2B3" />
              <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                {musicData.views}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              className="items-center"
              onPress={handleShare}
            >
              <Feather name="send" size={28} color="#98A2B3" />
              <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                {musicData.shares}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              className="items-center"
              onPress={handleComment}
            >
              <Ionicons name="chatbubble-outline" size={28} color="#98A2B3" />
              <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                {musicData.comments}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              className="items-center"
              onPress={handleSave}
            >
              <MaterialIcons
                name={isItemSaved ? "bookmark" : "bookmark-border"}
                size={28}
                color={isItemSaved ? "#FEA74E" : "#98A2B3"}
              />
              <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                {musicData.saved}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
