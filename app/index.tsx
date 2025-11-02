import { useAuth, useOAuth, useUser } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import "../global.css";
import { mediaApi } from "../src/core/api/MediaApi";
import AnimatedLogoIntro from "./components/AnimatedLogoIntro";
import { useFastLogin } from "./hooks/useFastLogin";
import { useContentCacheStore } from "./store/useContentCacheStore";
import { useFastPerformance } from "./utils/fastPerformance";

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
  const currentIndexRef = useRef<number>(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  // Animation values for fade transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const textFadeAnim = useRef(new Animated.Value(1)).current;

  const { isSignedIn, isLoaded: authLoaded, signOut, getToken } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const { startOAuthFlow: startGoogleAuth } = useOAuth({
    strategy: "oauth_google",
  });
  const { startOAuthFlow: startFacebookAuth } = useOAuth({
    strategy: "oauth_facebook",
  });
  const { startOAuthFlow: startAppleAuth } = useOAuth({
    strategy: "oauth_apple",
  });

  useEffect(() => {
    if (showIntro) return;
    const interval = setInterval(() => {
      if (slides.length === 0) return;
      let nextIndex = currentIndexRef.current + 1;
      if (nextIndex >= slides.length) nextIndex = 0;

      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
    }, 3500);
    return () => clearInterval(interval);
  }, [showIntro, slides.length]);

  const Pagination = () => (
    <View className="flex-row justify-center items-center">
      {slides.map((_, i) => (
        <View
          key={i}
          className={`mx-1.5 ${
            i === currentIndex
              ? "w-[20px] h-[6px] rounded-full bg-[#FEA74E]"
              : "w-[6px] h-[6px] rounded-full bg-[#EAECF0]"
          }`}
        />
      ))}
    </View>
  );

  const currentSlide = slides[currentIndex] || slides[0];

  const handleIntroFinished = useCallback(() => setShowIntro(false), []);

  const { isLoading: loginLoading, error: loginError, login } = useFastLogin();
  const { fastPress } = useFastPerformance();

  // Warm-cache the first page of feeds while intro/landing shows
  useEffect(() => {
    let cancelled = false;
    const warm = async () => {
      try {
        // Prefetch ALL content (public) and default first page
        const [allResp, defResp] = await Promise.all([
          mediaApi.getAllContentPublic(),
          mediaApi.getDefaultContent({
            page: 1,
            limit: 10,
            contentType: "ALL" as any,
          }),
        ]);

        const store = useContentCacheStore.getState();
        if (allResp.success && Array.isArray(allResp.media) && !cancelled) {
          store.set("ALL:first", {
            items: allResp.media as any,
            page: 1,
            limit: allResp.limit || 10,
            total: allResp.total || 0,
            fetchedAt: Date.now(),
          });
        }
        if (defResp.success && Array.isArray(defResp.media) && !cancelled) {
          const key = "ALL:page:1";
          store.set(key, {
            items: defResp.media as any,
            page: 1,
            limit: defResp.limit || 10,
            total: defResp.total || 0,
            fetchedAt: Date.now(),
          });
        }
      } catch {}
    };
    warm();
    return () => {
      cancelled = true;
    };
  }, [showIntro]);

  const handleSignIn = useCallback(
    (provider: "google" | "facebook" | "apple") => {
      login(provider);
    },
    [login]
  );

  // Show loading while auth is initializing
  if (!authLoaded || !userLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#090E24" />
        <Text style={{ marginTop: 10, fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

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
      <View className="items-center justify-start" style={{ width }}>
        <View style={{ width: "100%", height: 340 }}>
          <Image
            source={currentSlide.image}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
        <View className="bg-white rounded-t-3xl mt-[-19px] items-center w-full px-6 py-6">
          <View className="w-[36px] h-[4px] bg-gray-300 self-center rounded-full mb-6 mt-0" />
          <View className="px-4 min-h-[120px] justify-center">
            <Text className="text-[#1D2939] text-[28px] font-bold text-center leading-8 mb-3">
              {currentSlide.title}
            </Text>
            <Text className="text-[#344054] text-[14px] text-center leading-5 max-w-[280px] mx-auto">
              {currentSlide.description}
            </Text>
          </View>
          <View className="mt-8">
            <Pagination />
          </View>

          {/* Fixed gap section */}
          <View className="mt-8">
            <Text className="text-[#344054] text-[12px] font-rubik-bold text-center">
              GET STARTED WITH
            </Text>
          </View>

          {/* Social login buttons */}
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

          {/* OR separator */}
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

          {/* Email signup button */}
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

          {/* Sign In button */}
          <TouchableOpacity
            onPress={fastPress(() => router.push("/auth/login"), {
              key: "signin_button",
              priority: "high",
            })}
            activeOpacity={0.8}
            style={{
              width: "90%",
              maxWidth: 400,
              height: 44,
              borderRadius: 22,
              backgroundColor: "transparent",
              justifyContent: "center",
              alignItems: "center",
              marginTop: 16,
            }}
          >
            <Text className="text-[#090E24] font-semibold">
              Sign In
            </Text>
          </TouchableOpacity>

          {/* Loading and error states */}
          {loginLoading && (
            <ActivityIndicator className="mt-4" color="#090E24" />
          )}
          {loginError && (
            <Text className="text-red-500 text-center mt-2 px-4">
              {loginError}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
