import { useAuth, useOAuth, useUser } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import '../global.css';
import AnimatedLogoIntro from './components/AnimatedLogoIntro';
import { authUtils } from './utils/authUtils';

import { getApiBaseUrl } from './utils/apiConfig';

const API_BASE_URL = getApiBaseUrl();

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    image: require('../assets/images/Rectangle (2).png'),
    title: 'Your Daily Spiritual Companion',
    description:
      'Join a global community of believers. Access sermons, music, books, and more—all in one place.',
  },
  {
    id: '2',
    image: require('../assets/images/Rectangle2.png'),
    title: 'Unify Your Worship in One Place',
    description:
      'Stream gospel music, sermons, and access Christian books, no more switching apps!',
  },
  {
    id: '3',
    image: require('../assets/images/Rectangle3.png'),
    title: 'Grow Together in Faith',
    description:
      'Join discussion groups, share prayer requests, and connect with believers who share your values.',
  },
  {
    id: '4',
    image: require('../assets/images/Rectangle1.png'),
    title: 'Faith for the whole family',
    description:
      'Bible animations for kids, deep theology studies for adults, We’ve got you all covered',
  },
];

export default function Welcome() {
  const flatListRef = useRef<FlatList<any>>(null);
  const currentIndexRef = useRef(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  const { isSignedIn, isLoaded: authLoaded, signOut, getToken } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const { startOAuthFlow: startGoogleAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startFacebookAuth } = useOAuth({ strategy: 'oauth_facebook' });
  const { startOAuthFlow: startAppleAuth } = useOAuth({ strategy: 'oauth_apple' });

  useEffect(() => {
    if (showIntro) return;
    const interval = setInterval(() => {
      if (slides.length === 0) return;
      let nextIndex = currentIndexRef.current + 1;
      if (nextIndex >= slides.length) nextIndex = 0;
      try {
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        currentIndexRef.current = nextIndex;
        setCurrentIndex(nextIndex);
      } catch (error) {
        console.warn('Error scrolling to index:', error);
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [showIntro, slides.length]);

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffset = event?.nativeEvent?.contentOffset;
    if (contentOffset && typeof contentOffset.x === 'number') {
      const index = Math.round(contentOffset.x / width);
      currentIndexRef.current = index;
      setCurrentIndex(index);
    }
  };

  const Pagination = () => (
    <View className="flex-row justify-center items-center mt-4">
      {slides.map((_, i) => (
        <View
          key={i}
          className={`w-[20px] h-[6px] rounded-full mx-1.5 ${
            i === currentIndex ? 'bg-[#C2C1FE]' : 'bg-[#EAECF0]'
          }`}
        />
      ))}
    </View>
  );

  const renderItem = ({ item }: { item: (typeof slides)[0] }) => (
    <View className="items-center justify-start" style={{ width }}>
      <Image source={item.image} className="w-full h-[340px]" resizeMode="cover" />
      <View className="bg-white rounded-t-3xl mt-[-19px] items-center w-full px-4 py-4">
        <View className="w-[36px] h-[4px] bg-gray-300 self-center rounded-full mb-6 mt-0" />
        <Text className="text-[#1D2939] text-[30px] font-bold text-center">{item.title}</Text>
        <Text className="text-[#344054] text-[14px] text-center mt-2 w-full">{item.description}</Text>
        <Pagination />
      </View>
    </View>
  );

  const handleIntroFinished = useCallback(() => setShowIntro(false), []);

  const handleSignIn = async (authFn: () => Promise<any>, provider: 'google' | 'facebook' | 'apple') => {
    if (!authLoaded || !userLoaded) {
      console.log('Waiting for auth or user to load', { authLoaded, userLoaded });
      return;
    }

    try {
      setLoading(true);
      console.log('🔐 Starting authentication flow for:', provider);

      // Debug authentication setup
      await authUtils.debugAuthSetup();

      // Test backend connectivity first
      console.log('🔍 Testing backend connectivity...');
      const backendAvailable = await authUtils.testBackendConnection();
      if (!backendAvailable) {
        throw new Error('Backend server is not accessible. Please check your connection.');
      }
      console.log('✅ Backend is accessible');

      // Test minimal auth request to identify backend issues
      console.log('🧪 Testing minimal auth request...');
      const testResult = await authUtils.testMinimalAuthRequest();
      console.log('🧪 Minimal auth test result:', testResult);

      if (isSignedIn) {
        console.log('🔄 Signing out existing session...');
        await signOut();
        let retries = 0;
        const maxRetries = 10;
        while (retries < maxRetries && isSignedIn) {
          await new Promise(resolve => setTimeout(resolve, 300));
          retries++;
          console.log(`⏳ Sign out retry ${retries}/${maxRetries}`, { isSignedIn });
        }
        if (isSignedIn) console.warn('⚠️ Still signed in after signOut attempts');
      }

      console.log('🚀 Starting OAuth flow for', provider);
      const { createdSessionId, setActive } = await authFn();
      if (!createdSessionId || !setActive) {
        throw new Error('OAuth flow failed: No session ID or setActive function');
      }

      console.log('✅ OAuth flow completed, setting active session...');
      await setActive({ session: createdSessionId });

      // Wait for user data to be available
      console.log('⏳ Waiting for user data to be available...');
      const currentUser = await authUtils.waitForUserData(user);
      console.log('✅ User data received:', {
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.primaryEmailAddress?.emailAddress,
        hasImage: !!currentUser.imageUrl
      });

      const token = await getToken();
      if (!token) throw new Error('Failed to retrieve Clerk token');
      console.log('✅ Clerk token retrieved:', token.substring(0, 20) + '...');

      // Prepare user info for backend
      const userInfo = {
        firstName: currentUser.firstName || 'Unknown',
        lastName: currentUser.lastName || 'User',
        avatar: currentUser.imageUrl || '',
        email: currentUser.primaryEmailAddress?.emailAddress || '',
      };

      console.log('📤 Sending user info to backend:', userInfo);

      // Send authentication request to backend
      const result = await authUtils.sendAuthRequest(token, userInfo);

      // Store authentication data
      console.log('💾 Storing authentication data...');
      await authUtils.storeAuthData(result, userInfo);

      console.log('🎉 Authentication completed successfully!');
      router.replace('/categories/HomeScreen');
    } catch (error) {
      console.error('❌ Authentication error:', error);
      authUtils.handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  if (showIntro) {
    return <AnimatedLogoIntro onFinished={handleIntroFinished} backgroundColor="#0A332D" scale={1} letterStaggerMs={100} />;
  }

  return (
    <View className="w-full h-full bg-white">
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
      />
      <View className="absolute top-[500px] left-0 right-0 items-center w-full px-4">
        <Text className="text-[#344054] text-[12px] font-rubik-bold text-center mt-6">
          GET STARTED WITH
        </Text>
        <View className="flex-row mt-12 gap-[16px]">
          <TouchableOpacity 
            onPress={() => handleSignIn(startFacebookAuth, 'facebook')}
            activeOpacity={0.7}
            style={{ minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}
          >
            <Image
              source={require('../assets/images/Faceboook.png')}
              className="w-12 h-12"
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => handleSignIn(startGoogleAuth, 'google')}
            activeOpacity={0.7}
            style={{ minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}
          >
            <Image
              source={require('../assets/images/Gooogle.png')}
              className="w-12 h-12"
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => handleSignIn(startAppleAuth, 'apple')}
            activeOpacity={0.7}
            style={{ minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}
          >
            <Image
              source={require('../assets/images/Apple.png')}
              className="w-12 h-12"
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center mt-9 justify-center w-[90%] max-w-[361px]">
          <Image
            source={require('../assets/images/Rectangle.png')}
            className="h-[1px] w-[30%]"
            resizeMode="contain"
          />
          <Text className="text-[#101828] font-bold text-[10px]">OR</Text>
          <Image
            source={require('../assets/images/Rectangle (1).png')}
            className="h-[1px] w-[30%]"
            resizeMode="contain"
          />
        </View>
        <TouchableOpacity
          onPress={() => router.push('/auth/signup')}
          activeOpacity={0.8}
          style={{
            width: '90%',
            maxWidth: 400,
            height: 44,
            borderRadius: 22,
            backgroundColor: '#090E24',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 36
          }}
        >
          <Text className="text-white font-semibold">Get Started with Email</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => router.push('/auth/login')} 
          activeOpacity={0.7}
          style={{ marginTop: 36, padding: 8 }}
        >
          <Text className="font-rubik-bold text-[#344054]">Sign In</Text>
        </TouchableOpacity>
        {loading && <ActivityIndicator className="mt-4" color="#090E24" />}
      </View>
    </View>
  );
}