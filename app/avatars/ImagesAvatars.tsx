

import { RenderAvatarRowProps } from "@/.expo/types/avatarTypes";
import * as ImagePicker from "expo-image-picker";
import { Alert, Image, Text, TouchableOpacity, View } from "react-native";

const imageAvatars = [
  { id: "i1", src: require("../../assets/images/Image (3).png") },
  { id: "i2", src: require("../../assets/images/Asset.png") },
  { id: "i3", src: require("../../assets/images/Asset (1).png") },
  { id: "i4", src: require("../../assets/images/Asset (2).png") },
  { id: "i5", src: require("../../assets/images/Asset (3).png") },
  { id: "i6", src: require("../../assets/images/Asset (4).png") },
  { id: "i7", src: require("../../assets/images/Asset (5).png") },
  { id: "i8", src: require("../../assets/images/Asset (6).png") },
  { id: "i9", src: require("../../assets/images/Asset (7).png") },
  { id: "i10", src: require("../../assets/images/Asset (8).png") },
  { id: "i11", src: require("../../assets/images/Asset (9).png") },
  { id: "i12", src: require("../../assets/images/Asset (10).png") },
  { id: "i13", src: require("../../assets/images/Asset (11).png") },
  { id: "i14", src: require("../../assets/images/Asset (12).png") },
  { id: "i15", src: require("../../assets/images/Asset (13).png") },
];

const Images = ({
  renderAvatarRow,
  uploadedImage,
  setUploadedImage,
}: RenderAvatarRowProps) => {
  const handleImageUpload = async (source: 'camera' | 'gallery') => {
    try {
      // Request permissions based on source
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Camera Permission Required",
            "Please grant permission to access your camera to take a photo."
          );
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Please grant permission to access your photo library to upload an avatar."
          );
          return;
        }
      }

      const result = source === 'camera' 
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            allowsMultipleSelection: false,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8, // Reduced quality for better performance and smaller file size
            allowsMultipleSelection: false,
          });
    
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.uri;
        
        // Validate file size (5MB limit as per backend API)
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert(
            "File Too Large",
            "Please select an image smaller than 5MB."
          );
          return;
        }
        
        // Validate file type
        const fileExtension = uri.split(".").pop()?.toLowerCase();
        const validExtensions = ["jpg", "jpeg", "png", "gif"];
        
        if (!fileExtension || !validExtensions.includes(fileExtension)) {
          Alert.alert(
            "Invalid File Type",
            "Please select a JPEG, PNG, or GIF image."
          );
          return;
        }
        
        setUploadedImage?.(uri);
        console.log("✅ Image selected successfully:", {
          uri,
          fileSize: asset.fileSize,
          type: asset.type,
          width: asset.width,
          height: asset.height
        });
      }
    } catch (error) {
      console.error("❌ Image picker error:", error);
      Alert.alert(
        "Upload Error",
        "Failed to select image. Please try again."
      );
    }
  };

  const avatars = uploadedImage
    ? [{ id: "uploaded", src: uploadedImage }, ...imageAvatars]
    : imageAvatars;

  return (
    <View>
      {uploadedImage && (
        <View className="w-[333px] h-[180px] rounded-2xl overflow-hidden mt-6 mb-3 border-2 border-[#A3A1FE] self-center relative">
          <Image
            source={{ uri: uploadedImage }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
          <View
            style={{ position: "absolute", bottom: 12, left: 0, right: 0 }}
            className="flex-row justify-around"
          >
            <TouchableOpacity className="bg-white px-4 py-2 rounded-full border border-gray-300">
              <Text className="text-black font-medium">Set as profile picture</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleImageUpload('gallery')}
              className="bg-white px-4 py-2 rounded-full border border-gray-300"
            >
              <Text className="text-black font-medium">Replace image</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!uploadedImage && (
        <View className="border border-dashed border-[#667085] bg-[#667085] rounded-xl p-4 mb-4 items-center h-[105px]">
          <Text className="text-[10px] font-rubik-medium text-[#475467] mb-2">
            UPLOAD YOUR IMAGE
          </Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => handleImageUpload('camera')}
              className="border border-[#9D9FA7] px-4 py-2 rounded-full"
            >
              <Text className="text-[12px] font-rubik-medium text-[#090E24] text-center">
                Camera
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleImageUpload('gallery')}
              className="border border-[#9D9FA7] px-4 py-2 rounded-full"
            >
              <Text className="text-[12px] font-rubik-medium text-[#090E24] text-center">
                Gallery
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View className="flex-row items-center my-4 w-[300px]">
        <View className="flex-1 h-px bg-black/50" />
        <Text className="mx-2 text-[#475467] font-rubik-medium text-[10px]">
          OR SELECT BELOW
        </Text>
        <View className="flex-1 h-px bg-black/50" />
      </View>

      {renderAvatarRow(avatars)}
    </View>
  );
};

export default Images;
