import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  InteractionManager,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { playNavTapSound } from "../../src/shared/utils/uiSounds";
import { pausePlaybackSession } from "../../src/shared/audio/playOrToggleTrack";
import {
  getBottomNavHeight,
  getFabSize,
  getIconSize,
  getResponsiveBorderRadius,
  getResponsiveShadow,
  getResponsiveSpacing,
  getResponsiveTextStyle,
} from "../../utils/responsive";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import { useMediaStore } from "../store/useUploadStore";
import {
  prefetchCreateFlows,
  prefetchGoLiveScreen,
  prefetchUploadScreen,
} from "../utils/prefetchUploadScreen";
import { FabCreateActions } from "./FabCreateActions";

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
        void pausePlaybackSession();
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
  const navBarHeight = getBottomNavHeight();

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

  const tabPadH = getResponsiveSpacing(4, 6, 8, 10);
  const tabPadV = getResponsiveSpacing(6, 8, 10, 12);
  const fabSlotWidth =
    getFabSize().size +
    getResponsiveSpacing(2, 3, 4, 5) * 2 +
    getResponsiveSpacing(16, 20, 24, 28);

  const renderTab = (tab: string) => {
    const { name, label } = tabConfig[tab];
    const isActive = selectedTab === tab;
    return (
      <View key={tab} style={{ flex: 1 }}>
        <Pressable
          onPress={() => handleTabPress(tab)}
          unstable_pressDelay={0}
          android_disableSound
          style={({ pressed }) => ({
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: tabPadH,
            paddingVertical: tabPadV,
            minHeight: 48,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <Ionicons
              name={name}
              size={getIconSize("medium")}
              color={isActive ? "#256E63" : "#000"}
            />
          </View>
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              marginTop: getResponsiveSpacing(2, 3, 4, 5),
            }}
          >
            <Text
              style={[
                getResponsiveTextStyle("caption"),
                {
                  color: isActive ? "#256E63" : "#000",
                  textAlign: "center",
                },
              ]}
            >
              {label}
            </Text>
          </View>
        </Pressable>
      </View>
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
          paddingTop: getResponsiveSpacing(8, 10, 12, 14),
          paddingBottom: getResponsiveSpacing(8, 10, 12, 14),
          paddingHorizontal: getResponsiveSpacing(8, 12, 16, 20),
          backgroundColor: "white",
          flexDirection: "row",
          alignItems: "stretch",
          ...getResponsiveShadow(),
          zIndex: 10,
        }}
      >
        {TAB_ORDER.slice(0, 2).map(renderTab)}
        <View style={{ width: fabSlotWidth }} />
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
          onPress={handleFabToggle}
          delayPressIn={0}
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
