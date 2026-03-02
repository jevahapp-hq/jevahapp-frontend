import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import JoinGroupModal from "../components/JoinGroupModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Message {
  id: string;
  sender: string;
  message: string;
  timestamp: string;
  avatar: string;
  isOwn: boolean;
}

export default function GroupChatScreen() {
  const [activeTab, setActiveTab] = useState<string>("Community");
  const [showJoinModal, setShowJoinModal] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();
  const slideAnim = useRef(
    new Animated.Value(Dimensions.get("window").width)
  ).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Slide in animation from right to left
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const groupTitle = (params.groupTitle as string) || "Gospel Music Trends";
  const groupDescription =
    (params.groupDescription as string) ||
    "Gospel music, Lyrics, songs that elevate your spirit on a daily basis";
  const groupMembers = parseInt((params.groupMembers as string) || "1900");

  useEffect(() => {
    // Initialize with sample messages
    setMessages([
      {
        id: "1",
        sender: "Joe",
        message: "Hey, Joesph here. I am willing to learn from you all",
        timestamp: "10:00 AM",
        avatar: "👨‍💼",
        isOwn: false,
      },
      {
        id: "2",
        sender: "Elizabeth",
        message: "Hey, Elizabeth here.",
        timestamp: "10:00 AM",
        avatar: "👩‍💼",
        isOwn: true,
      },
      {
        id: "3",
        sender: "Brithany",
        message:
          "I posted a prayer in our community group for guidance on a difficult decision, and within days, doors began to open in unexpected ways. God provided clarity and wisdom, and our community came together in agreement, praying for the same outcome. I'm amazed at how God worked through our collective prayers. Matthew 18:19 is true - 'If two of you agree on earth about anything they ask, it will be done for them by my Father in heaven.' I'm grateful for the power of prayer and the support of our community.",
        timestamp: "10:00 AM",
        avatar: "👩‍🦱",
        isOwn: false,
      },
    ]);
  }, []);

  const handleBackPress = () => {
    // Slide out animation to the right
    Animated.timing(slideAnim, {
      toValue: Dimensions.get("window").width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      router.push("/screens/CommunityScreen");
    });
  };

  const handleClosePress = () => {
    // Slide out animation to the right
    Animated.timing(slideAnim, {
      toValue: Dimensions.get("window").width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      router.push("/screens/CommunityScreen");
    });
  };

  const handleJoinGroup = () => {
    setShowJoinModal(false);
    // Here you would typically make an API call to join the group
    console.log("Joined group:", groupTitle);
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        sender: "You",
        message: newMessage.trim(),
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        avatar: "👤",
        isOwn: true,
      };

      setMessages((prev) => [...prev, message]);
      setNewMessage("");
    }
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    Alert.alert(
      "Recording Started",
      "Audio recording has started. Tap the microphone again to stop recording.",
      [
        {
          text: "Stop Recording",
          onPress: handleStopRecording,
          style: "default",
        },
      ]
    );
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    Alert.alert(
      "Recording Stopped",
      "Audio recording has been saved and sent.",
      [
        {
          text: "OK",
          onPress: () => {
            // Here you would typically send the audio message
            const audioMessage: Message = {
              id: Date.now().toString(),
              sender: "You",
              message: "🎤 Audio message",
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              avatar: "👤",
              isOwn: true,
            };
            setMessages((prev) => [...prev, audioMessage]);
          },
        },
      ]
    );
  };

  const handleMicrophonePress = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  const renderMessage = (message: Message) => (
    <View
      key={message.id}
      style={{
        flexDirection: "row",
        marginBottom: 16,
        paddingHorizontal: 20,
        alignItems: "flex-start",
        justifyContent: message.isOwn ? "flex-end" : "flex-start",
      }}
    >
      {!message.isOwn && (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#F0F0F0",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Text style={{ fontSize: 20 }}>{message.avatar}</Text>
        </View>
      )}

      <View
        style={{
          maxWidth: "70%",
          alignItems: message.isOwn ? "flex-end" : "flex-start",
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: "bold",
            color: "#333",
            marginBottom: 4,
            fontFamily: "Rubik-Bold",
          }}
        >
          {message.sender}
        </Text>

        <View
          style={{
            backgroundColor: message.isOwn ? "#E5E5E5" : "#FFF3CD",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 16,
            borderTopLeftRadius: message.isOwn ? 16 : 4,
            borderTopRightRadius: message.isOwn ? 4 : 16,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              color: "#333",
              lineHeight: 22,
              fontFamily: "Rubik-Regular",
            }}
          >
            {message.message}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 4,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: "#999",
              fontFamily: "Rubik-Regular",
            }}
          >
            {message.timestamp}
          </Text>
          <Ionicons
            name="checkmark-done"
            size={16}
            color="#999"
            style={{ marginLeft: 4 }}
          />
        </View>
      </View>

      {message.isOwn && (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#F0F0F0",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 12,
          }}
        >
          <Text style={{ fontSize: 20 }}>{message.avatar}</Text>
        </View>
      )}
    </View>
  );

  return (
    <Animated.View
      style={[{ flex: 1 }, { transform: [{ translateX: slideAnim }] }]}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 36,
            paddingBottom: 20,
            borderBottomWidth: 1,
            borderBottomColor: "#E5E5E5",
          }}
        >
          <TouchableOpacity
            onPress={handleBackPress}
            style={{
              marginRight: 16,
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: "#000",
              fontFamily: "Rubik-Bold",
              flex: 1,
              textAlign: "center",
            }}
          >
            {groupTitle}
          </Text>

          <TouchableOpacity
            onPress={handleClosePress}
            style={{
              marginLeft: 16,
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Date Separator */}
        <View
          style={{
            alignItems: "center",
            marginVertical: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#FFF3CD",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: "#666",
                fontWeight: "bold",
                fontFamily: "Rubik-Bold",
              }}
            >
              Today
            </Text>
          </View>
        </View>

        {/* Messages and Input Bar with Keyboard Avoidance */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {messages.map(renderMessage)}
          </ScrollView>

          {/* Message Input Bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingVertical: 16,
              paddingBottom: 16 + insets.bottom,
              backgroundColor: "#FFFFFF",
              borderTopWidth: 1,
              borderTopColor: "#E5E5E5",
            }}
          >
            <TouchableOpacity
              style={{
                marginRight: 12,
                padding: 8,
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={24} color="#666" />
            </TouchableOpacity>

            <TextInput
              style={{
                flex: 1,
                backgroundColor: "#F5F5F5",
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                fontFamily: "Rubik-Regular",
                maxHeight: 100,
                minHeight: 44,
              }}
              placeholder="Start a conversation"
              placeholderTextColor="#999"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              onSubmitEditing={handleSendMessage}
              returnKeyType="send"
            />

            {/* Send Button */}
            {newMessage.trim() && (
              <TouchableOpacity
                onPress={handleSendMessage}
                style={{
                  marginLeft: 12,
                  marginRight: 8,
                  padding: 8,
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="send" size={24} color="#22C55E" />
              </TouchableOpacity>
            )}

            {/* Microphone Button */}
            <TouchableOpacity
              onPress={handleMicrophonePress}
              style={{
                marginLeft: newMessage.trim() ? 0 : 12,
                padding: 8,
                backgroundColor: isRecording ? "#FF6B6B" : "transparent",
                borderRadius: 20,
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="mic"
                size={24}
                color={isRecording ? "#FFFFFF" : "#666"}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Join Group Modal */}
        <JoinGroupModal
          visible={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          onJoin={handleJoinGroup}
          groupTitle={groupTitle}
          groupDescription={groupDescription}
          groupMembers={groupMembers}
        />
      </SafeAreaView>
    </Animated.View>
  );
}
