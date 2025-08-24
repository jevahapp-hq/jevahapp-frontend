import { BlurView } from 'expo-blur';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    Platform,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    getGridConfig,
    getResponsiveFontSize
} from '../../utils/responsive';

interface UploadMediaGridProps {
  onSelect: (video: MediaLibrary.Asset) => void;
}

export default function UploadMediaGrid({ onSelect }: UploadMediaGridProps) {
  const [videos, setVideos] = useState<MediaLibrary.Asset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [gridConfig, setGridConfig] = useState(getGridConfig({ small: 2, medium: 3, large: 4 }));

  // Update grid config when screen dimensions change
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setGridConfig(getGridConfig({ small: 2, medium: 3, large: 4 }));
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return;
      setHasPermission(true);

      const result = await MediaLibrary.getAssetsAsync({
        mediaType: 'video',
        sortBy: MediaLibrary.SortBy.creationTime,
        first: 50, // Increased for better grid coverage
      });
      setVideos(result.assets);
    })();
  }, []);

  const handleSelect = (video: MediaLibrary.Asset) => {
    setSelectedId(video.id);
    onSelect(video);
  };

  const formatDuration = (duration: number) => {
    const min = Math.floor(duration / 60);
    const sec = Math.floor(duration % 60)
      .toString()
      .padStart(2, '0');
    return `${min}:${sec}`;
  };

  const getFontSize = () => {
    return getResponsiveFontSize(8, 9, 10);
  };

  const renderItem = ({ item }: { item: MediaLibrary.Asset }) => {
    const isSelected = selectedId === item.id;

    return (
      <TouchableOpacity
        className="relative"
        style={{ 
          width: gridConfig.itemSize, 
          height: gridConfig.itemSize,
          margin: gridConfig.spacing / 2,
        }}
        onPress={() => handleSelect(item)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.uri }}
          className="w-full h-full rounded-lg"
          resizeMode="cover"
        />
        {!isSelected && (
          <BlurView
            intensity={50}
            tint="dark"
            className="absolute top-0 bottom-0 left-0 right-0 rounded-lg"
          />
        )}
        <Text 
          className="absolute bottom-1 right-1 text-white bg-black/50 px-1 rounded"
          style={{ fontSize: getFontSize() }}
        >
          {formatDuration(item.duration)}
        </Text>
        
        {/* Selection indicator */}
        {isSelected && (
          <View className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full items-center justify-center">
            <Text className="text-white text-xs font-bold">✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!hasPermission) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <View className="bg-white p-6 rounded-lg shadow-sm">
          <Text className="text-gray-800 text-center font-medium">
            Camera permission required
          </Text>
          <Text className="text-gray-600 text-center text-sm mt-2">
            Please allow access to your media library to select videos
          </Text>
        </View>
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <View className="bg-white p-6 rounded-lg shadow-sm">
          <Text className="text-gray-800 text-center font-medium">
            No videos found
          </Text>
          <Text className="text-gray-600 text-center text-sm mt-2">
            Your device doesn't have any videos in the media library
          </Text>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={videos}
      numColumns={gridConfig.numColumns}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={{ 
        padding: gridConfig.padding,
        paddingBottom: Platform.OS === 'ios' ? 140 : 120,
      }}
      showsVerticalScrollIndicator={false}
      key={gridConfig.numColumns} // Force re-render when columns change
    />
  );
}
