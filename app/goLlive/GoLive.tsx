// // // components/GoLiveScreen.tsx
// // import React, { useState } from 'react';
// // import {
// //   View,
// //   Text,
// //   TouchableOpacity,
// //   ScrollView,
// //   Image,
// // } from 'react-native';
// // import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';

// // const icons = [
// //   { name: 'refresh-ccw', action: 'flip' },
// //   { name: 'music', action: 'music' },
// //   { name: 'clock', action: 'timer' },
// //   { name: 'zap-off', action: 'flash' },
// //   { name: 'mic-off', action: 'mute' },
// // ];

// // const durations = ['10m', '5m', '2m', '60s', '30s'];

// // const filters = [
// //   { id: 1, image: 'https://randomuser.me/api/portraits/women/1.jpg' },
// //   { id: 2, image: 'https://randomuser.me/api/portraits/men/2.jpg' },
// //   { id: 3, image: 'https://randomuser.me/api/portraits/women/3.jpg' },
// //   { id: 4, image: 'https://randomuser.me/api/portraits/men/4.jpg' },
// //   { id: 5, image: 'https://randomuser.me/api/portraits/women/5.jpg' },
// // ];

// // const GoLiveScreen = () => {
// //   const [selectedDuration, setSelectedDuration] = useState('60s');

// //   const handleIconClick = (action: string) => {
// //     console.log(`Icon pressed: ${action}`);
// //     // Add toggle logic here for real interaction
// //   };

// //   return (
// //     <View className="flex-1 bg-[#0D1A2D] pt-10 px-4 relative">
// //       {/* Header */}
// //       <View className="flex-row justify-between items-center mb-6">
// //         <View className="bg-red-600 px-2 py-1 rounded-md flex-row items-center space-x-1">
// //           <View className="w-2 h-2 rounded-full bg-white" />
// //           <Text className="text-white text-xs font-medium">LIVE</Text>
// //         </View>
// //         <TouchableOpacity>
// //           <Feather name="x" size={24} color="#fff" />
// //         </TouchableOpacity>
// //       </View>

// //       {/* Side Menu Icons */}
// //       <View className="absolute right-4 top-24 space-y-6">
// //         {icons.map((icon, index) => (
// //           <TouchableOpacity
// //             key={index}
// //             onPress={() => handleIconClick(icon.action)}
// //             className="p-2 rounded-full bg-white/10"
// //           >
// //             <Feather name={icon.name as any} size={24} color="white" />
// //           </TouchableOpacity>
// //         ))}
// //       </View>

// //       {/* Bottom Controls */}
// //       <View className="absolute bottom-8 w-full items-center px-4">
// //         {/* Duration Selection */}
// //         <View className="flex-row space-x-4 mb-4">
// //           {durations.map((time, idx) => (
// //             <TouchableOpacity
// //               key={idx}
// //               onPress={() => setSelectedDuration(time)}
// //             >
// //               <Text
// //                 className={`text-xs font-medium ${
// //                   selectedDuration === time ? 'text-white' : 'text-gray-400'
// //                 }`}
// //               >
// //                 {time}
// //               </Text>
// //             </TouchableOpacity>
// //           ))}
// //         </View>

// //         {/* Record Button & Filters */}
// //         <View className="flex-row items-center space-x-4 mb-4">
// //           <View className="w-20 h-20 rounded-full border-4 border-white bg-white/20" />
// //           <ScrollView horizontal showsHorizontalScrollIndicator={false}>
// //             {filters.map((filter) => (
// //               <TouchableOpacity key={filter.id} className="mx-2">
// //                 <Image
// //                   source={{ uri: filter.image }}
// //                   className="w-12 h-12 rounded-full border-2 border-white"
// //                 />
// //               </TouchableOpacity>
// //             ))}
// //           </ScrollView>
// //         </View>

// //         {/* Action Buttons */}
// //         <View className="flex-row space-x-4">
// //           <TouchableOpacity className="bg-white px-4 py-2 rounded-md">
// //             <Text className="text-black font-semibold text-sm">Go Live</Text>
// //           </TouchableOpacity>
// //           <TouchableOpacity>
// //             <Text className="text-white font-medium text-sm">Upload</Text>
// //           </TouchableOpacity>
// //         </View>
// //       </View>
// //     </View>
// //   );
// // };

// // export default GoLiveScreen;

// // components/GoLiveScreen.tsx
// import React, { useState } from "react";
// import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
// import { Feather } from "@expo/vector-icons";

// const icons = [
//   { name: "refresh-ccw", action: "flip" },
//   { name: "music", action: "music" },
//   { name: "clock", action: "timer" },
//   { name: "zap-off", action: "flash" },
//   { name: "mic-off", action: "mute" },
// ];

// const durations = ["10m", "5m", "2m", "60s", "30s"];

// // 👇 Using local default avatar image
// const filters = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];

// const defaultImage = require("../../assets/images/_Avatar Images (4).png");

