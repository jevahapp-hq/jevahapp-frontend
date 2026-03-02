import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";

type FlagGroupModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: { description: string; imageUri: string | null; isPublic: boolean }) => void;
};

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function FlagGroupModal({ visible, onClose, onSubmit }: FlagGroupModalProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, { toValue: 0, duration: 450, useNativeDriver: true }).start();
    } else {
      Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 350, useNativeDriver: true }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 350, useNativeDriver: true }).start(onClose);
  };

  const handlePick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} />
      </TouchableWithoutFeedback>

      <Animated.View style={{ position: "absolute", left: 0, right: 0, bottom: 0, transform: [{ translateY }] }}>
        <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingBottom: 24, maxHeight: SCREEN_HEIGHT * 0.9 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 8 }}>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: "#0F172A", fontFamily: "Rubik-Bold", flex: 1 }}>Flag A Group</Text>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#1D2939" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
            <Text style={{ color: "#475467", fontFamily: "Rubik-Regular", marginBottom: 16 }}>
              Give your reason for flagging this group. Your comment will be reviewed and action will be taken where necessary.
            </Text>

            <Text style={{ fontSize: 10, color: "#667085", marginBottom: 8, fontFamily: "Rubik-Bold" }}>DESCRIPTION</Text>
            <TextInput
              placeholder="Type here"
              placeholderTextColor="#98A2B3"
              multiline
              maxLength={100}
              value={description}
              onChangeText={setDescription}
              style={{ borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 14, height: 120, paddingHorizontal: 16, paddingTop: 12, textAlignVertical: "top", fontFamily: "Rubik-Regular", color: "#101828", marginBottom: 6 }}
            />
            <Text style={{ alignSelf: "flex-end", color: "#667085", fontSize: 10, marginBottom: 16, fontFamily: "Rubik-Regular" }}>{`${description.length}/100`}</Text>

            <Text style={{ fontSize: 10, color: "#667085", marginBottom: 8, fontFamily: "Rubik-Bold" }}>ADD A SCREENSHOT (OPTIONAL)</Text>
            <View style={{ borderWidth: 1, borderStyle: "dashed", borderColor: "#98A2B3", borderRadius: 12, alignItems: "center", justifyContent: "center", width: 224, height: 130, alignSelf: "flex-start", marginBottom: 16 }}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={{ width: 224, height: 130, borderRadius: 12 }} />
              ) : (
                <TouchableOpacity onPress={handlePick} activeOpacity={0.8} style={{ borderWidth: 1, borderColor: "#101828", paddingHorizontal: 24, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }}>
                  <Text style={{ fontFamily: "Rubik-Bold", color: "#101828" }}>Upload</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Public checkbox */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
              <TouchableOpacity onPress={() => setIsPublic(!isPublic)} activeOpacity={0.8} style={{ width: 24, height: 24, borderRadius: 6, borderWidth: isPublic ? 0 : 1, borderColor: "#D0D5DD", backgroundColor: isPublic ? "#84C2B7" : "#FFFFFF", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                {isPublic ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsPublic(!isPublic)} activeOpacity={0.7}>
                <Text style={{ color: "#101828", fontFamily: "Rubik-Bold" }}>OPEN TO THE PUBLIC</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => { onSubmit({ description, imageUri, isPublic }); handleClose(); setDescription(""); setImageUri(null); }} activeOpacity={0.8} style={{ backgroundColor: "#0C1529", height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontFamily: "Rubik-Bold" }}>Submit</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
}


