import BottomNav from '@/app/components/BottomNav';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import AccountScreen from '../screens/AccountScreen';
import CommunityScreen from '../screens/CommunityScreen';
import LibraryScreen from '../screens/library/LibraryScreen';
import HomeTabContent from './HomeTabContent';

const tabList = ['Home', 'Community', 'Library', 'Account'];

export default function HomeScreen() {
  const [selectedTab, setSelectedTab] = useState('Home');
  const { default: defaultTabParamRaw } = useLocalSearchParams();
  const defaultTabParam = Array.isArray(defaultTabParamRaw)
    ? defaultTabParamRaw[0]
    : defaultTabParamRaw;

  function handleTabChange(tab: string) {
    setSelectedTab(tab);
  }

  useEffect(() => {
    if (defaultTabParam && tabList.includes(defaultTabParam)) {
      handleTabChange(defaultTabParam);
    }
  }, [defaultTabParam]);

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'Home':
        return <HomeTabContent />;
      case 'Community':
        return <CommunityScreen />;
      case 'Library':
        return <LibraryScreen />;
      case 'Account':
        return <AccountScreen />;
      default:
        return <HomeTabContent />;
    }
  };

  return (
    <View style={{ flex: 1 }} className="w-full">
      {renderTabContent()}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          backgroundColor: '#fff',
        }}
      >
        <BottomNav selectedTab={selectedTab} setSelectedTab={handleTabChange} />
      </View>
    </View>
  );
}