// const GoLiveScreen = () => {
//   const [selectedDuration, setSelectedDuration] = useState("60s");

//   const handleIconClick = (action: string) => {
//     console.log(`Icon pressed: ${action}`);
//   };

//   return (
//     <View className="flex-1 bg-[#0D1A2D] pt-10 px-4 relative">
//       {/* Header */}

//       <View className="flex-row justify-between items-center mb-6">
//         <View className="absolute top-3 left-4 bg-red-600 px-2 py-1 rounded-md flex-row items-center">
//           <Text className="text-white text-xs font-bold">LIVE</Text>
//           <Image
//             source={require("../../assets/images/Vector.png")}
//             className="h-[10px] w-[10px] ml-2"
//           />
//         </View>
//         <TouchableOpacity className="ml-[290px] mt-2">
//           <Feather name="x" size={24} color="#fff" />
//         </TouchableOpacity>
//       </View>

//       {/* Side Menu Icons */}
//       <View className="absolute right-4 top-24 space-y-6 gap-3">
//         {icons.map((icon, index) => (
//           <TouchableOpacity
//             key={index}
//             onPress={() => handleIconClick(icon.action)}
//             className="p-2 rounded-full bg-white/10 mr-3"
//           >
//             <Feather name={icon.name as any} size={22} color="white" />
//           </TouchableOpacity>
//         ))}
//       </View>

//       {/* Bottom Controls */}
//       <View className="absolute bottom-8 w-full items-center px-4 mb-9">
//         {/* Duration Selection */}
//         <View className="flex-row space-x-4 mb-6 gap-2">
//           {durations.map((time, idx) => (
//             <TouchableOpacity
//               key={idx}
//               onPress={() => setSelectedDuration(time)}
//             >
//               <Text
//                 className={`text-[12px] font-rubik-semibold ${
//                   selectedDuration === time ? "text-white" : "text-gray-400"
//                 }`}
//               >
//                 {time}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </View>

//         {/* Record Button & Filters */}
//         <View className="flex-row items-center space-x-4 mb-9">
//           <View className="w-20 h-20 rounded-full border-4 border-white bg-white/20" />
//           <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//             {filters.map((filter) => (
//               <TouchableOpacity key={filter.id} className="mx-2">
//                 <Image
//                   source={defaultImage}
//                   className="w-12 h-12 rounded-full border-2 border-white"
//                 />
//               </TouchableOpacity>
//             ))}
//           </ScrollView>
//         </View>

//         {/* Action Buttons */}
//         <View className="flex-row items-center mb-6">
//           <TouchableOpacity className="bg-white px-4 py-2 rounded-md">
//             <Text className="text-black font-semibold text-sm ">Go Live</Text>
//           </TouchableOpacity>
//           <TouchableOpacity>
//             <Text className="text-white font-medium text-sm ml-4">Upload</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </View>
//   );
// };

// export default GoLiveScreen;





import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
    Dimensions,
    FlatList,
    Image,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    getIconSize,
    getResponsiveBorderRadius,
    getResponsiveSize,
    getResponsiveSpacing,
    getResponsiveTextStyle
} from "../../utils/responsive";

const icons = [
  { name: "refresh-ccw", action: "flip" },
  { name: "music", action: "music" },
  { name: "clock", action: "timer" },
  { name: "zap-off", action: "flash" },
  { name: "mic-off", action: "mute" },
];

const durations = ["10m", "5m", "2m", "60s", "30s"];




const filters = [
  { id: 1, image: require("../../assets/images/_Avatar Images (2).png") },
  { id: 2, image: require("../../assets/images/_Avatar Images (3).png") },
  { id: 3, image: require("../../assets/images/_Avatar Images (4).png") },
  { id: 4, image: require("../../assets/images/_Avatar Images (10).png") },
  { id: 5, image: require("../../assets/images/_Avatar Images (9).png") },
];

const SCREEN_WIDTH = Dimensions.get("window").width;


