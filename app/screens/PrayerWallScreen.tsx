import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface PrayerRequest {
  id: string;
  name: string;
  time: string;
  date: string;
  prayer: string;
  color: string;
  shape: 'rectangle' | 'circle' | 'scalloped' | 'square' | 'square2' | 'square3' | 'square4';
}

export default function PrayerWallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;

  useEffect(() => {
    // Slide in animation from right to left
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleBackToCommunity = () => {
    // Slide out animation to the right
    Animated.timing(slideAnim, {
      toValue: Dimensions.get('window').width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      router.push('/screens/CommunityScreen');
    });
  };
  const initialRequests: PrayerRequest[] = [
    {
      id: '1',
      name: '-ABIDEMI JOHN',
      time: '6am',
      date: 'Today',
      prayer: 'Prayer for my InJob Interview today. That I find favour in the sight of the empliyers',
      color: '#A16CE5',
      shape: 'square'
    },
    {
      id: '2',
      name: '-ABIDEMI JOHN',
      time: '6am',
      date: 'Yesterday',
      prayer: 'Prayer for my InJob Interview today. That I find favour in the sight of the empliyers',
      color: '#1078B2',
      shape: 'square2'
    },
    {
      id: '3',
      name: '-ABIDEMI JOHN',
      time: '6am',
      date: 'Yesterday',
      prayer: 'Prayer for my InJob Interview today. That I find favour in the sight of the empliyers',
      color: '#6360DE',
      shape: 'square3'
    },
    {
      id: '4',
      name: '-ABIDEMI JOHN',
      time: '6am',
      date: 'Today',
      prayer: 'Prayer for my InJob Interview today. That I find favour in the sight of the empliyers',
      color: '#DFCC21',
      shape: 'square4'
    },
    {
      id: '5',
      name: '-ABIDEMI JOHN',
      time: '6am',
      date: 'Today',
      prayer: 'Prayer for my InJob Interview today. That I find favour in the sight of the empliyers',
      color: '#FF69B4',
      shape: 'scalloped'
    },
    {
      id: '6',
      name: '-ABIDEMI JOHN',
      time: '6am',
      date: 'Yesterday',
      prayer: 'Prayer for my InJob Interview today. That I find favour in the sight of the empliyers',
      color: '#1078B2',
      shape: 'square2'
    }
  ];

  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>(initialRequests);

  // If navigated back from PostAPrayer with a new post, append it once
  const pendingNewPrayer = useMemo(() => {
    const prayerText = typeof params.prayer === 'string' ? params.prayer : undefined;
    const color = typeof params.color === 'string' ? params.color : undefined;
    const shape = (typeof params.shape === 'string' ? params.shape : undefined) as PrayerRequest['shape'] | undefined;
    return prayerText && color && shape ? { prayerText, color, shape } : undefined;
  }, [params]);

  useEffect(() => {
    if (!pendingNewPrayer) return;
    const newItem: PrayerRequest = {
      id: String(Date.now()),
      name: '-ABIDEMI JOHN',
      time: '6am',
      date: 'Today',
      prayer: pendingNewPrayer.prayerText,
      color: pendingNewPrayer.color,
      shape: pendingNewPrayer.shape,
    };
    setPrayerRequests(prev => [newItem, ...prev]);
    // clear params by replacing route without params
    router.replace('/screens/PrayerWallScreen');
  }, [pendingNewPrayer]);

  const getCardStyle = (shape: string, color: string) => {
    const baseStyle = {
      backgroundColor: color,
      padding: 16,
      marginBottom: 12,
      justifyContent: 'center' as const,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      position: 'relative' as const,
    };

    switch (shape) {
      case 'square':
        return {
          ...baseStyle,
          width: 156,
          height: 156,
          alignSelf: 'center' as const,
          borderRadius: 12,
          overflow: 'hidden' as const,
        };
      case 'square2':
        return {
          ...baseStyle,
          width: 183,
          height: 183,
          alignSelf: 'center' as const,
          borderRadius: 91.5,
          overflow: 'hidden' as const,
        };
      case 'square3':
        return {
          ...baseStyle,
          width: 183,
          height: 183,
          alignSelf: 'center' as const,
          borderRadius: 91.5,
          overflow: 'hidden' as const,
        };
      case 'square4':
        return {
          ...baseStyle,
          width: 156,
          height: 156,
          alignSelf: 'center' as const,
          borderRadius: 12,
          overflow: 'hidden' as const,
        };
      case 'circle':
        return {
          ...baseStyle,
          borderRadius: 80,
          width: 160,
          height: 160,
          alignSelf: 'center' as const,
        };
      case 'scalloped':
        return {
          ...baseStyle,
          borderRadius: 20,
          width: 216,
          height: 216,
          alignSelf: 'center' as const,
          backgroundColor: 'transparent',
          padding: 0,
          justifyContent: 'flex-start' as const,
        };
      default: // rectangle
        return {
          ...baseStyle,
          borderRadius: 12,
          width: '100%' as const,
          minHeight: 120,
        };
    }
  };


  const renderScallopedCard = (prayer: PrayerRequest) => {
    const numBlobs = 13;
    const containerSize = 216;
    const center = containerSize / 2;
    const blobRadius = 22; // each scallop 'tooth'
    const ringRadius = center - blobRadius + 2; // pull slightly outward
    const blobs = Array.from({ length: numBlobs }).map((_, i) => {
      const angle = (2 * Math.PI * i) / numBlobs;
      const x = center + ringRadius * Math.cos(angle) - blobRadius;
      const y = center + ringRadius * Math.sin(angle) - blobRadius;
      return (
        <View
          key={`scallop-${i}`}
          style={[
            styles.scallopBlob,
            {
              left: x,
              top: y,
              width: blobRadius * 2,
              height: blobRadius * 2,
              borderRadius: blobRadius,
              backgroundColor: prayer.color,
            },
          ]}
        />
      );
    });

    return (
      <View style={styles.scallopContainer}>
        {blobs}
        <View style={[styles.scallopCenter, { backgroundColor: prayer.color }]}>
          <Text style={styles.prayerName}>{prayer.name}</Text>
          <Text style={styles.prayerTime}>{prayer.time}, {prayer.date}</Text>
          <Text style={styles.prayerText}>{prayer.prayer}</Text>
        </View>
      </View>
    );
  };

  const renderPrayerCard = (prayer: PrayerRequest, index: number) => (
    <View key={prayer.id} style={[styles.cardContainer, prayer.id === '6' ? styles.sixthCardOffset : undefined]}>
      <TouchableOpacity
        style={getCardStyle(prayer.shape, prayer.color)}
        activeOpacity={0.8}
      >
        {prayer.shape === 'scalloped' ? (
          renderScallopedCard(prayer)
        ) : (
          <>
            {prayer.shape === 'square' && (
              <View style={styles.diagonalCut}>
                <View style={styles.triangle} />
              </View>
            )}
            {prayer.shape === 'square2' && (
              <View style={styles.diagonalCut2}>
                <View style={styles.diagonalMask2} />
                <View style={styles.triangle2} />
              </View>
            )}
            {prayer.shape === 'square3' && (
              <View style={styles.diagonalCut3}>
                <View style={styles.diagonalMask3} />
                <View style={styles.triangle3} />
              </View>
            )}
            {prayer.shape === 'square4' && (
              <View style={styles.diagonalCut4}>
                <View style={styles.triangle4} />
              </View>
            )}
            <Text style={styles.prayerName}>{prayer.name}</Text>
            <Text style={styles.prayerTime}>{prayer.time}, {prayer.date}</Text>
            <Text style={styles.prayerText}>{prayer.prayer}</Text>
          </>
        )}
        </TouchableOpacity>
    </View>
  );

  return (
    <Animated.View style={[{ flex: 1 }, { transform: [{ translateX: slideAnim }] }]}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FCFCFD" }}>
        <StatusBar barStyle="dark-content" backgroundColor="#FCFCFD" />
        
        {/* Custom Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToCommunity} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prayer Wall</Text>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      
      {/* Search and Action Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            placeholder="search ,for prayers."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />
        </View>
        <TouchableOpacity style={styles.addButton} activeOpacity={0.7} onPress={() => router.push('/screens/PostAPrayer')}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Prayer Requests Section */}
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>This week</Text>
        
        <View style={styles.prayersGrid}>
          <View style={styles.leftColumn}>
            {prayerRequests.filter((_, index) => index % 2 === 0).map((prayer, index) => 
              renderPrayerCard(prayer, index * 2)
            )}
          </View>
          <View style={styles.rightColumn}>
            {prayerRequests.filter((_, index) => index % 2 === 1).map((prayer, index) => 
              renderPrayerCard(prayer, index * 2 + 1)
            )}
          </View>
        </View>
      </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCFCFD',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Rubik-Bold',
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    fontFamily: 'Rubik-Regular',
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: '#DF930E',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    fontFamily: 'Rubik-Bold',
  },
  prayersGrid: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flex: 1,
  },
  cardContainer: {
    marginBottom: 16,
  },
  sixthCardOffset: {
    marginLeft: 20,
  },
  prayerName: {
    fontSize: 10,
    color: 'white',
    marginBottom: 4,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
  },
  prayerTime: {
    fontSize: 10,
    color: 'white',
    marginBottom: 8,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
  },
  prayerText: {
    fontSize: 12,
    color: 'white',
    lineHeight: 16,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
  },
  diagonalCut: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 56,
    height: 56,
    backgroundColor: '#8B5DDD',
    zIndex: 1,
  },
  triangle: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: 56,
    borderTopColor: 'white',
    borderLeftWidth: 56,
    borderLeftColor: 'transparent',
  },
  diagonalCut2: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 91,
    height: 91,
    backgroundColor: '#0D608E',
    borderBottomLeftRadius: 91,
    zIndex: 1,
  },
  diagonalMask2: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: 91,
    borderTopColor: '#FCFCFD',
    borderLeftWidth: 91,
    borderLeftColor: 'transparent',
    zIndex: 1,
  },
  diagonalCut3: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 91,
    height: 91,
    backgroundColor: '#4F4DB2',
    borderBottomLeftRadius: 91,
    zIndex: 1,
  },
  diagonalMask3: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: 91,
    borderTopColor: '#FCFCFD',
    borderLeftWidth: 91,
    borderLeftColor: 'transparent',
    zIndex: 1,
  },
  triangle3: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: 56,
    borderTopColor: 'white',
    borderLeftWidth: 56,
    borderLeftColor: 'transparent',
    zIndex: 2,
  },
  diagonalCut4: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 56,
    height: 56,
    backgroundColor: '#B2A31A',
    zIndex: 1,
  },
  triangle4: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: 56,
    borderTopColor: 'white',
    borderLeftWidth: 56,
    borderLeftColor: 'transparent',
  },
  
  triangle2: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: 56,
    borderTopColor: 'white',
    borderLeftWidth: 56,
    borderLeftColor: 'transparent',
    zIndex: 2,
  },
  scallopContainer: {
    width: 216,
    height: 216,
    alignSelf: 'center',
    position: 'relative',
  },
  scallopBlob: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  scallopCenter: {
    position: 'absolute',
    left: 28,
    top: 28,
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: 12,
  },
});
