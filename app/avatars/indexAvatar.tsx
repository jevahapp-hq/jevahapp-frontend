import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
    Image,
    ImageSourcePropType,
    Animated as RNAnimated,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import AuthHeader from "../components/AuthHeader";
import FailureCard from "../components/failureCard";
import ProgressBar from "../components/ProgressBar";
import SuccessfulCard from "../components/successfulCard";
import CartoonAvatar from "./CatoonAvatar";
import CuteAvatar from "./CuteAvatars";
import Images from "./ImagesAvatars";
import SlideUpSetProfileImageModal from "./SetProfileImageModal";

import { Asset } from "expo-asset";
import { apiAxios } from "../utils/api";
import { uploadAvatar } from "../utils/api/client/avatarUpload";
import { persistUserAvatar } from "../utils/persistUserAvatar";
import TokenUtils from "../utils/tokenUtils";

const avatarTabs = ["Cartoon", "Cute Avatars", "Images"];

const AvatarSelection = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ from?: string | string[] }>();
  const fromParam = Array.isArray(params.from) ? params.from[0] : params.from;
  const fromProfile = fromParam === "profile" || fromParam === "edit";
  const [activeTab, setActiveTab] = useState("Cartoon");
  const [selectedAvatar, setSelectedAvatar] = useState<
    ImageSourcePropType | string | null
  >(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [confirmedAvatar, setConfirmedAvatar] = useState<
    ImageSourcePropType | string | null
  >(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const dropdownAnim = useRef(new RNAnimated.Value(-200)).current;
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFailure, setShowFailure] = useState(false);
  const [failureText, setFailureText] = useState("Please select an avatar");
  const [isUploading, setIsUploading] = useState(false);

  const imageSize = 80;
  const FLOOR_Y = 280;
  const FINAL_REST_Y = 70;

  const chosenAvatar = selectedAvatar || uploadedImage;

  const handleUseAvatar = () => {
    if (!chosenAvatar) {
      triggerBounceDrop("failure", "Please select an avatar");
      return;
    }
    if (!selectedAvatar && uploadedImage) {
      setSelectedAvatar(uploadedImage);
    }
    setIsModalVisible(true);
  };

  const triggerBounceDrop = (type: "success" | "failure", message?: string) => {
    setShowSuccess(type === "success");
    setShowFailure(type === "failure");
    if (type === "failure") {
      setFailureText(message || "Please select an avatar");
    }

    RNAnimated.timing(dropdownAnim, {
      toValue: FLOOR_Y,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      RNAnimated.spring(dropdownAnim, {
        toValue: FINAL_REST_Y,
        useNativeDriver: true,
        bounciness: 10,
        speed: 5,
      }).start(() => {
        if (type === "success") {
          setTimeout(() => {
            if (fromProfile) {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/screens/AccountScreen");
              }
            } else {
              router.replace("/categories/HomeScreen");
            }
          }, 600);
        }
      });
    });
  };

  const hideDropdown = () => {
    RNAnimated.spring(dropdownAnim, {
      toValue: -200,
      useNativeDriver: true,
      speed: 10,
      bounciness: 6,
    }).start(() => {
      setShowSuccess(false);
      setShowFailure(false);
    });
  };

  // const handleConfirm = () => {
  //   setIsModalVisible(false);
  //   if (selectedAvatar) {
  //     setConfirmedAvatar(selectedAvatar);
  //     triggerBounceDrop("success");
  //   } else {
  //     triggerBounceDrop("failure");
  //   }
  // };

  const handleConfirm = async () => {
    setIsModalVisible(false);
    setIsUploading(true);

    const avatarToUpload = selectedAvatar || uploadedImage;
    if (!avatarToUpload) {
      console.log("❌ No avatar selected");
      setIsUploading(false);
      triggerBounceDrop("failure", "Please select an avatar");
      return;
    }

    try {
      const token = await TokenUtils.getAuthToken();
      if (!token) {
        console.log("❌ No user token found");
        triggerBounceDrop("failure", "Please sign in again");
        return;
      }

      console.log("✅ Token found, processing avatar...");

      let fileUri: string;

      if (typeof avatarToUpload === "string") {
        fileUri = avatarToUpload;
        console.log("📁 Using string URI:", fileUri);
      } else {
        const assetModule = avatarToUpload as number;
        console.log("📁 Processing asset module:", assetModule);

        const asset = Asset.fromModule(assetModule);
        await asset.downloadAsync();
        fileUri = asset.localUri || asset.uri;

        if (!fileUri) {
          throw new Error("Failed to resolve local file URI from asset");
        }
        console.log("📁 Asset URI resolved:", fileUri);
      }

      const { avatarUrl } = await uploadAvatar(fileUri);
      console.log("✅ Avatar uploaded successfully:", avatarUrl);

      setConfirmedAvatar(avatarUrl);
      await persistUserAvatar(queryClient, avatarUrl);

      try {
        await apiAxios.post("/api/auth/complete-profile", {
          avatar: avatarUrl,
        });
      } catch (profileError) {
        console.warn("⚠️ complete-profile after avatar failed:", profileError);
      }

      triggerBounceDrop("success");
    } catch (error: any) {
      console.error("❌ Avatar submission failed:", error);

      let errorMessage = "Avatar upload failed";
      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        errorMessage = "Request timed out. Please try again.";
      } else if (error.response?.status === 401) {
        errorMessage = "Please sign in again";
      } else if (error.response?.status === 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      console.error("❌ Error details:", errorMessage);
      triggerBounceDrop("failure", errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const renderAvatarRow = (
    data: { id: string; src: ImageSourcePropType | string }[]
  ) => (
    <View className="flex-row flex-wrap justify-center gap-5 mt-4">
      {data.map((item) => {
        const source =
          typeof item.src === "string" ? { uri: item.src } : item.src;

        const isSelected =
          selectedAvatar &&
          ((typeof selectedAvatar === "string" &&
            selectedAvatar === item.src) ||
            selectedAvatar === item.src);

        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => setSelectedAvatar(item.src)}
          >
            <Image
              source={source}
              style={{
                width: imageSize,
                height: imageSize,
                borderRadius: 16,
                borderWidth: isSelected ? 4 : 0,
                borderColor: isSelected ? "#A3A1FE" : "transparent",
              }}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View className="flex-1 items-center bg-[#FCFCFD] w-full relative mt-6">
      

      <View className="w-[370px]">
        <AuthHeader title={fromProfile ? "Edit Avatar" : "Profile Setup"} />
      </View>

      {/* Success / Failure Card */}
      <RNAnimated.View
        className="absolute w-full items-center z-10 px-4"
        style={{ transform: [{ translateY: dropdownAnim }] }}
      >
        {showSuccess && <SuccessfulCard text="Avatar set successfully" />}
        {showFailure && (
          <FailureCard text={failureText} onClose={hideDropdown} />
        )}
      </RNAnimated.View>

      <View className="w-[333px] mt-3">
        {!fromProfile && <ProgressBar currentStep={4} totalSteps={4} />}
        <Text className="text-[#1D2939] font-semibold mt-3">
          {fromProfile
            ? "Update your photo or pick a new avatar"
            : "Let's make this feel like home"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: 40,
          alignItems: "center",
          width: "100%",
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[32px] font-jakarta-bold text-[#1D2939] w-[333px] mt-6">
          Pick an Avatar
        </Text>

        {/* Tabs */}
        <View className="flex-row mt-6 bg-[#F2F4F7] px-2 py-1 rounded-[8px] w-[300px] justify-center h-[40px]">
          {avatarTabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              className={`flex-1 items-center rounded-[8px] h-[24px] mt-1 ${
                activeTab === tab ? "bg-[#818BAD]" : ""
              }`}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                className={`text-[12px] font-jakarta-medium mt-1 ${
                  activeTab === tab ? "text-white" : "text-[#667085]"
                }`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Avatar Section */}
        <View className="mt-6 bg-[#F9FAFB] items-center justify-center rounded-xl px-6 py-4 w-[333px]">
          {activeTab === "Cartoon" && (
            <CartoonAvatar renderAvatarRow={renderAvatarRow} />
          )}
          {activeTab === "Cute Avatars" && (
            <CuteAvatar renderAvatarRow={renderAvatarRow} />
          )}
          {activeTab === "Images" && (
            <Images
              renderAvatarRow={renderAvatarRow}
              uploadedImage={uploadedImage}
              setUploadedImage={(uri: string) => {
                setUploadedImage(uri);
                setSelectedAvatar(uri);
              }}
              onUseUploadedImage={() => {
                if (uploadedImage) setSelectedAvatar(uploadedImage);
                setIsModalVisible(true);
              }}
            />
          )}
        </View>
      </ScrollView>

      {/* Buttons */}
      <View className="mb-20 items-center">
        <TouchableOpacity
          className={`py-3 rounded-full items-center w-[325px] ${
            isUploading ? "bg-gray-400" : "bg-black"
          }`}
          onPress={handleUseAvatar}
          disabled={isUploading}
        >
          <Text className="text-white font-semibold">
            {isUploading ? "Uploading..." : "Use Avatar"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="mt-6 items-center"
          onPress={() =>
            fromProfile
              ? router.back()
              : router.push("/categories/HomeScreen")
          }
        >
          <Text className="text-[#344054] text-[14px] font-jakarta-medium">
            {fromProfile ? "Cancel" : "Skip this"}
          </Text>
        </TouchableOpacity>
      </View>

      <SlideUpSetProfileImageModal
        isVisible={isModalVisible}
        onConfirm={handleConfirm}
        onCancel={() => setIsModalVisible(false)}
        isLoading={isUploading}
      />
    </View>
  );
};

export default AvatarSelection;














// import {
//   Image,
//   ImageSourcePropType,
//   ScrollView,
//   Text,
//   TouchableOpacity,
//   View,
//   Animated as RNAnimated,
//   ToastAndroid,
// } from "react-native";
// import { useRouter } from "expo-router";
// import AuthHeader from "../components/AuthHeader";
// import ProgressBar from "../components/ProgressBar";
// import CartoonAvatar from "./CatoonAvatar";
// import CuteAvatar from "./CuteAvatars";
// import Images from "./ImagesAvatars";
// import SlideUpSetProfileImageModal from "./SetProfileImageModal";
// import SuccessfulCard from "../components/successfulCard";
// import FailureCard from "../components/failureCard";
// import AsyncStorage from "@react-native-async-storage/async-storage";

// const avatarTabs = ["Cartoon", "Cute Avatars", "Images"];

// const AvatarSelection = () => {
//   const router = useRouter();
//   const [activeTab, setActiveTab] = useState("Cartoon");
//   const [selectedAvatar, setSelectedAvatar] = useState<ImageSourcePropType | string | null>(null);
//   const [uploadedImage, setUploadedImage] = useState<string | null>(null);
//   const [confirmedAvatar, setConfirmedAvatar] = useState<ImageSourcePropType | string | null>(null);
//   const [isModalVisible, setIsModalVisible] = useState(false);

//   const dropdownAnim = useRef(new RNAnimated.Value(-200)).current;
//   const [showSuccess, setShowSuccess] = useState(false);
//   const [showFailure, setShowFailure] = useState(false);

//   const imageSize = 80;
//   const FLOOR_Y = 280;
//   const FINAL_REST_Y = 70;

//   const handleUseAvatar = () => {
//     setIsModalVisible(true);
//   };

//   const triggerBounceDrop = (type: "success" | "failure") => {
//     setShowSuccess(type === "success");
//     setShowFailure(type === "failure");

//     RNAnimated.timing(dropdownAnim, {
//       toValue: FLOOR_Y,
//       duration: 600,
//       useNativeDriver: true,
//     }).start(() => {
//       RNAnimated.spring(dropdownAnim, {
//         toValue: FINAL_REST_Y,
//         useNativeDriver: true,
//         bounciness: 10,
//         speed: 5,
//       }).start(() => {
//         if (type === "success") {
//           setTimeout(() => {
//             router.replace("/Profile/profileSetUp");
//           }, 600);
//         }
//       });
//     });
//   };

//   const hideDropdown = () => {
//     RNAnimated.spring(dropdownAnim, {
//       toValue: -200,
//       useNativeDriver: true,
//       speed: 10,
//       bounciness: 6,
//     }).start(() => {
//       setShowSuccess(false);
//       setShowFailure(false);
//     });
//   };

//   const handleConfirm = async () => {
//     setIsModalVisible(false);

//     if (!selectedAvatar) {
//       triggerBounceDrop("failure");
//       return;
//     }

//     try {
//       const token = await AsyncStorage.getItem("token");
//       if (!token) {
//         ToastAndroid.show("No token found", ToastAndroid.SHORT);
//         return;
//       }

//       const avatarToSend =
//         typeof selectedAvatar === "string"
//           ? selectedAvatar
//           : Image.resolveAssetSource(selectedAvatar).uri;

//       const response = await fetch("http://192.168.43.62:4000/api/user/complete-profile", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({ avatar: avatarToSend }),
//       });

//       if (!response.ok) {
//         throw new Error("Avatar upload failed");
//       }

//       setConfirmedAvatar(selectedAvatar);
//       triggerBounceDrop("success");
//     } catch (error) {
//       console.error(error);
//       triggerBounceDrop("failure");
//     }
//   };

//   const renderAvatarRow = (
//     data: { id: string; src: ImageSourcePropType | string }[]
//   ) => (
//     <View className="flex-row flex-wrap justify-center gap-5 mt-4">
//       {data.map((item) => {
//         const source =
//           typeof item.src === "string" ? { uri: item.src } : item.src;

//         const isSelected =
//           selectedAvatar &&
//           ((typeof selectedAvatar === "string" &&
//             selectedAvatar === item.src) ||
//             selectedAvatar === item.src);

//         return (
//           <TouchableOpacity
//             key={item.id}
//             onPress={() => setSelectedAvatar(item.src)}
//           >
//             <Image
//               source={source}
//               style={{
//                 width: imageSize,
//                 height: imageSize,
//                 borderRadius: 16,
//                 borderWidth: isSelected ? 4 : 0,
//                 borderColor: isSelected ? "#A3A1FE" : "transparent",
//               }}
//             />
//           </TouchableOpacity>
//         );
//       })}
//     </View>
//   );

//   return (
//     <View className="flex-1 items-center bg-[#FCFCFD] w-full relative">
//       <AuthHeader title="Profile Setup" />

//       {/* Success / Failure Card */}
//       <RNAnimated.View
//         className="absolute w-full items-center z-10 px-4"
//         style={{ transform: [{ translateY: dropdownAnim }] }}
//       >
//         {showSuccess && <SuccessfulCard text="Avatar set successfully" />}
//         {showFailure && (
//           <FailureCard text="Please select an avatar" onClose={hideDropdown} />
//         )}
//       </RNAnimated.View>

//       <View className="w-[333px] mt-3">
//         <ProgressBar currentStep={4} totalSteps={7} />
//         <Text className="text-[#1D2939] font-semibold mt-3">
//           Let&apos;s make this feel like home
//         </Text>
//       </View>

//       <ScrollView
//         contentContainerStyle={{
//           paddingBottom: 40,
//           alignItems: "center",
//           width: "100%",
//         }}
//         showsVerticalScrollIndicator={false}
//       >
//         <Text className="text-[32px] font-jakarta-bold text-[#1D2939] w-[333px] mt-6">
//           Pick an Avatar
//         </Text>

//         {/* Tabs */}
//         <View className="flex-row mt-6 bg-[#F2F4F7] px-2 py-1 rounded-[8px] w-[300px] justify-center h-[40px]">
//           {avatarTabs.map((tab) => (
//             <TouchableOpacity
//               key={tab}
//               className={`flex-1 items-center rounded-[8px] h-[24px] mt-1 ${
//                 activeTab === tab ? "bg-[#818BAD]" : ""
//               }`}
//               onPress={() => setActiveTab(tab)}
//             >
//               <Text
//                 className={`text-[12px] font-jakarta-medium mt-1 ${
//                   activeTab === tab ? "text-white" : "text-[#667085]"
//                 }`}
//               >
//                 {tab}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </View>

//         {/* Avatar Section */}
//         <View className="mt-6 bg-[#F9FAFB] items-center justify-center rounded-xl px-6 py-4 w-[333px]">
//           {activeTab === "Cartoon" && (
//             <CartoonAvatar renderAvatarRow={renderAvatarRow} />
//           )}
//           {activeTab === "Cute Avatars" && (
//             <CuteAvatar renderAvatarRow={renderAvatarRow} />
//           )}
//           {activeTab === "Images" && (
//             <Images
//               renderAvatarRow={renderAvatarRow}
//               uploadedImage={uploadedImage}
//               setUploadedImage={(uri) => {
//                 setUploadedImage(uri);
//                 setSelectedAvatar(uri);
//               }}
//             />
//           )}
//         </View>
//       </ScrollView>

//       {/* Buttons */}
//       <View className="mb-20 items-center">
//         <TouchableOpacity
//           className="bg-black py-3 rounded-full items-center w-[325px]"
//           onPress={handleUseAvatar}
//         >
//           <Text className="text-white font-semibold">Use Avatar</Text>
//         </TouchableOpacity>
//         <TouchableOpacity className="mt-6 items-center">
//           <Text className="text-[#344054] text-[14px] font-jakarta-medium">
//             Skip this
//           </Text>
//         </TouchableOpacity>
//       </View>

//       <SlideUpSetProfileImageModal
//         isVisible={isModalVisible}
//         onConfirm={handleConfirm}
//         onCancel={() => setIsModalVisible(false)}
//       />
//     </View>
//   );
// };

// export default AvatarSelection;
