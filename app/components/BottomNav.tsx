import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect } from "react";
import {
  InteractionManager,
  Pressable,
  Text,
  View,
} from "react-native";
import { playNavTapSound } from "../../src/shared/utils/uiSounds";
import { pausePlaybackSession } from "../../src/shared/audio/playOrToggleTrack";
import {
  retainBottomChrome,
  releaseBottomChrome,
} from "../../src/shared/layout/bottomChromeGate";
import {
  getBottomNavHeight,
  getFabSize,
  getIconSize,
  getResponsiveShadow,
  getResponsiveSpacing,
  getResponsiveTextStyle,
  JAKARTA,
} from "../../utils/responsive";
import { useGlobalVideoStore } from "@/store/useGlobalVideoStore";
import { useMediaStore } from "@/store/useUploadStore";
import { prefetchCreateFlows } from "../utils/prefetchUploadScreen";

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
  const navBarHeight = getBottomNavHeight();

  useEffect(() => {
    retainBottomChrome();
    return () => releaseBottomChrome();
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
                  fontFamily: JAKARTA.bold,
                  color: isActive ? "#256E63" : "#000",
                  textAlign: "center",
                  flexShrink: 1,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {label}
            </Text>
          </View>
        </Pressable>
      </View>
    );
  };

  return (
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
  );
}
