import {
    AntDesign,
    Ionicons,
    MaterialCommunityIcons,
} from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import React, { memo, useCallback, useState } from "react";
import {
    Platform,
    Text,
    View
} from "react-native";
import {
    getBottomNavHeight,
    getFabSize,
    getIconSize,
    getResponsiveBorderRadius,
    getResponsiveShadow,
    getResponsiveSpacing,
    getResponsiveTextStyle
} from "../../utils/responsive";
import { useFastButton } from "../hooks/useFastButton";
import { usePerformanceMonitor } from "../hooks/usePerformanceMonitor";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import { useMediaStore } from "../store/useUploadStore";
import OptimizedTouchableOpacity from "./OptimizedTouchableOpacity";

// Bottom tab config
interface BottomNavProps {
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
}

const tabConfig: Record<
  string,
  { IconComponent: React.ComponentType<any>; name: string; label: string }
> = {
  Home: { IconComponent: AntDesign, name: "home", label: "Home" },
  Community: {
    IconComponent: MaterialCommunityIcons,
    name: "account-group-outline",
    label: "Community",
  },
  Library: {
    IconComponent: Ionicons,
    name: "play-circle-outline",
    label: "Library",
  },
  Account: {
    IconComponent: Ionicons,
    name: "person-outline",
    label: "Account",
  },
};

