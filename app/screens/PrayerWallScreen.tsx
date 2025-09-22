import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AuthHeader from '../components/AuthHeader';

interface PrayerRequest {
  id: string;
  name: string;
  time: string;
  date: string;
  prayer: string;
  color: string;
  shape: 'rectangle' | 'circle' | 'scalloped';
}

export default function PrayerWallScreen() {
  const router = useRouter();

  const handleBackToCommunity = () => {
    router.push('/screens/CommunityScreen');
  };
  const prayerRequests: PrayerRequest[] = [
    {
      id: '1',
      name: '-ABIDEMI JOHN',
      time: '6am',
      date: 'Today',
      prayer: 'Prayer for my InJob Interview today. That I find favour in the sight of the empliyers',
      color: '#9370DB',
      shape: 'rectangle'
    },
    {
      id: '2',
      name: '-ABIDEMI JOHN',
      time: '6am',
      date: 'Yesterday',
      prayer: 'Prayer for my InJob Interview today. That I find favour in the sight of the empliyers',
      color: '#279CCA',
      shape: 'circle'
    },
    {
      id: '3',
      name: '-ABIDEMI JOHN',
      time: '6am',
      date: 'Yesterday',
      prayer: 'Prayer for my InJob Interview today. That I find favour in the sight of the empliyers',
      color: '#C8A2C8',
      shape: 'circle'
    },
    {
      id: '4',
      name: '-ABIDEMI JOHN',
      time: '6am',
      date: 'Today',
      prayer: 'Prayer for my InJob Interview today. That I find favour in the sight of the empliyers',
      color: '#FFD700',
      shape: 'rectangle'
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
      color: '#1E40AF',
      shape: 'rectangle'
    }
  ];

  const getCardStyle = (shape: string, color: string) => {
    const baseStyle = {
      backgroundColor: color,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      position: 'relative' as const,
    };

    switch (shape) {
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
          width: 160,
          height: 160,
          alignSelf: 'center' as const,
        };
      default: // rectangle
        return {
          ...baseStyle,
          borderRadius: 12,
          borderTopRightRadius: 30, // Curved top-right corner like the image
          width: '100%',
          minHeight: 120,
        };
    }
  };

  const renderFoldedCorner = (color: string) => (
    <View style={styles.foldedCorner}>
      <View style={[styles.foldedCornerInner, { backgroundColor: color }]} />
    </View>
  );

  const renderPrayerCard = (prayer: PrayerRequest, index: number) => (
    <View key={prayer.id} style={styles.cardContainer}>
      {index === 0 ? (
        <Image
          source={require('../../assets/images/Prayer note.png')}
          style={styles.fullCardImage}
          resizeMode="cover"
        />
      ) : (
        <TouchableOpacity
          style={getCardStyle(prayer.shape, prayer.color)}
          activeOpacity={0.8}
        >
          {renderFoldedCorner(prayer.color)}
          <Text style={styles.prayerName}>{prayer.name}</Text>
          <Text style={styles.prayerTime}>{prayer.time}, {prayer.date}</Text>
          <Text style={styles.prayerText}>{prayer.prayer}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <AuthHeader 
        title="Prayer Wall" 
        onBackPress={handleBackToCommunity}
        onCancelPress={handleBackToCommunity}
      />
      
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
        <TouchableOpacity style={styles.addButton} activeOpacity={0.7}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCFCFD',
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
    marginBottom: 8,
  },
  prayerName: {
    fontSize: 12,
    color: 'white',
    marginBottom: 4,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
  },
  prayerTime: {
    fontSize: 12,
    color: 'white',
    marginBottom: 8,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
  },
  prayerText: {
    fontSize: 14,
    color: 'white',
    lineHeight: 20,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
  },
  foldedCorner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: 18,
    borderTopColor: 'rgba(0, 0, 0, 0.2)',
    borderLeftWidth: 18,
    borderLeftColor: 'transparent',
    zIndex: 2,
  },
  foldedCornerInner: {
    position: 'absolute',
    top: -14,
    right: 1,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: 14,
    borderTopColor: 'rgba(255, 255, 255, 0.9)',
    borderLeftWidth: 14,
    borderLeftColor: 'transparent',
    zIndex: 3,
  },
  fullCardImage: {
    width: '100%',
    minHeight: 120,
    borderRadius: 12,
    borderTopRightRadius: 30, // Curved top-right corner to match the image
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
