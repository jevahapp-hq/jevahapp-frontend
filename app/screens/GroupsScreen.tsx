import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function GroupsScreen() {
  const [activeTab, setActiveTab] = useState<string>("Community");
  const [selectedTab, setSelectedTab] = useState<
    "MY GROUPS" | "EXPLORE GROUPS"
  >("MY GROUPS");
  const router = useRouter();
  const slideAnim = useRef(
    new Animated.Value(Dimensions.get("window").width)
  ).current;

  useEffect(() => {
    // Slide in animation from right to left
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
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

  const handleJoinGroupPress = () => {
    router.push("/screens/ExploreGroupsScreen");
  };

  const handleTabChange = (tab: "MY GROUPS" | "EXPLORE GROUPS") => {
    setSelectedTab(tab);
    if (tab === "EXPLORE GROUPS") {
      // Slide out animation to the right, then navigate
      Animated.timing(slideAnim, {
        toValue: Dimensions.get("window").width,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        router.push("/screens/ExploreGroupsScreen");
      });
    }
  };

  const renderEmptyState = () => (
    <View
      style={{
        flex: 1,
        backgroundColor: "#E9F1EF",
        borderRadius: 16,
        margin: 20,
        padding: 20,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Group illustration image */}
      <Image
        source={require("../../assets/images/user.png")}
        style={{
          width: 200,
          height: 200,
          marginBottom: 20,
          resizeMode: "contain",
        }}
      />

      <Text
        style={{
          fontSize: 20,
          fontWeight: "bold",
          color: "#000",
          marginBottom: 10,
          fontFamily: "Rubik-Bold",
          textAlign: "center",
        }}
      >
        You are yet to join a group
      </Text>

      <Text
        style={{
          fontSize: 16,
          color: "#666",
          textAlign: "center",
          marginBottom: 30,
          paddingHorizontal: 20,
          lineHeight: 24,
          fontFamily: "Rubik-Regular",
        }}
      >
        Welcome to "Groups" click the "Explore" tab and join any group of your
        interest.
      </Text>

      <TouchableOpacity
        onPress={handleJoinGroupPress}
        style={{
          backgroundColor: "#1A1A1A",
          width: 361,
          height: 45,
          borderRadius: 25,
          alignItems: "center",
          justifyContent: "center",
        }}
        activeOpacity={0.8}
      >
        <Text
          style={{
            color: "white",
            fontSize: 16,
            fontWeight: "bold",
            fontFamily: "Rubik-Bold",
          }}
        >
          JOIN A GROUP
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Animated.View
      style={[{ flex: 1 }, { transform: [{ translateX: slideAnim }] }]}
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#FFFFFF", paddingTop: 20 }}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 20,
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
            Groups
          </Text>

          <View style={{ width: 24 }} />
        </View>

        {/* Groups Section */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "bold",
              color: "#000",
              fontFamily: "Rubik-Bold",
              marginBottom: 12,
            }}
          >
            Groups
          </Text>

          <Text
            style={{
              fontSize: 16,
              color: "#666",
              lineHeight: 24,
              marginBottom: 20,
              fontFamily: "Rubik-Regular",
            }}
          >
            Join groups and connect where the community shares contents that
            interests you, inspire you and grow your faith.
          </Text>

          {/* Navigation Buttons */}
          <View
            style={{
              flexDirection: "row",
              marginBottom: 20,
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              onPress={() => handleTabChange("MY GROUPS")}
              style={{
                width: 79,
                height: 31,
                borderRadius: 8,
                backgroundColor:
                  selectedTab === "MY GROUPS" ? "#E8F8F5" : "#FFFFFF",
                borderWidth: 1,
                borderColor: "#256E63",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  color: "#0A332D",
                  fontSize: 10,
                  fontWeight: "bold",
                  fontFamily: "Rubik-Bold",
                  lineHeight: 12,
                  textAlign: "center",
                }}
              >
                MY GROUPS
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleTabChange("EXPLORE GROUPS")}
              style={{
                width: 108,
                height: 31,
                borderRadius: 8,
                backgroundColor:
                  selectedTab === "EXPLORE GROUPS" ? "#E8F8F5" : "#FFFFFF",
                borderWidth: 1,
                borderColor: "#667085",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 10,
              }}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  color: "#1D2939",
                  fontSize: 10,
                  fontWeight: "bold",
                  fontFamily: "Rubik-Bold",
                  lineHeight: 12,
                  textAlign: "center",
                }}
              >
                EXPLORE GROUPS
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={{ flex: 1, paddingBottom: 100 }}>
          {selectedTab === "MY GROUPS" ? renderEmptyState() : null}
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}
