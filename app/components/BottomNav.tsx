import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  InteractionManager,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets, initialWindowMetrics as safeAreaInitialMetrics } from "react-native-safe-area-context";
import { playNavTapSound } from "../../src/shared/utils/uiSounds";
import {
  getFabSize,
  getIconSize,
  getResponsiveBorderRadius,
  getResponsiveShadow,
  getResponsiveSize,
  getResponsiveSpacing,
  getResponsiveTextStyle,
} from "../../utils/responsive";
import { useGlobalAudioPlayerStore } from "../store/useGlobalAudioPlayerStore";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import { useMediaStore } from "../store/useUploadStore";
import { useFastPerformance } from "../utils/fastPerformance";
import {
  prefetchCreateFlows,
  prefetchGoLiveScreen,
  prefetchUploadScreen,
} from "../utils/prefetchUploadScreen";
import { FabCreateActions } from "./FabCreateActions";

/** Tab row height only — system inset is applied separately (avoids double-count + jump). */
const NAV_CONTENT_HEIGHT = getResponsiveSize(80, 84, 88, 96);
/** Last-known Android nav inset fallback when metrics briefly report 0. */
const ANDROID_NAV_FALLBACK = 24;

interface BottomNavProps {
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
}

/** Single icon family (Ionicons) — already loaded in root useFonts. */
const tabConfig: Record<
  string,
  { name: keyof typeof Ionicons.glyphMap; label: string }
> = {
  Home: { name: "home-outline", label: "Home" },
  Community: { name: "people-outline", label: "Community" },
  Library: { name: "play-circle-outline", label: "Library" },
  Bible: { name: "book-outline", label: "Bible" },
};

const TAB_ORDER = ["Home", "Community", "Library", "Bible"] as const;

function deferMediaCleanup(tab: string, prevTab: string) {
  if (tab === prevTab) return;
  InteractionManager.runAfterInteractions(() => {
    try {
      useMediaStore.getState().stopAudioFn?.();
    } catch {
      // no-op
    }
    try {
      useGlobalVideoStore.getState().pauseAllVideos();
    } catch {
      // no-op
    }
    try {
      if (tab === "Bible") {
        void useGlobalAudioPlayerStore.getState().stop();
      }
    } catch {
      // no-op
    }
  });
}

export default function BottomNav({
  selectedTab,
  setSelectedTab,
}: BottomNavProps) {
  const [showActions, setShowActions] = useState(false);
  /** Defer FAB sheet until first open — avoids BlurView cost on cold paint */
  const [fabSheetMounted, setFabSheetMounted] = useState(false);
  const { fastPress } = useFastPerformance();
  const insets = useSafeAreaInsets();
  // Prefer live insets; fall back to window metrics / platform default so we
  // never paint with 0 then jump when Android edge-to-edge resolves.
  const metricsBottom = safeAreaInitialMetrics?.insets?.bottom ?? 0;
  const safePadding =
    insets.bottom ||
    metricsBottom ||
    (Platform.OS === "android" ? ANDROID_NAV_FALLBACK : 0);
  const navBarHeight = NAV_CONTENT_HEIGHT + safePadding;

  const handleFabToggle = useCallback(() => {
    setFabSheetMounted(true);
    setShowActions((v) => {
      const next = !v;
      if (next) prefetchCreateFlows();
      return next;
    });
  }, []);

  const handleUpload = useCallback(() => {
    setShowActions(false);
    // Navigate first — never block push on media cleanup / extra imports.
    router.push("/categories/upload");
    queueMicrotask(() => prefetchUploadScreen());
    InteractionManager.runAfterInteractions(() => {
      try {
        useMediaStore.getState().stopAudioFn?.();
      } catch {
        // no-op
      }
      try {
        useGlobalVideoStore.getState().pauseAllVideos();
      } catch {
        // no-op
      }
    });
  }, []);

  // Idle warm: after first paint settles, pull Create flows into the JS cache
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const task = InteractionManager.runAfterInteractions(() => {
      timeout = setTimeout(() => prefetchCreateFlows(), 1800);
    });
    return () => {
      task.cancel();
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const handleGoLive = useCallback(() => {
    setShowActions(false);
    router.push("/goLlive/AllowPermissionsScreen");
    queueMicrotask(() => prefetchGoLiveScreen());
    InteractionManager.runAfterInteractions(() => {
      try {
        useMediaStore.getState().stopAudioFn?.();
      } catch {
        // no-op
      }
      try {
        useGlobalVideoStore.getState().pauseAllVideos();
      } catch {
        // no-op
      }
    });
  }, []);

  const handleTabPress = useCallback(
    (tab: string) => {
      setSelectedTab(tab);
      queueMicrotask(() => playNavTapSound());
      deferMediaCleanup(tab, selectedTab);
    },
    [selectedTab, setSelectedTab]
  );

  const renderTab = (tab: string) => {
    const { name, label } = tabConfig[tab];
    const isActive = selectedTab === tab;
    return (
      <Pressable
        key={tab}
        onPress={() => handleTabPress(tab)}
        unstable_pressDelay={0}
        android_disableSound
        hitSlop={8}
        style={({ pressed }) => ({
          alignItems: "center",
          justifyContent: "center",
          minWidth: 48,
          minHeight: 48,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons
          name={name}
          size={getIconSize("medium")}
          color={isActive ? "#256E63" : "#000"}
        />
        <Text
          style={[
            getResponsiveTextStyle("caption"),
            {
              marginTop: getResponsiveSpacing(2, 3, 4, 5),
              color: isActive ? "#256E63" : "#000",
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <>
      {fabSheetMounted ? (
        <FabCreateActions
          visible={showActions}
          bottomOffset={
            navBarHeight -
            getResponsiveSpacing(40, 44, 48, 52) +
            getFabSize().size +
            getResponsiveSpacing(8, 10, 12, 16)
          }
          onUpload={handleUpload}
          onGoLive={handleGoLive}
          onUploadIntent={prefetchUploadScreen}
          onGoLiveIntent={prefetchGoLiveScreen}
        />
      ) : null}

      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: navBarHeight,
          paddingBottom: safePadding,
          backgroundColor: "white",
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "center",
          ...getResponsiveShadow(),
          zIndex: 10,
        }}
      >
        {TAB_ORDER.slice(0, 2).map(renderTab)}
        {TAB_ORDER.slice(2).map(renderTab)}
      </View>

      <View
        style={{
          position: "absolute",
          bottom: navBarHeight - getResponsiveSpacing(40, 44, 48, 52),
          left: "50%",
          transform: [{ translateX: -getFabSize().size / 2 }],
          backgroundColor: "white",
          padding: getResponsiveSpacing(2, 3, 4, 5),
          borderRadius: getResponsiveBorderRadius("round"),
          ...getResponsiveShadow(),
          zIndex: 1000,
        }}
      >
        <TouchableOpacity
          style={{
            width: getFabSize().size,
            height: getFabSize().size,
            borderRadius: getResponsiveBorderRadius("round"),
            backgroundColor: "white",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            elevation: 15,
          }}
          onPress={fastPress(handleFabToggle, {
            key: "fab_toggle",
            priority: "high",
          })}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showActions ? "close" : "add"}
            size={getFabSize().iconSize}
            color="#256E63"
          />
        </TouchableOpacity>
      </View>
    </>
  );
}
