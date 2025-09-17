import { useAuth, useOAuth, useUser } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import "../global.css";
import AnimatedLogoIntro from "./components/AnimatedLogoIntro";
import { useFastLogin } from "./hooks/useFastLogin";
import { useFastPerformance } from "./utils/fastPerformance";
// import { initializeWarningSuppression } from "./utils/warningSuppression";

const { width } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    image: require("../assets/images/Rectangle (2).png"),
    title: "Your Daily Spiritual Companion",
    description:
      "Join a global community of believers. Access sermons, music, books, and more—all in one place.",
  },
  {
    id: "2",
    image: require("../assets/images/Rectangle2.png"),
    title: "Unify Your Worship in One Place",
    description:
      "Stream gospel music, sermons, and access Christian books, no more switching apps!",
  },
  {
    id: "3",
    image: require("../assets/images/Rectangle3.png"),
    title: "Grow Together in Faith",
    description:
      "Join discussion groups, share prayer requests, and connect with believers who share your values.",
  },
  {
    id: "4",
    image: require("../assets/images/Rectangle1.png"),
    title: "Faith for the whole family",
    description:
      "Bible animations for kids, deep theology studies for adults, We’ve got you all covered",
  },
];

export default function Welcome() {
  // Initialize warning suppression (disabled to avoid errors)
  useEffect(() => {
    // Temporarily disabled to prevent "cannot read property undefined" errors
    // try {
    //   initializeWarningSuppression();
    // } catch (error) {
    //   console.warn("Failed to initialize warning suppression:", error);
    // }
  }, []);

  const flatListRef = useRef<FlatList<any> | null>(null);
  const currentIndexRef = useRef<number>(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  // Safely get Clerk hooks with error handling
  let isSignedIn = false;
  let authLoaded = false;
  let signOut: any = () => {};
  let getToken: any = () => {};
  let userLoaded = false;
  let user: any = null;
  let startGoogleAuth: any = () => {};
  // Facebook OAuth temporarily disabled
  // let startFacebookAuth: any = () => {};
  let startAppleAuth: any = () => {};

  try {
    const auth = useAuth();
    const userData = useUser();
    const googleOAuth = useOAuth({ strategy: "oauth_google" });
    // Facebook OAuth temporarily disabled
    // const facebookOAuth = useOAuth({ strategy: "oauth_facebook" });
    const appleOAuth = useOAuth({ strategy: "oauth_apple" });

    isSignedIn = auth.isSignedIn || false;
    authLoaded = auth.isLoaded || false;
    signOut = auth.signOut;
    getToken = auth.getToken;
    userLoaded = userData.isLoaded || false;
    user = userData.user;
    startGoogleAuth = googleOAuth.startOAuthFlow;
    startFacebookAuth = facebookOAuth.startOAuthFlow;
    startAppleAuth = appleOAuth.startOAuthFlow;
  } catch (error) {
    console.warn("Clerk hooks not available:", error);
  }

  useEffect(() => {
    if (showIntro) return;
    const interval = setInterval(() => {
      if (slides.length === 0) return;
      let nextIndex = currentIndexRef.current + 1;
      if (nextIndex >= slides.length) nextIndex = 0;
      try {
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        currentIndexRef.current = nextIndex;
        setCurrentIndex(nextIndex);
      } catch (error) {
        console.warn("Error scrolling to index:", error);
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [showIntro, slides.length]);

  const onMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const contentOffset = event?.nativeEvent?.contentOffset;
    if (contentOffset && typeof contentOffset.x === "number") {
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
            i === currentIndex ? "bg-[#C2C1FE]" : "bg-[#EAECF0]"
          }`}
        />
      ))}
    </View>
  );

  const renderItem = ({ item }: { item: (typeof slides)[0] }) => (
    <View className="items-center justify-start" style={{ width }}>
      <Image
        source={item.image}
        className="w-full h-[340px]"
        resizeMode="cover"
      />
      <View className="bg-white rounded-t-3xl mt-[-19px] items-center w-full px-4 py-4">
        <View className="w-[36px] h-[4px] bg-gray-300 self-center rounded-full mb-6 mt-0" />
        <Text className="text-[#1D2939] text-[30px] font-bold text-center">
          {item.title}
        </Text>
        <Text className="text-[#344054] text-[14px] text-center mt-2 w-full">
          {item.description}
        </Text>
        <Pagination />
      </View>
    </View>
  );

  const handleIntroFinished = useCallback(() => setShowIntro(false), []);

  const { isLoading: loginLoading, error: loginError, login } = useFastLogin();
  const { fastPress } = useFastPerformance();

  const handleSignIn = useCallback(
    (provider: "google" | "facebook" | "apple") => {
      login(provider);
    },
    [login]
  );

  if (showIntro) {
    return (
      <AnimatedLogoIntro
        onFinished={handleIntroFinished}
        backgroundColor="#0A332D"
        scale={1}
        letterStaggerMs={100}
      />
    );
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
            onPress={fastPress(() => handleSignIn("facebook"), {
              key: "facebook_login",
              priority: "high",
            })}
            activeOpacity={0.7}
            style={{
              minWidth: 48,
              minHeight: 48,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Image
              source={require("../assets/images/Faceboook.png")}
              className="w-12 h-12"
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={fastPress(() => handleSignIn("google"), {
              key: "google_login",
              priority: "high",
            })}
            activeOpacity={0.7}
            style={{
              minWidth: 48,
              minHeight: 48,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Image
              source={require("../assets/images/Gooogle.png")}
              className="w-12 h-12"
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={fastPress(() => handleSignIn("apple"), {
              key: "apple_login",
              priority: "high",
            })}
            activeOpacity={0.7}
            style={{
              minWidth: 48,
              minHeight: 48,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Image
              source={require("../assets/images/Apple.png")}
              className="w-12 h-12"
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center mt-9 justify-center w-[90%] max-w-[361px]">
          <Image
            source={require("../assets/images/Rectangle.png")}
            className="h-[1px] w-[30%]"
            resizeMode="contain"
          />
          <Text className="text-[#101828] font-bold text-[10px]">OR</Text>
          <Image
            source={require("../assets/images/Rectangle (1).png")}
            className="h-[1px] w-[30%]"
            resizeMode="contain"
          />
        </View>
        <TouchableOpacity
          onPress={fastPress(() => router.push("/auth/signup"), {
            key: "signup_button",
            priority: "high",
          })}
          activeOpacity={0.8}
          style={{
            width: "90%",
            maxWidth: 400,
            height: 44,
            borderRadius: 22,
            backgroundColor: "#090E24",
            justifyContent: "center",
            alignItems: "center",
            marginTop: 36,
          }}
        >
          <Text className="text-white font-semibold">
            Get Started with Email
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={fastPress(() => router.push("/auth/login"), {
            key: "login_button",
            priority: "high",
          })}
          activeOpacity={0.7}
          style={{ marginTop: 36, padding: 8 }}
        >
          <Text className="font-rubik-bold text-[#344054]">Sign In</Text>
        </TouchableOpacity>
        {loginLoading && <ActivityIndicator className="mt-4" color="#090E24" />}
        {loginError && (
          <Text className="text-red-500 text-center mt-2 px-4">
            {loginError}
          </Text>
        )}
      </View>
    </View>
  );
}
