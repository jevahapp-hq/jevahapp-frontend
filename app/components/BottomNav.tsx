import {
  AntDesign,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
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
import { useFastPerformance } from "../utils/fastPerformance";

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
  Bible: {
    IconComponent: Ionicons,
    name: "book-outline",
    label: "Bible",
  },
};

export default function BottomNav({
  selectedTab,
  setSelectedTab,
}: BottomNavProps) {
  const [showActions, setShowActions] = useState(false);
  const { fastPress } = useFastPerformance();

  const handleFabToggle = useCallback(() => {
    setShowActions(!showActions);
  }, [showActions]);

  const handleUpload = useCallback(() => {
    setShowActions(false);
    // Defer heavy operations to prevent blocking UI
    requestAnimationFrame(() => {
      try {
        useMediaStore.getState().stopAudioFn?.();
      } catch (e) {
        // no-op
      }
    });
    router.push("/categories/upload");
  }, []);

  const handleGoLive = useCallback(() => {
    setShowActions(false);
    // Defer heavy operations to prevent blocking UI
    requestAnimationFrame(() => {
      try {
        useMediaStore.getState().stopAudioFn?.();
      } catch (e) {
        // no-op
      }
    });
    router.push("/goLlive/AllowPermissionsScreen");
  }, []);

  const handleTabPress = useCallback(
    (tab: string) => {
      // Immediate UI update
      setSelectedTab(tab);

      // Only stop media if actually switching to a different tab
      if (tab !== selectedTab) {
        // Defer heavy operations to prevent blocking UI
        requestAnimationFrame(() => {
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
        });
      }
    },
    [selectedTab, setSelectedTab]
  );

  return (
    <>
      {/* FAB Action Buttons */}
      {showActions && (
        <View
          style={{
            position: "absolute",
            bottom:
              getBottomNavHeight() -
              getResponsiveSpacing(40, 44, 48, 52) +
              getFabSize().size +
              getResponsiveSpacing(8, 10, 12, 16),
            left: "50%",
            transform: [{ translateX: -140 }], // Half of wider width
            width: 280,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 30,
          }}
        >
          <View
            style={{
              borderRadius: getResponsiveBorderRadius("large"),
              overflow: "hidden",
              width: "100%",
              height: 70,
            }}
          >
            {Platform.OS !== "web" ? (
              <BlurView
                intensity={80}
                tint="light"
                style={{
                  flexDirection: "row",
                  width: "100%",
                  height: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: getResponsiveSpacing(12, 16, 20, 24),
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                }}
              >
                <TouchableOpacity
                  style={{
                    backgroundColor: "#256E63",
                    paddingHorizontal: getResponsiveSpacing(12, 16, 20, 24),
                    paddingVertical: getResponsiveSpacing(6, 8, 10, 12),
                    borderRadius: getResponsiveBorderRadius("round"),
                    borderWidth: 4,
                    borderColor: "white",
                  }}
                  onPress={handleUpload}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      getResponsiveTextStyle("button"),
                      { color: "white" },
                    ]}
                  >
                    Upload
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: "black",
                    paddingHorizontal: getResponsiveSpacing(12, 16, 20, 24),
                    paddingVertical: getResponsiveSpacing(6, 8, 10, 12),
                    borderRadius: getResponsiveBorderRadius("round"),
                    borderWidth: 4,
                    borderColor: "white",
                  }}
                  onPress={handleGoLive}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      getResponsiveTextStyle("button"),
                      { color: "white" },
                    ]}
                  >
                    Go Live
                  </Text>
                </TouchableOpacity>
              </BlurView>
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  width: "100%",
                  height: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: getResponsiveSpacing(12, 16, 20, 24),
                  backgroundColor: "rgba(255, 255, 255, 0.7)",
                  paddingHorizontal: getResponsiveSpacing(8, 10, 12, 14),
                  borderRadius: getResponsiveBorderRadius("large"),
                }}
              >
                <TouchableOpacity
                  style={{
                    backgroundColor: "#256E63",
                    paddingHorizontal: getResponsiveSpacing(12, 16, 20, 24),
                    paddingVertical: getResponsiveSpacing(6, 8, 10, 12),
                    borderRadius: getResponsiveBorderRadius("round"),
                    borderWidth: 4,
                    borderColor: "white",
                  }}
                  onPress={handleUpload}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      getResponsiveTextStyle("button"),
                      { color: "white" },
                    ]}
                  >
                    Upload
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: "black",
                    paddingHorizontal: getResponsiveSpacing(12, 16, 20, 24),
                    paddingVertical: getResponsiveSpacing(6, 8, 10, 12),
                    borderRadius: getResponsiveBorderRadius("round"),
                    borderWidth: 4,
                    borderColor: "white",
                  }}
                  onPress={handleGoLive}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      getResponsiveTextStyle("button"),
                      { color: "white" },
                    ]}
                  >
                    Go Live
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Bottom Navigation Bar */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: getBottomNavHeight(),
          backgroundColor: "white",
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "center",
          ...getResponsiveShadow(),
          zIndex: 10,
        }}
      >
        {/* First half of tabs */}
        {Object.entries(tabConfig)
          .slice(0, 2)
          .map(([tab, { IconComponent, name, label }]) => {
            const isActive = selectedTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={fastPress(() => handleTabPress(tab), {
                  key: `tab_${tab}`,
                  priority: "high",
                })}
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 48,
                  minHeight: 48,
                }}
                activeOpacity={0.7}
              >
                <IconComponent
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
              </TouchableOpacity>
            );
          })}

        {/* Second half of tabs */}
        {Object.entries(tabConfig)
          .slice(2)
          .map(([tab, { IconComponent, name, label }]) => {
            const isActive = selectedTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={fastPress(() => handleTabPress(tab), {
                  key: `tab_${tab}`,
                  priority: "high",
                })}
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 48,
                  minHeight: 48,
                }}
                activeOpacity={0.7}
              >
                <IconComponent
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
              </TouchableOpacity>
            );
          })}
      </View>

      {/* Floating Action Button - Positioned at middle of Community and Library tabs */}
      <View
        style={{
          position: "absolute",
          bottom: getBottomNavHeight() - getResponsiveSpacing(40, 44, 48, 52),
          left: "50%",
          transform: [{ translateX: -getFabSize().size / 2 }],
          backgroundColor: "white",
          padding: getResponsiveSpacing(2, 3, 4, 5),
          borderRadius: getResponsiveBorderRadius("round"),
          ...getResponsiveShadow(),
          zIndex: 100,
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
          <AntDesign
            name={showActions ? "close" : "plus"}
            size={getFabSize().iconSize}
            color="#256E63"
          />
        </TouchableOpacity>
      </View>
    </>
  );
}
