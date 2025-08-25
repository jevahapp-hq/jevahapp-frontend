// import React, { useState } from "react";
// import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
// import { BlurView } from "expo-blur";
// import { router } from "expo-router";
// import Upload from "../categories/upload";
// import {
//   AntDesign,
//   MaterialCommunityIcons,
//   Ionicons,
// } from "@expo/vector-icons";

// // Bottom tab config
// interface BottomNavProps {
//   selectedTab: string;
//   setSelectedTab: (tab: string) => void;
// }

// const tabConfig: Record<
//   string,
//   { IconComponent: React.ComponentType<any>; name: string; label: string }
// > = {
//   Home: { IconComponent: AntDesign, name: "home", label: "Home" },
//   Community: {
//     IconComponent: MaterialCommunityIcons,
//     name: "account-group-outline",
//     label: "Community",
//   },
//   Library: {
//     IconComponent: Ionicons,
//     name: "play-circle-outline",
//     label: "Library",
//   },
//   Account: {
//     IconComponent: Ionicons,
//     name: "person-outline",
//     label: "Account",
//   },
// };

// export default function BottomNav({
//   selectedTab,
//   setSelectedTab,
// }: BottomNavProps) {
//   const [showActions, setShowActions] = useState(false);
//   const [showUploadScreen, setShowUploadScreen] = useState(false);

//   const handleFabToggle = () => {
//     setShowActions(!showActions);
//   };

//   const handleUpload = () => {
//     setShowActions(false);
//     setTimeout(() => {
//       router.push("/categories/upload");
//     }, 300);
//   };

//   const handleGoLive = () => {
//     setShowActions(false);
//     alert("Go Live clicked!");
//   };

//   return (
//     <>
//       {/* Upload Overlay */}
//       {showUploadScreen && (
//         <View className="absolute top-0 left-0 right-0 bottom-0 z-50">
//           <Upload onClose={() => setShowUploadScreen(false)} />
//         </View>
//       )}

//       {/* Background Blur */}
//       {showActions && Platform.OS !== "web" && (
//         <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
//       )}

//       {/* FAB Action Buttons */}
//       {showActions && (
//         <View className="absolute bottom-24 w-[220px] ml-20 flex-row justify-center items-center z-20 mb-12">
//           <View className="rounded-2xl overflow-hidden w-full h-[70px]">
//             {Platform.OS !== "web" ? (
//               <BlurView
//                 intensity={80}
//                 tint="light"
//                 className="flex-row w-full h-full items-center justify-center gap-4 bg-white/20"
//               >
//                 <TouchableOpacity
//                   className="bg-[#256E63] px-4 py-2 rounded-full border-4 border-white"
//                   onPress={handleUpload}
//                 >
//                   <Text className="text-white font-medium">Upload</Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity
//                   className="bg-black px-4 py-2 rounded-full border-4 border-white"
//                   onPress={handleGoLive}
//                 >
//                   <Text className="text-white font-medium">Go Live</Text>
//                 </TouchableOpacity>
//               </BlurView>
//             ) : (
//               <View className="flex-row w-full h-full items-center justify-center gap-4 bg-white/70 px-2 rounded-2xl">
//                 <TouchableOpacity
//                   className="bg-[#256E63] px-4 py-2 rounded-full border-4 border-white"
//                   onPress={handleUpload}
//                 >
//                   <Text className="text-white font-medium">Upload</Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity
//                   className="bg-black px-4 py-2 rounded-full border-4 border-white"
//                   onPress={handleGoLive}
//                 >
//                   <Text className="text-white font-medium">Go Live</Text>
//                 </TouchableOpacity>
//               </View>
//             )}
//           </View>
//         </View>
//       )}

//       {/* Bottom Navigation Bar */}
//       <View className="absolute bottom-0 left-0 right-0 h-20 bg-white flex-row justify-around items-center shadow-lg z-10 mb-14">
//         {/* First half of tabs */}
//         {Object.entries(tabConfig)
//           .slice(0, 2)
//           .map(([tab, { IconComponent, name, label }]) => {
//             const isActive = selectedTab === tab;
//             return (
//               <TouchableOpacity
//                 key={tab}
//                 onPress={() => setSelectedTab(tab)}
//                 className="items-center justify-center"
//               >
//                 <IconComponent
//                   name={name}
//                   size={24}
//                   color={isActive ? "#256E63" : "#000"}
//                 />
//                 <Text
//                   className={`text-xs mt-1 ${
//                     isActive ? "text-[#256E63]" : "text-black"
//                   }`}
//                 >
//                   {label}
//                 </Text>
//               </TouchableOpacity>
//             );
//           })}

//         {/* Floating Action Button */}
//         <View className="absolute -top-6 bg-white p-1 rounded-full shadow-md">
//           <TouchableOpacity
//             className="w-12 h-12 rounded-full bg-white items-center justify-center"
//             onPress={handleFabToggle}
//           >
//             <AntDesign
//               name={showActions ? "close" : "plus"}
//               size={18}
//               color="#256E63"
//             />
//           </TouchableOpacity>
//         </View>

