import BottomNav from "@/app/components/BottomNav";
import { useLocalSearchParams } from "expo-router";
import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useCommentModal } from "../context/CommentModalContext";
import {
  releaseMiniPlayer,
  setMiniPlayerSuppression,
} from "../../src/shared/audio/miniPlayerGate";
import { hideAppSplash } from "../../src/shared/utils/appSplash";
import { useNewUserLoginTour } from "../components/loginTour/useNewUserLoginTour";
import LibraryTabSkeleton from "../screens/library/LibraryTabSkeleton";
import BibleScreen from "../screens/BibleScreen";
import CommunityScreen from "../screens/CommunityScreen";
import { ContentErrorBoundary } from "../components/ContentErrorBoundary";
import HomeTabContent from "./HomeTabContent";
import {
  prefetchHomeTabModules,
  prefetchHomeTabModulesPromise,
} from "../utils/prefetchHomeTabs";

const NewUserLoginTour = lazy(
  () => import("../components/loginTour/NewUserLoginTour")
);
const LibraryScreen = lazy(() => import("../screens/library/LibraryScreen"));

prefetchHomeTabModules();

const tabList = ["Home", "Community", "Library", "Bible"] as const;
type MainShellTab = (typeof tabList)[number];

/** Native VideoView ignores opacity and transform — park with layout `left`. */
const OFFSCREEN_X = 4000;

function paneStyle(active: boolean) {
  return [
    styles.tabPane,
    active ? styles.tabPaneOn : styles.tabPaneOff,
  ];
}

/**
 * Keep visited tabs mounted. Inactive panes are translated off-screen
 * because VideoView still paints when opacity is 0.
 */
export default function HomeScreen() {
  const [selectedTab, setSelectedTab] = useState<MainShellTab>("Home");
  const [visitedTabs, setVisitedTabs] = useState<Set<MainShellTab>>(
    () => new Set(["Home", "Community"])
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
    setVisitedTabs((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
    setMiniPlayerSuppression("bible-tab", next === "Bible");
  }, []);

  useEffect(() => {
    return () => releaseMiniPlayer("bible-tab");
  }, []);

  useEffect(() => {
    void prefetchHomeTabModulesPromise().then(() => {
      setVisitedTabs((prev) =>
        prev.has("Library") ? prev : new Set(prev).add("Library")
      );
    });
  }, []);

  useEffect(() => {
    if (defaultTabParam && tabList.includes(defaultTabParam as MainShellTab)) {
      handleTabChange(defaultTabParam);
    }
  }, [defaultTabParam, handleTabChange]);

  return (
    <View style={styles.root} onLayout={hideAppSplash}>
      <View style={styles.tabHost}>
        <View style={paneStyle(selectedTab === "Home")} collapsable={false}>
          <HomeTabContent isTabActive={selectedTab === "Home"} />
        </View>

        {visitedTabs.has("Community") ? (
          <View
            style={paneStyle(selectedTab === "Community")}
            collapsable={false}
          >
            <ContentErrorBoundary>
              <CommunityScreen embedded />
            </ContentErrorBoundary>
          </View>
        ) : null}

        {visitedTabs.has("Library") ? (
          <View
            style={paneStyle(selectedTab === "Library")}
            collapsable={false}
          >
            <Suspense fallback={<LibraryTabSkeleton />}>
              <ContentErrorBoundary>
                <LibraryScreen embedded />
              </ContentErrorBoundary>
            </Suspense>
          </View>
        ) : null}

        {visitedTabs.has("Bible") ? (
          <View style={paneStyle(selectedTab === "Bible")} collapsable={false}>
            <BibleScreen />
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.navWrap,
          isCommentSheetOpen ? styles.navHidden : undefined,
          loginTour.elevateNav ? styles.navElevated : undefined,
        ]}
        pointerEvents={
          isCommentSheetOpen || loginTour.elevateNav ? "none" : "auto"
        }
      >
        <BottomNav
          selectedTab={selectedTab}
          setSelectedTab={handleTabChange}
        />
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
  root: { flex: 1, backgroundColor: "#FCFCFD" },
  tabHost: { flex: 1, backgroundColor: "#FCFCFD", overflow: "hidden" },
  tabPane: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "100%",
  },
  tabPaneOn: {
    left: 0,
    zIndex: 2,
    elevation: 2,
    opacity: 1,
  },
  tabPaneOff: {
    left: OFFSCREEN_X,
    zIndex: 0,
    elevation: 0,
    opacity: 0,
  },
  navWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
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
