import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    SafeAreaView,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import TopToast from "../components/TopToast";
import { communityAPI } from "../utils/communityAPI";
import { validateGroupForm } from "../utils/communityHelpers";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function CreateGroupScreen() {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(Dimensions.get("window").width)).current;

  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; text: string; type: "success" | "error" }>({ visible: false, text: "", type: "success" });

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleBack = () => {
    Animated.timing(slideAnim, {
      toValue: Dimensions.get("window").width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => router.back());
  };

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ visible: true, text, type });
  };

  const handleCreate = async () => {
    if (isCreating) {
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
      showToast(validation.errors[0], "error");
      return;
    }

    try {
      setIsCreating(true);
      const response = await communityAPI.createGroup({
        name,
        description: descriptionValue || undefined,
        visibility,
      });

      if (response.success && response.data) {
        showToast("Group created successfully!", "success");
        setGroupName("");
        setDescription("");
        setIsPublic(true);
        setTimeout(() => {
          router.replace("/screens/GroupsScreen");
        }, 800);
      } else {
        showToast(response.error || "Failed to create group", "error");
      }
    } catch (error: any) {
      showToast(error?.message || "Failed to create group", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const descriptionLimit = 50;

  return (
    <Animated.View style={[{ flex: 1 }, { transform: [{ translateX: slideAnim }] }]}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: "#000",
              fontFamily: "Rubik-Bold",
              flex: 1,
              textAlign: "left",
            }}
          >
            Create A Group
          </Text>

          <TouchableOpacity onPress={handleBack} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color="#1D2939" />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Display Picture Uploader (placeholder) */}
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
            marginBottom: 16,
          }}>
            <TouchableOpacity activeOpacity={0.8} style={{
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
              maxLength={descriptionLimit}
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
            {`${description.length}/${descriptionLimit}`}
          </Text>

          {/* Public Toggle */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
            <View style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: isPublic ? "#84C2B7" : "#E4E7EC",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}>
              {isPublic ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
            </View>
            <TouchableOpacity onPress={() => setIsPublic(!isPublic)} activeOpacity={0.7}>
              <Text style={{ color: "#101828", fontFamily: "Rubik-Bold" }}>OPEN TO THE PUBLIC</Text>
            </TouchableOpacity>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            onPress={handleCreate}
            activeOpacity={isCreating ? 1 : 0.8}
            disabled={isCreating}
            style={{
              backgroundColor: "#0C1529",
              height: 54,
              borderRadius: 27,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              opacity: isCreating ? 0.7 : 1,
            }}
          >
            {isCreating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontFamily: "Rubik-Bold" }}>Create</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
      <TopToast
        visible={toast.visible}
        text={toast.text}
        type={toast.type}
        topOffset={20}
        onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </Animated.View>
  );
}


