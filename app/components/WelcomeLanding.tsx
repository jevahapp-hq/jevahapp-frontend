/**
 * First-run welcome / OAuth landing — loaded only when returning-user
 * redirect does not apply (keeps cold start lean).
 */
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import OptimizedImage from "../../src/shared/components/OptimizedImage";
import AnimatedLogoIntro from "./AnimatedLogoIntro";
import { useFastLogin } from "../hooks/useFastLogin";

const slides = [
  {
    id: "1",
    image: require("../../assets/images/Rectangle (2).png"),
    title: "Your Daily Spiritual Companion",
    description:
      "Join a global community of believers. Access sermons, music, books, and more—all in one place.",
  },
  {
    id: "2",
    image: require("../../assets/images/Rectangle2.png"),
    title: "Unify Your Worship in One Place",
    description:
      "Stream gospel music, sermons, and access Christian books, no more switching apps!",
  },
  {
    id: "3",
    image: require("../../assets/images/Rectangle3.png"),
    title: "Grow Together in Faith",
    description:
      "Join discussion groups, share prayer requests, and connect with believers who share your values.",
  },
  {
    id: "4",
    image: require("../../assets/images/Rectangle1.png"),
    title: "Faith for the whole family",
    description:
      "Bible animations for kids, deep theology studies for adults, We’ve got you all covered",
  },
];

type Props = {
  showIntro: boolean;
  onIntroFinished: () => void;
};

export default function WelcomeLanding({ showIntro, onIntroFinished }: Props) {
  const currentIndexRef = useRef(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isLoading: loginLoading, error: loginError, login } = useFastLogin();
  // 3-button nav on Itel/Transsion often reports a 0 inset while still covering the bottom.
  const bottomClearance =
    Math.max(insets.bottom, Platform.OS === "android" ? 48 : 0) + 12;
  const available = height - bottomClearance;
  const compact = available < 720;
  const heroHeight = Math.max(
    180,
    Math.min(compact ? 260 : 340, Math.round(available * (compact ? 0.34 : 0.42)))
  );

  useEffect(() => {
    if (showIntro) return;
    const interval = setInterval(() => {
      let nextIndex = currentIndexRef.current + 1;
      if (nextIndex >= slides.length) nextIndex = 0;
      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
    }, 7000);
    return () => clearInterval(interval);
  }, [showIntro]);

  const handleSignIn = useCallback(
    (provider: "google" | "facebook" | "apple") => {
      login(provider);
    },
    [login]
  );

  if (showIntro) {
    return (
      <AnimatedLogoIntro
        onFinished={onIntroFinished}
        backgroundColor="#0A332D"
        scale={1}
        letterStaggerMs={100}
      />
    );
  }

  const currentSlide = slides[currentIndex] || slides[0];

  return (
    <View
      style={{
        flex: 1,
        width,
        minHeight: height,
        backgroundColor: "#FFFFFF",
      }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: bottomClearance,
        }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={{ width: "100%", height: heroHeight }}>
          <OptimizedImage
            source={currentSlide.image}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            lazy={false}
          />
        </View>
        <View
          className="bg-white rounded-t-3xl items-center w-full px-6"
          style={{
            flexGrow: 1,
            marginTop: -19,
            paddingTop: compact ? 16 : 24,
            paddingBottom: 8,
          }}
        >
          <View className="w-[36px] h-[4px] bg-gray-300 self-center rounded-full mt-0" />
          <View
            className="px-4 justify-center"
            style={{ minHeight: compact ? 88 : 108, marginTop: compact ? 12 : 20 }}
          >
            <Text
              className="text-[#1D2939] font-jakarta-bold text-center mb-3"
              style={{ fontSize: compact ? 22 : 26, lineHeight: compact ? 28 : 32 }}
            >
              {currentSlide.title}
            </Text>
            <Text className="text-[#344054] text-[14px] font-jakarta text-center leading-5 max-w-[280px] mx-auto">
              {currentSlide.description}
            </Text>
          </View>
          <View
            className="flex-row justify-center items-center"
            style={{ marginTop: compact ? 12 : 20 }}
          >
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

          <View style={{ marginTop: compact ? 14 : 22 }}>
            <Text className="text-[#344054] text-[12px] font-jakarta-bold text-center">
              GET STARTED WITH
            </Text>
          </View>

          <View
            className="flex-row gap-[16px]"
            style={{ marginTop: compact ? 14 : 22 }}
          >
            <TouchableOpacity
              onPress={() => handleSignIn("facebook")}
              activeOpacity={0.7}
              style={{
                minWidth: 48,
                minHeight: 48,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <OptimizedImage
                source={require("../../assets/images/Faceboook.png")}
                style={{ width: 48, height: 48 }}
                contentFit="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleSignIn("google")}
              activeOpacity={0.7}
              style={{
                minWidth: 48,
                minHeight: 48,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <OptimizedImage
                source={require("../../assets/images/Gooogle.png")}
                style={{ width: 48, height: 48 }}
                contentFit="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleSignIn("apple")}
              activeOpacity={0.7}
              style={{
                minWidth: 48,
                minHeight: 48,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <OptimizedImage
                source={require("../../assets/images/Apple.png")}
                style={{ width: 48, height: 48 }}
                contentFit="contain"
              />
            </TouchableOpacity>
          </View>

          <View
            className="flex-row items-center justify-center w-[90%] max-w-[361px]"
            style={{ marginTop: compact ? 14 : 22 }}
          >
            <Image
              source={require("../../assets/images/Rectangle.png")}
              className="h-[1px] w-[30%]"
              resizeMode="contain"
            />
            <Text className="text-[#101828] font-jakarta-bold text-[10px]">OR</Text>
            <Image
              source={require("../../assets/images/Rectangle (1).png")}
              className="h-[1px] w-[30%]"
              resizeMode="contain"
            />
          </View>

          <TouchableOpacity
            onPress={() => router.push("/auth/signup")}
            activeOpacity={0.8}
            style={{
              width: "90%",
              maxWidth: 400,
              height: 48,
              borderRadius: 24,
              backgroundColor: "#090E24",
              justifyContent: "center",
              alignItems: "center",
              marginTop: compact ? 16 : 22,
            }}
          >
            <Text className="text-white font-jakarta-semibold">
              Get Started with Email
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/auth/login")}
            style={{ marginTop: compact ? 14 : 18, marginBottom: 4 }}
          >
            <Text className="text-[#344054] text-sm font-jakarta-medium">Sign In</Text>
          </TouchableOpacity>

          {loginLoading && (
            <ActivityIndicator className="mt-4" color="#090E24" />
          )}
          {loginError && (
            <Text className="text-red-500 text-center mt-2 px-4 font-jakarta">
              {loginError}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