//         {/* Second half of tabs */}
//         {Object.entries(tabConfig)
//           .slice(2)
//           .map(([tab, { IconComponent, name, label }]) => {
//             const isActive = selectedTab === tab;
//             return (
//               <TouchableOpacity
//                 key={tab}
//                 onPress={() => setSelectedTab(tab)}
//                 className="items-center justify-center"
//               >
//                 <IconComponent
//                   name={name}
//                   size={24}
//                   color={isActive ? "#256E63" : "#000"}
//                 />
//                 <Text
//                   className={`text-xs mt-1 ${
//                     isActive ? "text-[#256E63]" : "text-black"
//                   }`}
//                 >
//                   {label}
//                 </Text>
//               </TouchableOpacity>
//             );
//           })}
//       </View>
//     </>
//   );
// }
















import {
    AntDesign,
    Ionicons,
    MaterialCommunityIcons,
} from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    Platform,
    Text,
    TouchableOpacity,
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
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import { useMediaStore } from "../store/useUploadStore";

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

export default function BottomNav({
  selectedTab,
  setSelectedTab,
}: BottomNavProps) {
  const [showActions, setShowActions] = useState(false);

  const handleFabToggle = () => {
    console.log('🔄 FAB clicked! Current showActions:', showActions);
    console.log('🔄 Will set showActions to:', !showActions);
    setShowActions(!showActions);
  };

  const handleUpload = () => {
    useMediaStore.getState().stopAudioFn?.(); // Stop any active audio
    setShowActions(false);
    setTimeout(() => {
      router.push("/categories/upload");
    }, 300);
  };

  // const handleGoLive = () => {
  //   setShowActions(false);
  //   alert("/goLlive/AllowPermissionsScreen");
  // };

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
                <TouchableOpacity
                  style={{
                    backgroundColor: '#256E63',
                    paddingHorizontal: getResponsiveSpacing(12, 16, 20, 24),
                    paddingVertical: getResponsiveSpacing(6, 8, 10, 12),
                    borderRadius: getResponsiveBorderRadius('round'),
                    borderWidth: 4,
                    borderColor: 'white',
                  }}
                  onPress={handleUpload}
                >
                  <Text style={[
                    getResponsiveTextStyle('button'),
                    { color: 'white' }
                  ]}>
                    Upload
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: 'black',
                    paddingHorizontal: getResponsiveSpacing(12, 16, 20, 24),
                    paddingVertical: getResponsiveSpacing(6, 8, 10, 12),
                    borderRadius: getResponsiveBorderRadius('round'),
                    borderWidth: 4,
                    borderColor: 'white',
                  }}
                  onPress={() => {
                    useMediaStore.getState().stopAudioFn?.();
                    setShowActions(false);
                    setTimeout(() => {
                      router.push("/goLlive/AllowPermissionsScreen");
                    }, 300);
                  }}
                >
                  <Text style={[
                    getResponsiveTextStyle('button'),
                    { color: 'white' }
                  ]}>
                    Go Live
                  </Text>
                </TouchableOpacity>
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
                <TouchableOpacity
                  style={{
                    backgroundColor: '#256E63',
                    paddingHorizontal: getResponsiveSpacing(12, 16, 20, 24),
                    paddingVertical: getResponsiveSpacing(6, 8, 10, 12),
                    borderRadius: getResponsiveBorderRadius('round'),
                    borderWidth: 4,
                    borderColor: 'white',
                  }}
                  onPress={handleUpload}
                >
                  <Text style={[
                    getResponsiveTextStyle('button'),
                    { color: 'white' }
                  ]}>
                    Upload
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: 'black',
                    paddingHorizontal: getResponsiveSpacing(12, 16, 20, 24),
                    paddingVertical: getResponsiveSpacing(6, 8, 10, 12),
                    borderRadius: getResponsiveBorderRadius('round'),
                    borderWidth: 4,
                    borderColor: 'white',
                  }}
                  onPress={() => {
                    useMediaStore.getState().stopAudioFn?.();
                    setShowActions(false);
                    setTimeout(() => {
                      router.push("/goLlive/AllowPermissionsScreen");
                    }, 300);
                  }}
                >
                  <Text style={[
                    getResponsiveTextStyle('button'),
                    { color: 'white' }
                  ]}>
                    Go Live
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Bottom Navigation Bar */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: getBottomNavHeight(),
        backgroundColor: 'white',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        ...getResponsiveShadow(),
        zIndex: 10,
      }}>
        {/* First half of tabs */}
        {Object.entries(tabConfig)
          .slice(0, 2)
          .map(([tab, { IconComponent, name, label }]) => {
            const isActive = selectedTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => {
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
                  setSelectedTab(tab);
                }}
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
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
                onPress={() => {
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
                  setSelectedTab(tab);
                }}
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
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
              </TouchableOpacity>
            );
          })}
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
        <TouchableOpacity
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
          onPress={handleFabToggle}
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

