import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Dimensions, Modal, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";

type DeleteGroupModalProps = {
  visible: boolean;
  onClose: () => void;
  onDelete: () => void;
};

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function DeleteGroupModal({ visible, onClose, onDelete }: DeleteGroupModalProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

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

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} />
      </TouchableWithoutFeedback>

      <Animated.View style={{ position: "absolute", left: 0, right: 0, bottom: 0, transform: [{ translateY }] }}>
        <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingBottom: 24, height: 310 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 8 }}>
            <Text style={{ fontSize: 14, color: "#667085", fontFamily: "Rubik-Bold", flex: 1 }}>Delete Item</Text>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#1D2939" />
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 20, flex: 1 }}>
            <Text style={{ fontSize: 22, fontFamily: "Rubik-Bold", color: "#0F172A", marginBottom: 8 }}>Delete Group?</Text>
            <Text style={{ fontSize: 14, color: "#475467", lineHeight: 20, fontFamily: "Rubik-Regular", marginBottom: 20 }}>
              This action will not be reversible. Are you sure you want to delete this group?
            </Text>

            <View style={{ flex: 1 }} />
            <View style={{ alignItems: "center" }}>
              <View style={{ width: 361, flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                onPress={() => { handleClose(); onDelete(); }}
                activeOpacity={0.8}
                style={{ backgroundColor: "#0C1529", width: 172.5, height: 45, borderRadius: 25, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: "#FFFFFF", fontFamily: "Rubik-Bold" }}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleClose}
                activeOpacity={0.8}
                style={{ backgroundColor: "#FFFFFF", width: 172.5, height: 45, borderRadius: 25, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#0C1529" }}
              >
                <Text style={{ color: "#0C1529", fontFamily: "Rubik-Bold" }}>Cancel</Text>
              </TouchableOpacity>
              </View>
            </View>
            <View style={{ flex: 1 }} />
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}