const GoLiveScreen = () => {
  const [selectedDuration, setSelectedDuration] = useState("60s");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const navigation = useNavigation();

  const handleIconClick = (action: string) => {
    console.log(`Icon pressed: ${action}`);
  };

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.back();
    }
  };

  const handleCancelPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.back();
    }
  };

  const handleSelectFilter = (index: number) => {
    setSelectedIndex(index);
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
      viewPosition: 0.5,
    });
  };

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#0D1A2D',
      paddingTop: getResponsiveSpacing(40, 44, 48, 52),
      paddingHorizontal: getResponsiveSpacing(16, 20, 24, 32),
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: getResponsiveSpacing(20, 24, 28, 32),
        paddingHorizontal: getResponsiveSpacing(16, 20, 24, 32),
      }}>
        {/* LIVE Badge */}
        <View style={{
          backgroundColor: '#DC2626',
          paddingHorizontal: getResponsiveSpacing(8, 10, 12, 16),
          paddingVertical: getResponsiveSpacing(4, 6, 8, 10),
          borderRadius: getResponsiveBorderRadius('medium'),
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <Text style={[
            getResponsiveTextStyle('caption'),
            {
              color: 'white',
              fontWeight: 'bold',
            }
          ]}>
            LIVE
          </Text>
          <Image
            source={require("../../assets/images/Vector.png")}
            style={{
              height: getResponsiveSize(8, 10, 12, 14),
              width: getResponsiveSize(8, 10, 12, 14),
              marginLeft: getResponsiveSpacing(6, 8, 10, 12),
            }}
          />
        </View>
        
        {/* Cancel Button */}
        <TouchableOpacity 
          onPress={handleCancelPress}
          activeOpacity={0.7}
          style={{
            padding: getResponsiveSpacing(4, 6, 8, 10),
          }}
        >
          <Feather 
            name="x" 
            size={getIconSize('medium')} 
            color="#fff" 
          />
        </TouchableOpacity>
      </View>

      {/* Side Menu Icons */}
      <View style={{
        position: 'absolute',
        right: getResponsiveSpacing(16, 20, 24, 32),
        top: getResponsiveSpacing(96, 100, 104, 108),
        gap: getResponsiveSpacing(20, 24, 28, 32),
      }}>
        {icons.map((icon, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleIconClick(icon.action)}
            style={{
              padding: getResponsiveSpacing(8, 10, 12, 14),
              borderRadius: getResponsiveBorderRadius('round'),
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              marginRight: getResponsiveSpacing(8, 10, 12, 16),
            }}
            activeOpacity={0.7}
          >
            <Feather 
              name={icon.name as any} 
              size={getIconSize('medium')} 
              color="white" 
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Bottom Controls */}
      <View style={{
        position: 'absolute',
        bottom: getResponsiveSpacing(32, 36, 40, 44),
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: getResponsiveSpacing(16, 20, 24, 32),
      }}>
        {/* Duration Selection */}
        <View style={{
          flexDirection: 'row',
          marginBottom: getResponsiveSpacing(20, 24, 28, 32),
          gap: getResponsiveSpacing(8, 10, 12, 16),
        }}>
          {durations.map((time, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => setSelectedDuration(time)}
              activeOpacity={0.7}
            >
              <Text style={[
                getResponsiveTextStyle('caption'),
                {
                  color: selectedDuration === time ? "white" : "#9CA3AF",
                  fontWeight: '600',
                }
              ]}>
                {time}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Big Center Circle with Selected Filter */}
        <View style={{
          width: getResponsiveSize(112, 120, 128, 136),
          height: getResponsiveSize(112, 120, 128, 136),
          borderRadius: getResponsiveBorderRadius('round'),
          borderWidth: 4,
          borderColor: 'white',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          marginBottom: getResponsiveSpacing(32, 36, 40, 44),
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Image
            source={filters[selectedIndex].image}
            style={{
              width: getResponsiveSize(96, 104, 112, 120),
              height: getResponsiveSize(96, 104, 112, 120),
              borderRadius: getResponsiveBorderRadius('round'),
            }}
          />
        </View>

        {/* Filter Thumbnails Scroll */}
        <FlatList
          ref={flatListRef}
          data={filters}
          horizontal
          keyExtractor={(item) => item.id.toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: (SCREEN_WIDTH - getResponsiveSize(48, 52, 56, 60) * 3) / 2,
          }}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={() => handleSelectFilter(index)}
              style={{
                marginHorizontal: getResponsiveSpacing(6, 8, 10, 12),
                alignItems: 'center',
                marginBottom: getResponsiveSpacing(32, 36, 40, 44),
              }}
              activeOpacity={0.7}
            >
              <Image
                source={item.image}
                style={{
                  width: getResponsiveSize(48, 52, 56, 60),
                  height: getResponsiveSize(48, 52, 56, 60),
                  borderRadius: getResponsiveBorderRadius('round'),
                  borderWidth: 2,
                  borderColor: selectedIndex === index ? "#FBBF24" : "white",
                }}
              />
            </TouchableOpacity>
          )}
        />

        {/* Action Buttons */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: getResponsiveSpacing(20, 24, 28, 32),
        }}>
          <TouchableOpacity 
            style={{
              backgroundColor: 'white',
              paddingHorizontal: getResponsiveSpacing(16, 20, 24, 28),
              paddingVertical: getResponsiveSpacing(8, 10, 12, 14),
              borderRadius: getResponsiveBorderRadius('medium'),
            }}
            activeOpacity={0.7}
          >
            <Text style={[
              getResponsiveTextStyle('button'),
              {
                color: 'black',
                fontWeight: '600',
              }
            ]}>
              Go Live
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              marginLeft: getResponsiveSpacing(16, 20, 24, 28),
            }}
            activeOpacity={0.7}
          >
            <Text style={[
              getResponsiveTextStyle('button'),
              {
                color: 'white',
                fontWeight: '500',
              }
            ]}>
              Upload
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default GoLiveScreen;

