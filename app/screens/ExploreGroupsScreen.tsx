import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Dimensions,
    SafeAreaView,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    View
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Group {
  id: string;
  title: string;
  description: string;
  members: number;
  icon: string;
  color: string;
}

export default function ExploreGroupsScreen() {
  const [activeTab, setActiveTab] = useState<string>("Community");
  const [selectedTab, setSelectedTab] = useState<"MY GROUPS" | "EXPLORE GROUPS">("EXPLORE GROUPS");
  const router = useRouter();

  const groups: Group[] = [
    {
      id: "1",
      title: "Gospel Music Trends",
      description: "Gospel music, Lyrics, songs that elevate your spirit on a daily basis",
      members: 1900,
      icon: "musical-notes",
      color: "#FF6B6B"
    },
    {
      id: "2",
      title: "Daily Devotionals",
      description: "Daily scriptures to help you start your day and meditate on as you go",
      members: 3200,
      icon: "book",
      color: "#4ECDC4"
    },
    {
      id: "3",
      title: "Bible Stories Videos",
      description: "Learn the characters of the bible in a visual and engaging format",
      members: 2800,
      icon: "play-circle",
      color: "#45B7D1"
    },
    {
      id: "4",
      title: "Bible Stories Videos",
      description: "Learn the characters of the bible in a visual and engaging format",
      members: 2800,
      icon: "play-circle",
      color: "#45B7D1"
    },
    {
      id: "5",
      title: "Bible Stories Videos",
      description: "Learn the characters of the bible in a visual and engaging format",
      members: 2800,
      icon: "play-circle",
      color: "#45B7D1"
    }
  ];

  const handleBackPress = () => {
    router.back();
  };

  const handleJoinGroup = (group: Group) => {
    router.push({
      pathname: "/screens/GroupChatScreen",
      params: {
        groupId: group.id,
        groupTitle: group.title,
        groupDescription: group.description,
        groupMembers: group.members.toString()
      }
    });
  };

  const handleTabChange = (tab: "MY GROUPS" | "EXPLORE GROUPS") => {
    setSelectedTab(tab);
    if (tab === "MY GROUPS") {
      router.push("/screens/GroupsScreen");
    }
  };

  const renderGroupCard = (group: Group) => (
    <View
      key={group.id}
      style={{
        backgroundColor: '#E9F1EF',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      {/* Group Icon */}
      <View style={{
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: group.color,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16
      }}>
        <Ionicons name={group.icon as any} size={30} color="white" />
      </View>

      {/* Group Info */}
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: '#000',
          marginBottom: 4,
          fontFamily: 'Rubik-Bold'
        }}>
          {group.title}
        </Text>
        
        <Text style={{
          fontSize: 14,
          color: '#666',
          lineHeight: 20,
          fontFamily: 'Rubik-Regular'
        }}>
          {group.description}
        </Text>
      </View>

      {/* Join Button */}
      <TouchableOpacity
        onPress={() => handleJoinGroup(group)}
        style={{
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: '#E5E5E5',
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 8
        }}
        activeOpacity={0.8}
      >
        <Text style={{
          color: '#333',
          fontSize: 14,
          fontWeight: 'bold',
          fontFamily: 'Rubik-Bold'
        }}>
          Join
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
      }}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={{
            marginRight: 16
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        
        <Text style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: '#000',
          fontFamily: 'Rubik-Bold',
          flex: 1,
          textAlign: 'center'
        }}>
          Groups
        </Text>
        
        <View style={{ width: 24 }} />
      </View>

      {/* Groups Section */}
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <Text style={{
          fontSize: 28,
          fontWeight: 'bold',
          color: '#000',
          fontFamily: 'Rubik-Bold',
          marginBottom: 12
        }}>
          Groups
        </Text>
        
        <Text style={{
          fontSize: 16,
          color: '#666',
          lineHeight: 24,
          marginBottom: 20,
          fontFamily: 'Rubik-Regular'
        }}>
          Join groups and connect where the community shares contents that interests you, inspire you and grow your faith.
        </Text>
        
        {/* Navigation Buttons */}
        <View style={{
          flexDirection: 'row',
          marginBottom: 20,
          alignItems: 'center'
        }}>
          <TouchableOpacity
            onPress={() => handleTabChange("MY GROUPS")}
            style={{
              width: 79,
              height: 31,
              borderRadius: 8,
              backgroundColor: selectedTab === "MY GROUPS" ? '#E8F8F5' : '#FFFFFF',
              borderWidth: 1,
              borderColor: '#256E63',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10
            }}
            activeOpacity={0.8}
          >
            <Text style={{
              color: '#0A332D',
              fontSize: 10,
              fontWeight: 'bold',
              fontFamily: 'Rubik-Bold',
              lineHeight: 12,
              textAlign: 'center'
            }}>
              MY GROUPS
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => handleTabChange("EXPLORE GROUPS")}
            style={{
              width: 108,
              height: 31,
              borderRadius: 8,
              backgroundColor: selectedTab === "EXPLORE GROUPS" ? '#E8F8F5' : '#FFFFFF',
              borderWidth: 1,
              borderColor: '#667085',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 10
            }}
            activeOpacity={0.8}
          >
            <Text style={{
              color: '#1D2939',
              fontSize: 10,
              fontWeight: 'bold',
              fontFamily: 'Rubik-Bold',
              lineHeight: 12,
              textAlign: 'center'
            }}>
              EXPLORE GROUPS
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Groups List */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {groups.map(renderGroupCard)}
      </ScrollView>

    </SafeAreaView>
  );
}
