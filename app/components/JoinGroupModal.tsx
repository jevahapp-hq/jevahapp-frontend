import { Modal, Text, TouchableOpacity, View } from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  onJoin?: () => void;
  groupTitle?: string;
  groupDescription?: string;
  groupMembers?: number;
};

export default function JoinGroupModal({
  visible,
  onClose,
  onJoin,
  groupTitle,
  groupDescription,
  groupMembers,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: "white",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#111827",
              marginBottom: 8,
            }}
          >
            Join Group
          </Text>
          {groupTitle ? (
            <>
              <Text
                style={{ color: "#1F2937", fontWeight: "600", marginBottom: 4 }}
              >
                {groupTitle}
              </Text>
              {groupDescription ? (
                <Text style={{ color: "#6B7280", marginBottom: 4 }}>
                  {groupDescription}
                </Text>
              ) : null}
              {typeof groupMembers === "number" ? (
                <Text style={{ color: "#6B7280", marginBottom: 16 }}>
                  {groupMembers} members
                </Text>
              ) : (
                <Text style={{ color: "#6B7280", marginBottom: 16 }}>
                  Do you want to join this group?
                </Text>
              )}
            </>
          ) : (
            <Text style={{ color: "#6B7280", marginBottom: 16 }}>
              Do you want to join this group?
            </Text>
          )}
          <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 16,
                marginRight: 8,
              }}
            >
              <Text style={{ color: "#6B7280", fontWeight: "600" }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                onJoin?.();
                onClose();
              }}
              style={{
                backgroundColor: "#256E63",
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "white", fontWeight: "700" }}>Join</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
