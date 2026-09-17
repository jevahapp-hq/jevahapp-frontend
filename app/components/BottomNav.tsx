import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef } from "react";
import {
  InteractionManager,
  Pressable,
  StyleSheet,
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
  JAKARTA,
} from "../../utils/responsive";
import { useGlobalAudioPlayerStore } from "@/store/useGlobalAudioPlayerStore";
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
  {
    outline: keyof typeof Ionicons.glyphMap;
    filled: keyof typeof Ionicons.glyphMap;
    label: string;
  }
> = {
  Home: { outline: "home-outline", filled: "home", label: "Home" },
  Community: { outline: "people-outline", filled: "people", label: "Community" },
  Library: {
    outline: "play-circle-outline",
    filled: "play-circle",
    label: "Library",
  },
  Bible: { outline: "book-outline", filled: "book", label: "Bible" },
};

const TAB_ORDER = ["Home", "Community", "Library", "Bible"] as const;

export default function BottomNav({
  selectedTab,
  setSelectedTab,
}: BottomNavProps) {
  const navBarHeight = getBottomNavHeight();
  const lastHomeVideoKeyRef = useRef<string | null>(null);

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
      const previousTab = selectedTab;
      setSelectedTab(tab);
      queueMicrotask(() => playNavTapSound());
      if (tab === previousTab) return;

      InteractionManager.runAfterInteractions(() => {
        try {
          useMediaStore.getState().stopAudioFn?.();
        } catch {
          // no-op
        }

        if (tab === "Bible") {
          try {
            void useGlobalAudioPlayerStore.getState().stop();
          } catch {
            // no-op
          }
          try {
            void pausePlaybackSession();
          } catch {
            // no-op
          }
        }

        if (tab === "Home") {
          try {
            const videoStore = useGlobalVideoStore.getState();
            const key =
              lastHomeVideoKeyRef.current || videoStore.currentlyPlayingVideo;
            if (key) videoStore.playVideoGlobally(key);
          } catch {
            // no-op
          }
          return;
        }

        if (previousTab === "Home") {
          try {
            const videoStore = useGlobalVideoStore.getState();
            lastHomeVideoKeyRef.current = videoStore.currentlyPlayingVideo;
            videoStore.pauseAllVideos();
          } catch {
            // no-op
          }
          return;
        }

        try {
          useGlobalVideoStore.getState().pauseAllVideos();
        } catch {
          // no-op
        }
      });
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
    const { outline, filled, label } = tabConfig[tab];
    const isActive = selectedTab === tab;
    const color = isActive ? "#256E63" : "#1D2939";
    return (
      <View key={tab} style={{ flex: 1 }}>
        <Pressable
          onPressIn={() => handleTabPress(tab)}
          unstable_pressDelay={0}
          android_disableSound
          style={({ pressed }) => ({
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: tabPadH,
            paddingVertical: tabPadV,
            minHeight: 48,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <Ionicons
              name={isActive ? filled : outline}
              size={getIconSize("large")}
              color={color}
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
              style={{
                fontFamily: JAKARTA.bold,
                fontSize: 13,
                lineHeight: 16,
                color,
                textAlign: "center",
              }}
              numberOfLines={1}
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
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "#D0D5DD",
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
