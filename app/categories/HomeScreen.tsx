import BottomNav from "@/app/components/BottomNav";
import { useLocalSearchParams } from "expo-router";
import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { InteractionManager, StyleSheet, View } from "react-native";
import { useCommentModal } from "../context/CommentModalContext";
import {
  releaseMiniPlayer,
  setMiniPlayerSuppression,
} from "../../src/shared/audio/miniPlayerGate";
import { useNewUserLoginTour } from "../components/loginTour/useNewUserLoginTour";
import BibleTabSkeleton from "../components/bible/BibleTabSkeleton";
import CommunityTabSkeleton from "../screens/CommunityTabSkeleton";
import LibraryTabSkeleton from "../screens/library/LibraryTabSkeleton";
import HomeTabContent from "./HomeTabContent";

const NewUserLoginTour = lazy(
  () => import("../components/loginTour/NewUserLoginTour")
);
const LibraryScreen = lazy(() => import("../screens/library/LibraryScreen"));
const CommunityScreen = lazy(() => import("../screens/CommunityScreen"));
const BibleScreen = lazy(() => import("../screens/BibleScreen"));

const tabList = ["Home", "Community", "Library", "Bible"] as const;
type MainShellTab = (typeof tabList)[number];

/**
 * Keep-alive main tabs: mount once on first visit, then show/hide.
 * Avoids Suspense remount + cold FlashList / screen cost on every tap.
 */
export default function HomeScreen() {
  const [selectedTab, setSelectedTab] = useState<MainShellTab>("Home");
  const [mounted, setMounted] = useState<Partial<Record<MainShellTab, boolean>>>(
    { Home: true }
  );
  const { isVisible: isCommentSheetOpen } = useCommentModal();
  const loginTour = useNewUserLoginTour();
  const { default: defaultTabParamRaw } = useLocalSearchParams();
  const defaultTabParam = Array.isArray(defaultTabParamRaw)
    ? defaultTabParamRaw[0]
    : defaultTabParamRaw;

  const handleTabChange = useCallback((tab: string) => {
    if (!tabList.includes(tab as MainShellTab)) return;
    const next = tab as MainShellTab;
    setSelectedTab(next);
    setMiniPlayerSuppression("bible-tab", next === "Bible");
    setMounted({
      Home: true,
      ...(next !== "Home" ? { [next]: true } : {}),
    });
  }, []);

  useEffect(() => {
    return () => releaseMiniPlayer("bible-tab");
  }, []);

  useEffect(() => {
    if (defaultTabParam && tabList.includes(defaultTabParam as MainShellTab)) {
      handleTabChange(defaultTabParam);
    }
  }, [defaultTabParam, handleTabChange]);

  // In Metro/dev, extra import() calls steal the compiler from Home.
  // Production already has those chunks; prefetch there only.
  useEffect(() => {
    if (__DEV__) return;
    const task = InteractionManager.runAfterInteractions(() => {
      void import("../screens/CommunityScreen");
      void import("../screens/library/LibraryScreen");
      void import("../screens/BibleScreen");
    });
    return () => task.cancel();
  }, []);

  const panelStyle = (tab: MainShellTab) => [
    styles.panel,
    selectedTab === tab ? styles.panelActive : styles.panelHidden,
  ];

  return (
    <View style={styles.root} className="w-full">
      {/* Chrome first in tree — paints with empty panels on frame 0 */}
      <View
        style={[
          styles.navWrap,
          isCommentSheetOpen ? styles.navHidden : undefined,
          loginTour.elevateNav ? styles.navElevated : undefined,
          {
            pointerEvents:
              isCommentSheetOpen || loginTour.elevateNav ? "none" : "auto",
          },
        ]}
        accessibilityElementsHidden={isCommentSheetOpen}
        importantForAccessibility={
          isCommentSheetOpen ? "no-hide-descendants" : "auto"
        }
      >
        <BottomNav
          selectedTab={selectedTab}
          setSelectedTab={handleTabChange}
        />
      </View>

      <View style={styles.panels}>
        {mounted.Home ? (
          <View
            style={[
              panelStyle("Home"),
              { pointerEvents: selectedTab === "Home" ? "auto" : "none" },
            ]}
            collapsable={false}
          >
            <HomeTabContent />
          </View>
        ) : null}

        {mounted.Community ? (
          <View
            style={[
              panelStyle("Community"),
              {
                pointerEvents:
                  selectedTab === "Community" ? "auto" : "none",
              },
            ]}
            collapsable={false}
          >
            <Suspense fallback={<CommunityTabSkeleton />}>
              <CommunityScreen embedded />
            </Suspense>
          </View>
        ) : null}

        {mounted.Library ? (
          <View
            style={[
              panelStyle("Library"),
              { pointerEvents: selectedTab === "Library" ? "auto" : "none" },
            ]}
            collapsable={false}
          >
            <Suspense fallback={<LibraryTabSkeleton />}>
              <LibraryScreen embedded />
            </Suspense>
          </View>
        ) : null}

        {mounted.Bible ? (
          <View
            style={[
              panelStyle("Bible"),
              { pointerEvents: selectedTab === "Bible" ? "auto" : "none" },
            ]}
            collapsable={false}
          >
            <Suspense fallback={<BibleTabSkeleton />}>
              <BibleScreen />
            </Suspense>
          </View>
        ) : null}
      </View>

      {loginTour.visible ? (
        <Suspense fallback={null}>
          <NewUserLoginTour
            firstName={loginTour.firstName}
            onSpotlightChange={loginTour.setElevateNav}
            onDone={loginTour.dismiss}
          />
        </Suspense>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  panels: { flex: 1 },
  panel: {
    ...StyleSheet.absoluteFillObject,
  },
  panelActive: {
    zIndex: 1,
    opacity: 1,
  },
  /** Keep mounted (cached) but off-screen for the compositor */
  panelHidden: {
    zIndex: 0,
    opacity: 0,
  },
  navWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    // The root mini-player is intentionally above page content but below nav.
    // Keep this parent in the native Android stacking order as well; zIndex
    // alone does not reliably win hit-testing across elevated root siblings.
    zIndex: 60000,
    elevation: 20,
  },
  navElevated: {
    zIndex: 90000,
    elevation: 90,
  },
  navHidden: {
    opacity: 0,
    transform: [{ translateY: 28 }],
  },
});
