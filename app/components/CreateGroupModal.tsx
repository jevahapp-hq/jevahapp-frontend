import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { validateGroupForm } from "../utils/communityHelpers";

type CreateGroupModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreate?: (group: {
    name: string;
    description?: string;
    visibility: "public" | "private";
    imageUri?: string | null;
  }) => Promise<boolean> | boolean;
};

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function CreateGroupModal({ visible, onClose, onCreate }: CreateGroupModalProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const descriptionLimit = 50;

  const resetForm = () => {
    setGroupName("");
    setDescription("");
    setIsPublic(true);
    setImageUri(null);
    setError(null);
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = (force = false) => {
    if (isSubmitting && !force) {
      return;
    }

    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      resetForm();
      onClose();
    });
  };

  const handleCreate = async () => {
    if (isSubmitting) {
      return;
    }

    const name = groupName.trim();
    const descriptionValue = description.trim();
    const visibility = isPublic ? "public" : "private";

    const validation = validateGroupForm({
      name,
      description: descriptionValue,
      visibility,
    });

    if (!validation.valid) {
      setError(validation.errors[0]);
      return;
    }

    if (!onCreate) {
      handleClose(true);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const result = await onCreate({
        name,
        description: descriptionValue || undefined,
        visibility,
        imageUri,
      });

      if (result !== false) {
        handleClose(true);
      } else {
        setError("Unable to create group. Please try again.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create group. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          transform: [{ translateY }],
        }}
      >
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 12,
            paddingBottom: 24,
            maxHeight: SCREEN_HEIGHT * 0.9,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: "#000", fontFamily: "Rubik-Bold", flex: 1 }}>Create A Group</Text>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#1D2939" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
            {/* Display Picture Uploader */}
            <Text style={{ fontSize: 10, color: "#667085", marginBottom: 4, fontFamily: "Rubik-Bold" }}>GROUP DISPLAY PICTURE</Text>
            <View style={{
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: "#98A2B3",
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              width: 224,
              height: 130,
              alignSelf: "flex-start",
              marginTop: 8,
              marginBottom: 16,
            }}>
              {imageUri ? (
                <View style={{ width: 224, height: 130, borderRadius: 12, overflow: "hidden" }}>
                  <Image
                    source={{ uri: imageUri }}
                    style={{ width: 224, height: 130 }}
                    resizeMode="cover"
                  />
                  <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#FFFFFF", fontFamily: "Rubik-Bold", marginBottom: 8 }}>REPLACE IMAGE</Text>
                    <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={{
                      borderWidth: 1,
                      borderColor: "#FFFFFF",
                      paddingHorizontal: 24,
                      height: 36,
                      borderRadius: 18,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(0,0,0,0.25)",
                    }}>
                      <Text style={{ fontFamily: "Rubik-Bold", color: "#FFFFFF" }}>upload</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={{
                  borderWidth: 1,
                  borderColor: "#101828",
                  paddingHorizontal: 24,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#FFFFFF",
                }}>
                  <Text style={{ fontFamily: "Rubik-Bold", color: "#101828" }}>Upload</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Group Name */}
            <Text style={{ fontSize: 10, color: "#667085", marginBottom: 8, fontFamily: "Rubik-Bold" }}>GROUP NAME</Text>
            <TextInput
              placeholder="Add here"
              placeholderTextColor="#98A2B3"
              value={groupName}
              onChangeText={setGroupName}
              style={{
                borderWidth: 1,
                borderColor: "#D0D5DD",
                borderRadius: 14,
                height: 50,
                paddingHorizontal: 16,
                marginBottom: 16,
                fontFamily: "Rubik-Regular",
                color: "#101828",
              }}
            />

            {/* Description */}
            <Text style={{ fontSize: 10, color: "#667085", marginBottom: 8, fontFamily: "Rubik-Bold" }}>DESCRIPTION</Text>
            <View style={{ position: "relative", marginBottom: 6 }}>
              <TextInput
                placeholder="Type here"
                placeholderTextColor="#98A2B3"
                multiline
                maxLength={50}
                value={description}
                onChangeText={setDescription}
                style={{
                  borderWidth: 1,
                  borderColor: "#D0D5DD",
                  borderRadius: 14,
                  height: 120,
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  textAlignVertical: "top",
                  fontFamily: "Rubik-Regular",
                  color: "#101828",
                }}
              />
            </View>
            <Text style={{ alignSelf: "flex-end", color: "#667085", fontSize: 10, marginBottom: 16, fontFamily: "Rubik-Regular" }}>
              {`${description.length}/50`}
            </Text>

            {/* Public Checkbox */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
              <TouchableOpacity
                onPress={() => setIsPublic(!isPublic)}
                activeOpacity={0.8}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  borderWidth: isPublic ? 0 : 1,
                  borderColor: "#D0D5DD",
                  backgroundColor: isPublic ? "#84C2B7" : "#FFFFFF",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                {isPublic ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsPublic(!isPublic)} activeOpacity={0.7}>
                <Text style={{ color: "#101828", fontFamily: "Rubik-Bold" }}>OPEN TO THE PUBLIC</Text>
              </TouchableOpacity>
            </View>

            {error ? (
              <Text style={{ color: "#DC2626", fontFamily: "Rubik-Regular", fontSize: 12, marginBottom: 16 }}>
                {error}
              </Text>
            ) : null}

            {/* Create Button */}
            <TouchableOpacity
              onPress={handleCreate}
              activeOpacity={isSubmitting ? 1 : 0.8}
              disabled={isSubmitting}
              style={{
                backgroundColor: "#0C1529",
                height: 54,
                borderRadius: 27,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontFamily: "Rubik-Bold" }}>Create</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
}


