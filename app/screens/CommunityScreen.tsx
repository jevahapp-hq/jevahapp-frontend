// CommunityScreen.tsx
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import BottomNav from "../components/BottomNav";
import CommentExample from "../components/CommentExample";
import CommentIcon from "../components/CommentIcon";

interface Comment {
  id: string;
  userName: string;
  avatar: string;
  timestamp: string;
  comment: string;
  likes: number;
  isLiked: boolean;
}

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState<string>("Community");
  const router = useRouter();

  // Sample comments data matching the image
  const sampleComments: Comment[] = [
    {
      id: "1",
      userName: "Joseph Eluwa",
      avatar: "https://example.com/joseph.jpg", // Replace with actual avatar URL
      timestamp: "3HRS AGO",
      comment: "Wow!! My Faith has just been renewed.",
      likes: 193,
      isLiked: false,
    },
    {
      id: "2",
      userName: "Liz Elizabeth",
      avatar: "https://example.com/liz.jpg", // Replace with actual avatar URL
      timestamp: "24HRS",
      comment: "Wow!! My Faith has just been renewed.",
      likes: 193,
      isLiked: false,
    },
    {
      id: "3",
      userName: "Chris Evans",
      avatar: "", // Will show initials "CE"
      timestamp: "3 DAYS AGO",
      comment: "Wow!! My Faith has just been renewed.",
      likes: 193,
      isLiked: false,
    },
    {
      id: "4",
      userName: "Grace God",
      avatar: "", // Will show initials "GG"
      timestamp: "1W",
      comment: "Wow!! My Faith has just been renewed.",
      likes: 193,
      isLiked: false,
    },
  ];

  return (
    <View style={{ flex: 1 }} className="bg-[#FCFCFD]">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 20 }}>
        <View style={{ alignItems: "center", marginBottom: 30 }}>
          <Text style={{ fontSize: 18, marginBottom: 20 }}>Community Screen</Text>
          
          {/* Example comment icons that can be used anywhere */}
          <View style={{ flexDirection: 'row', gap: 20, marginBottom: 20 }}>
            <CommentIcon 
              comments={sampleComments}
              size={24}
              color="#10B981"
              showCount={true}
            />
            
            <CommentIcon 
              comments={sampleComments}
              size={20}
              color="#6B7280"
              showCount={false}
            />
          </View>

          <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20 }}>
            Click any comment icon above to open the global comment modal
          </Text>
        </View>

        {/* Example posts with comment icons */}
        <CommentExample 
          comments={sampleComments}
          title="Amazing Sermon Today!"
          content="The message today really touched my heart. God is truly working in our lives."
        />

        <CommentExample 
          comments={sampleComments}
          title="Community Prayer Request"
          content="Let's pray together for our community. God hears our prayers."
        />

        <CommentExample 
          comments={sampleComments}
          title="Bible Study Notes"
          content="Here are my notes from today's Bible study. Feel free to share your insights!"
        />
      </ScrollView>

      {/* Bottom Nav overlay */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backgroundColor: "transparent",
        }}
      >
        <BottomNav
          selectedTab={activeTab}
          setSelectedTab={(tab) => {
            setActiveTab(tab);
            switch (tab) {
              case "Home":
                router.replace({ pathname: "/categories/HomeScreen" });
                break;
              case "Community":
                router.replace({ pathname: "/screens/CommunityScreen" });
                break;
              case "Library":
                router.replace({ pathname: "/screens/library/LibraryScreen" });
                break;
              case "Account":
                router.replace({ pathname: "/screens/AccountScreen" });
                break;
              default:
                break;
            }
          }}
        />
      </View>
    </View>
  );
}
