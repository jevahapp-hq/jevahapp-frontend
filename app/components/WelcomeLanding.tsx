/**
 * First-run welcome / OAuth landing — loaded only when returning-user
 * redirect does not apply (keeps cold start lean).
 */
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import OptimizedImage from "../../src/shared/components/OptimizedImage";
import AnimatedLogoIntro from "./AnimatedLogoIntro";
import { useFastLogin } from "../hooks/useFastLogin";
import { useFastPerformance } from "../utils/fastPerformance";

const { width } = Dimensions.get("window");

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
  const { isLoading: loginLoading, error: loginError, login } = useFastLogin();
  const { fastPress } = useFastPerformance();

  useEffect(() => {
    if (showIntro) return;
    const interval = setInterval(() => {
      let nextIndex = currentIndexRef.current + 1;
      if (nextIndex >= slides.length) nextIndex = 0;
      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
    }, 3500);
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
    <View className="w-full h-full bg-white">
      <View className="items-center justify-start" style={{ width }}>
        <View style={{ width: "100%", height: 340 }}>
          <OptimizedImage
            source={currentSlide.image}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            lazy={false}
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
          <View className="mt-8 flex-row justify-center items-center">
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

          <View className="mt-8">
            <Text className="text-[#344054] text-[12px] font-rubik-bold text-center">
              GET STARTED WITH
            </Text>
          </View>

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
              <OptimizedImage
                source={require("../../assets/images/Faceboook.png")}
                style={{ width: 48, height: 48 }}
                contentFit="contain"
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
              <OptimizedImage
                source={require("../../assets/images/Gooogle.png")}
                style={{ width: 48, height: 48 }}
                contentFit="contain"
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
              <OptimizedImage
                source={require("../../assets/images/Apple.png")}
                style={{ width: 48, height: 48 }}
                contentFit="contain"
              />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center mt-9 justify-center w-[90%] max-w-[361px]">
            <Image
              source={require("../../assets/images/Rectangle.png")}
              className="h-[1px] w-[30%]"
              resizeMode="contain"
            />
            <Text className="text-[#101828] font-bold text-[10px]">OR</Text>
            <Image
              source={require("../../assets/images/Rectangle (1).png")}
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
              key: "signin_button",
              priority: "high",
            })}
            className="mt-9"
          >
            <Text className="text-[#344054] text-sm font-medium">Sign In</Text>
          </TouchableOpacity>

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
