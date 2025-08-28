import { useRouter } from "expo-router";
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

import AsyncStorage from "@react-native-async-storage/async-storage"; // ✅ CORRECT
import axios from "axios";
import AuthHeader from "../components/AuthHeader";
import FailureCard from "../components/failureCard";
import ProgressBar from "../components/ProgressBar";
import SuccessfulCard from "../components/successfulCard";
import CartoonAvatar from "./CatoonAvatar";
import CuteAvatar from "./CuteAvatars";
import Images from "./ImagesAvatars";
import SlideUpSetProfileImageModal from "./SetProfileImageModal";

import { Asset } from "expo-asset";
import Constants from "expo-constants";

const avatarTabs = ["Cartoon", "Cute Avatars", "Images"];

const AvatarSelection = () => {
  const router = useRouter();
  const API_BASE_URL = Constants.expoConfig?.extra?.API_URL;
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
  const [isUploading, setIsUploading] = useState(false);

  const imageSize = 80;
  const FLOOR_Y = 280;
  const FINAL_REST_Y = 70;

  const handleUseAvatar = () => {
    setIsModalVisible(true);
  };

  const triggerBounceDrop = (type: "success" | "failure") => {
    setShowSuccess(type === "success");
    setShowFailure(type === "failure");

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
            router.replace("/categories/HomeScreen");
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

  const uploadAvatarToBackend = async (uri: string, token: string): Promise<string> => {
    try {
      const fileExtension = uri.split(".").pop()?.toLowerCase() || "jpg";
      const mimeType = `image/${
        fileExtension === "jpg" ? "jpeg" : fileExtension
      }`;

      const formData = new FormData();
      formData.append("avatar", {
        uri: uri,
        name: `avatar.${fileExtension}`,
        type: mimeType,
      } as any);

      console.log("📤 Uploading avatar to:", `${API_BASE_URL}/api/auth/avatar`);
      console.log("📤 FormData:", formData);

      // ✅ CORRECT ENDPOINT - matches your backend API documentation
      const res = await fetch(
        `${API_BASE_URL}/api/auth/avatar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            // Don't set Content-Type for FormData - let the browser set it
          },
          body: formData,
        }
      );

      console.log("📤 Upload response status:", res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ Upload failed:", errorText);
        
        // Handle specific error cases based on backend documentation
        if (res.status === 400) {
          throw new Error("Invalid image file. Please use JPEG, PNG, or GIF format.");
        } else if (res.status === 401) {
          throw new Error("Unauthorized. Please log in again.");
        } else if (res.status === 413) {
          throw new Error("File too large. Please choose a smaller image (max 5MB).");
        } else {
          throw new Error(`Upload failed: ${res.status} - ${errorText}`);
        }
      }

      const json = await res.json();
      console.log("📤 Upload response:", json);

      if (!json.success) {
        throw new Error(json.message || "Failed to upload avatar");
      }

      // ✅ Return the avatarUrl from the data object as per backend API
      return json.data.avatarUrl;
    } catch (error) {
      console.error("❌ Avatar upload error:", error);
      throw error;
    }
  };

  const handleConfirm = async () => {
    setIsModalVisible(false);
    setIsUploading(true);

    if (!selectedAvatar) {
      console.log("❌ No avatar selected");
      setIsUploading(false);
      triggerBounceDrop("failure");
      return;
    }

    try {
      // ✅ Use correct token key
      // Try multiple keys to maximize compatibility across flows
      let token = await AsyncStorage.getItem("userToken");
      if (!token) {
        token = await AsyncStorage.getItem("token");
      }
      if (!token) {
        token = await AsyncStorage.getItem("authToken");
      }
      if (!token) {
        console.log("❌ No user token found");
        triggerBounceDrop("failure");
        return;
      }

      console.log("✅ Token found, processing avatar...");

      let fileUri: string;

      if (typeof selectedAvatar === "string") {
        fileUri = selectedAvatar;
        console.log("📁 Using string URI:", fileUri);
      } else {
        // Ensure it's a static resource (require)
        const assetModule = selectedAvatar as number;
        console.log("📁 Processing asset module:", assetModule);

        const asset = Asset.fromModule(assetModule);
        await asset.downloadAsync();
        fileUri = asset.localUri || asset.uri;

        if (!fileUri) {
          throw new Error("Failed to resolve local file URI from asset");
        }
        console.log("📁 Asset URI resolved:", fileUri);
      }

      console.log("🚀 Starting avatar upload...");
      const avatarUrl = await uploadAvatarToBackend(fileUri, token);
      console.log("✅ Avatar uploaded successfully:", avatarUrl);
      
      setConfirmedAvatar(avatarUrl);

      // Update user profile with the new avatar URL
      console.log("🔄 Updating user profile...");
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/complete-profile`,
        { avatar: avatarUrl }, // ✅ Use 'avatar' field as per backend API
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("📤 Profile update response:", response.data);

      if (response.data.success) {
        setConfirmedAvatar(avatarUrl);
        console.log("✅ Profile updated successfully");
        
        // Store the updated avatar URL in AsyncStorage for consistency
        try {
          const userRaw = await AsyncStorage.getItem("user");
          if (userRaw) {
            const user = JSON.parse(userRaw);
            user.avatar = avatarUrl;
            await AsyncStorage.setItem("user", JSON.stringify(user));
            console.log("✅ User data updated in AsyncStorage");
          }
        } catch (storageError) {
          console.warn("⚠️ Failed to update user data in AsyncStorage:", storageError);
        }
        
        triggerBounceDrop("success");
      } else {
        console.log("❌ Profile update failed:", response.data);
        triggerBounceDrop("failure");
      }
    } catch (error: any) {
      console.error("❌ Avatar submission failed:", error);
      console.error("❌ Error details:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Provide more specific error feedback based on error type
      let errorMessage = "Please select an avatar";
      
      if (error.message.includes("Invalid image file")) {
        errorMessage = "Invalid image format. Please use JPEG, PNG, or GIF.";
      } else if (error.message.includes("File too large")) {
        errorMessage = "Image too large. Please choose a smaller file (max 5MB).";
      } else if (error.message.includes("Unauthorized")) {
        errorMessage = "Session expired. Please log in again.";
      } else if (error.message.includes("No user token found")) {
        errorMessage = "Authentication required. Please log in again.";
      } else if (error.message.includes("Upload failed")) {
        errorMessage = "Upload failed. Please check your connection and try again.";
      }
      
      // Update the failure card text with more specific error message
      setShowFailure(true);
      triggerBounceDrop("failure");
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
        <AuthHeader title="Profile Setup" />
      </View>

      {/* Success / Failure Card */}
      <RNAnimated.View
        className="absolute w-full items-center z-10 px-4"
        style={{ transform: [{ translateY: dropdownAnim }] }}
      >
        {showSuccess && <SuccessfulCard text="Avatar set successfully" />}
        {showFailure && (
          <FailureCard text="Please select an avatar" onClose={hideDropdown} />
        )}
      </RNAnimated.View>

      <View className="w-[333px] mt-3">
        <ProgressBar currentStep={4} totalSteps={7} />
        <Text className="text-[#1D2939] font-semibold mt-3">
          Let&apos;s make this feel like home
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
        <Text className="text-[32px] font-rubik-bold text-[#1D2939] w-[333px] mt-6">
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
                className={`text-[12px] font-rubik-medium mt-1 ${
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
              setUploadedImage={(uri) => {
                setUploadedImage(uri);
                setSelectedAvatar(uri);
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
        <TouchableOpacity className="mt-6 items-center"
         onPress={() => router.push("/categories/HomeScreen")}>
          <Text className="text-[#344054] text-[14px] font-rubik-medium">
            Skip this
          </Text>
        </TouchableOpacity>
      </View>

      <SlideUpSetProfileImageModal
        isVisible={isModalVisible}
        onConfirm={handleConfirm}
        onCancel={() => setIsModalVisible(false)}
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
//         <Text className="text-[32px] font-rubik-bold text-[#1D2939] w-[333px] mt-6">
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
//                 className={`text-[12px] font-rubik-medium mt-1 ${
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
//           <Text className="text-[#344054] text-[14px] font-rubik-medium">
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