const OptimizedBottomNav = memo<BottomNavProps>(({
  selectedTab,
  setSelectedTab,
}) => {
  const [showActions, setShowActions] = useState(false);

  // Performance monitoring
  const performance = usePerformanceMonitor({
    componentName: 'OptimizedBottomNav',
    trackRenders: true,
    trackButtonClicks: true,
  });

  // Optimized button handlers
  const fabButton = useFastButton(() => {
    console.log('🔄 FAB clicked! Current showActions:', showActions);
    console.log('🔄 Will set showActions to:', !showActions);
    setShowActions(!showActions);
  }, {
    hapticType: 'medium',
    preventRapidClicks: true,
    rapidClickThreshold: 100,
  });

  const uploadButton = useFastButton(() => {
    useMediaStore.getState().stopAudioFn?.(); // Stop any active audio
    setShowActions(false);
    router.push("/categories/upload");
  }, {
    hapticType: 'success',
    preventRapidClicks: true,
    rapidClickThreshold: 100,
  });

  const goLiveButton = useFastButton(() => {
    useMediaStore.getState().stopAudioFn?.();
    setShowActions(false);
    router.push("/goLlive/AllowPermissionsScreen");
  }, {
    hapticType: 'success',
    preventRapidClicks: true,
    rapidClickThreshold: 100,
  });

  const handleTabPress = useCallback((tab: string) => {
    // Only stop media if actually switching to a different tab
    if (tab !== selectedTab) {
      // Stop any active audio and pause all videos when switching tabs
      try {
        useMediaStore.getState().stopAudioFn?.();
      } catch (e) {
        // no-op
      }
      try {
        useGlobalVideoStore.getState().pauseAllVideos();
      } catch (e) {
        // no-op
      }
    }
    setSelectedTab(tab);
  }, [selectedTab, setSelectedTab]);

  // Memoized tab button component
  const TabButton = useCallback(({ tab, IconComponent, name, label }: {
    tab: string;
    IconComponent: React.ComponentType<any>;
    name: string;
    label: string;
  }) => {
    const isActive = selectedTab === tab;
    
    return (
      <OptimizedTouchableOpacity
        onPress={() => handleTabPress(tab)}
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 48,
          minHeight: 48,
        }}
        variant="ghost"
        size="small"
        hapticFeedback={true}
        hapticType="light"
        preventRapidClicks={true}
        rapidClickThreshold={50}
      >
        <IconComponent
          name={name}
          size={getIconSize('medium')}
          color={isActive ? "#256E63" : "#000"}
        />
        <Text style={[
          getResponsiveTextStyle('caption'),
          {
            marginTop: getResponsiveSpacing(2, 3, 4, 5),
            color: isActive ? "#256E63" : "#000",
          }
        ]}>
          {label}
        </Text>
      </OptimizedTouchableOpacity>
    );
  }, [selectedTab, handleTabPress]);

  return (
    <>
      {/* FAB Action Buttons */}
      {showActions && (
        <View 
          style={{
            position: 'absolute',
            bottom: getBottomNavHeight() - getResponsiveSpacing(40, 44, 48, 52) + getFabSize().size + getResponsiveSpacing(8, 10, 12, 16),
            left: '50%',
            transform: [{ translateX: -140 }], // Half of wider width
            width: 280,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 30,
          }}
        >
          <View style={{
            borderRadius: getResponsiveBorderRadius('large'),
            overflow: 'hidden',
            width: '100%',
            height: 70,
          }}>
            {Platform.OS !== "web" ? (
              <BlurView
                intensity={80}
                tint="light"
                style={{
                  flexDirection: 'row',
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: getResponsiveSpacing(12, 16, 20, 24),
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                }}
              >
                <OptimizedTouchableOpacity
                  style={{
                    backgroundColor: '#256E63',
                    paddingHorizontal: getResponsiveSpacing(12, 16, 20, 24),
                    paddingVertical: getResponsiveSpacing(6, 8, 10, 12),
                    borderRadius: getResponsiveBorderRadius('round'),
                    borderWidth: 4,
                    borderColor: 'white',
                  }}
                  onPress={uploadButton.handlePress}
                  variant="primary"
                  size="medium"
                  hapticFeedback={true}
                  hapticType="success"
                >
                  <Text style={[
                    getResponsiveTextStyle('button'),
                    { color: 'white' }
                  ]}>
                    Upload
                  </Text>
                </OptimizedTouchableOpacity>

                <OptimizedTouchableOpacity
                  style={{
                    backgroundColor: 'black',
                    paddingHorizontal: getResponsiveSpacing(12, 16, 20, 24),
                    paddingVertical: getResponsiveSpacing(6, 8, 10, 12),
                    borderRadius: getResponsiveBorderRadius('round'),
                    borderWidth: 4,
                    borderColor: 'white',
                  }}
                  onPress={goLiveButton.handlePress}
                  variant="primary"
                  size="medium"
                  hapticFeedback={true}
                  hapticType="success"
                >
                  <Text style={[
                    getResponsiveTextStyle('button'),
                    { color: 'white' }
                  ]}>
                    Go Live
                  </Text>
                </OptimizedTouchableOpacity>
              </BlurView>
            ) : (
              <View style={{
                flexDirection: 'row',
                width: '100%',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                gap: getResponsiveSpacing(12, 16, 20, 24),
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                paddingHorizontal: getResponsiveSpacing(8, 10, 12, 14),
                borderRadius: getResponsiveBorderRadius('large'),
              }}>
                <OptimizedTouchableOpacity
                  style={{
                    backgroundColor: '#256E63',
                    paddingHorizontal: getResponsiveSpacing(12, 16, 20, 24),
                    paddingVertical: getResponsiveSpacing(6, 8, 10, 12),
                    borderRadius: getResponsiveBorderRadius('round'),
                    borderWidth: 4,
                    borderColor: 'white',
                  }}
                  onPress={uploadButton.handlePress}
                  variant="primary"
                  size="medium"
                  hapticFeedback={true}
                  hapticType="success"
                >
                  <Text style={[
                    getResponsiveTextStyle('button'),
                    { color: 'white' }
                  ]}>
                    Upload
                  </Text>
                </OptimizedTouchableOpacity>

                <OptimizedTouchableOpacity
                  style={{
                    backgroundColor: 'black',
                    paddingHorizontal: getResponsiveSpacing(12, 16, 20, 24),
                    paddingVertical: getResponsiveSpacing(6, 8, 10, 12),
                    borderRadius: getResponsiveBorderRadius('round'),
                    borderWidth: 4,
                    borderColor: 'white',
                  }}
                  onPress={goLiveButton.handlePress}
                  variant="primary"
                  size="medium"
                  hapticFeedback={true}
                  hapticType="success"
                >
                  <Text style={[
                    getResponsiveTextStyle('button'),
                    { color: 'white' }
                  ]}>
                    Go Live
                  </Text>
                </OptimizedTouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Bottom Navigation Bar */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: getBottomNavHeight(),
          backgroundColor: 'white',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingHorizontal: getResponsiveSpacing(8, 10, 12, 16),
          paddingBottom: getResponsiveSpacing(8, 10, 12, 16),
          ...getResponsiveShadow(),
          zIndex: 50,
        }}
      >
        {/* First half of tabs */}
        {Object.entries(tabConfig)
          .slice(0, 2)
          .map(([tab, { IconComponent, name, label }]) => (
            <TabButton
              key={tab}
              tab={tab}
              IconComponent={IconComponent}
              name={name}
              label={label}
            />
          ))}

        {/* Second half of tabs */}
        {Object.entries(tabConfig)
          .slice(2)
          .map(([tab, { IconComponent, name, label }]) => (
            <TabButton
              key={tab}
              tab={tab}
              IconComponent={IconComponent}
              name={name}
              label={label}
            />
          ))}
      </View>

      {/* Floating Action Button - Positioned at middle of Community and Library tabs */}
      <View 
        style={{
          position: 'absolute',
          bottom: getBottomNavHeight() - getResponsiveSpacing(40, 44, 48, 52),
          left: '50%',
          transform: [{ translateX: -getFabSize().size / 2 }],
          backgroundColor: 'white',
          padding: getResponsiveSpacing(2, 3, 4, 5),
          borderRadius: getResponsiveBorderRadius('round'),
          ...getResponsiveShadow(),
          zIndex: 100,
        }}
      >
        <OptimizedTouchableOpacity
          style={{
            width: getFabSize().size,
            height: getFabSize().size,
            borderRadius: getResponsiveBorderRadius('round'),
            backgroundColor: 'white',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            elevation: 15,
          }}
          onPress={fabButton.handlePress}
          variant="ghost"
          size="medium"
          hapticFeedback={true}
          hapticType="medium"
        >
          <AntDesign
            name={showActions ? "close" : "plus"}
            size={getFabSize().iconSize}
            color="#256E63"
          />
        </OptimizedTouchableOpacity>
      </View>
    </>
  );
});

OptimizedBottomNav.displayName = 'OptimizedBottomNav';

export default OptimizedBottomNav;
