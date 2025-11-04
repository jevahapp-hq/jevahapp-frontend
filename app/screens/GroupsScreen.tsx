import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import CreateGroupModal from "../components/CreateGroupModal";
import DeleteGroupModal from "../components/DeleteGroupModal";
import FlagGroupModal from "../components/FlagGroupModal";
import TopToast from "../components/TopToast";
import { addMyGroup, getMyGroups, MyGroup, removeMyGroup } from "../utils/groupStorage";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function GroupsScreen() {
  const [activeTab, setActiveTab] = useState<string>("Community");
  const [selectedTab, setSelectedTab] = useState<"MY GROUPS" | "EXPLORE GROUPS">("MY GROUPS");
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;
  const [myGroups, setMyGroups] = useState<MyGroup[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuGroup, setMenuGroup] = useState<MyGroup | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [showFlag, setShowFlag] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; text: string; type: "success" | "error" }>({ visible: false, text: "", type: "success" });
  const [headerOffset, setHeaderOffset] = useState(20);

  const demoGroups: MyGroup[] = [
    {
      id: 'd1',
      title: 'Gospel Music Trends',
      description: 'Gospel music, Lyrics, songs that elevate your spirit on a daily basis',
      members: 1900,
      imageUri: 'https://picsum.photos/seed/gospel/120',
    },
    {
      id: 'd2',
      title: 'Daily Devotionals',
      description: 'Daily scriptures to help you start your day and meditate as you go',
      members: 3200,
      imageUri: 'https://picsum.photos/seed/devotional/120',
    },
    {
      id: 'd3',
      title: 'Bible Stories Videos',
      description: 'Learn the characters of the bible in a visual and engaging format',
      members: 2800,
      imageUri: 'https://picsum.photos/seed/bible/120',
    },
  ];

  useEffect(() => {
    // Slide in animation from right to left
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await getMyGroups();
      setMyGroups(stored);
    })();
  }, []);

  const handleBackPress = () => {
    // Slide out animation to the right
    Animated.timing(slideAnim, {
      toValue: Dimensions.get('window').width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      router.push('/screens/CommunityScreen');
    });
  };

  const handleJoinGroupPress = () => {
    router.push("/screens/ExploreGroupsScreen");
  };

  const handleCreateFromModal = async (group: { id: string; title: string; description: string; imageUri: string | null }) => {
    await addMyGroup({ id: group.id, title: group.title, description: group.description, members: 1, imageUri: group.imageUri });
    const stored = await getMyGroups();
    setMyGroups(stored);
  };

  const handleTabChange = (tab: "MY GROUPS" | "EXPLORE GROUPS") => {
    setSelectedTab(tab);
    if (tab === "EXPLORE GROUPS") {
      // Slide out animation to the right, then navigate
      Animated.timing(slideAnim, {
        toValue: Dimensions.get('window').width,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        router.push("/screens/ExploreGroupsScreen");
      });
    }
  };

  const renderEmptyState = () => (
    <View style={{
      flex: 1,
      backgroundColor: '#E9F1EF',
      borderRadius: 16,
      margin: 20,
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Group illustration image */}
      <Image
        source={require('../../assets/images/phone1png.png')}
        style={{
          width: 200,
          height: 200,
          marginBottom: 20,
          resizeMode: 'contain'
        }}
      />
      
      <Text style={{
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 10,
        fontFamily: 'Rubik-Bold',
        textAlign: 'center'
      }}>
        You are yet to join a group
      </Text>
      
      <Text style={{
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
        paddingHorizontal: 20,
        lineHeight: 24,
        fontFamily: 'Rubik-Regular'
      }}>
        Welcome to "Groups" click the "Explore" tab and join any group of your interest.
      </Text>
      
      <TouchableOpacity
        onPress={handleJoinGroupPress}
        style={{
          backgroundColor: '#1A1A1A',
          width: 361,
          height: 45,
          borderRadius: 25,
          alignItems: 'center',
          justifyContent: 'center'
        }}
        activeOpacity={0.8}
      >
        <Text style={{
          color: 'white',
          fontSize: 16,
          fontWeight: 'bold',
          fontFamily: 'Rubik-Bold'
        }}>
          JOIN A GROUP
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Animated.View style={[{ flex: 1 }, { transform: [{ translateX: slideAnim }] }]}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View onLayout={(e) => { const { y, height } = e.nativeEvent.layout; setHeaderOffset(y + height + 8); }} style={{
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

      {/* Content */}
      <View style={{ flex: 1 }}>
        {selectedTab === "MY GROUPS" ? (
          <>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
              {(myGroups.length > 0 ? myGroups : demoGroups).map((group) => (
                  <View key={group.id} style={{ backgroundColor: '#E9F1EF', borderRadius: 16, padding: 16, marginHorizontal: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                    {/* Icon/Image */}
                    <View style={{ width: 60, height: 60, borderRadius: 30, overflow: 'hidden', backgroundColor: '#CBD5D1', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                      {group.imageUri ? (
                        <Image source={{ uri: group.imageUri }} style={{ width: 60, height: 60 }} />
                      ) : (
                        <Ionicons name="people" size={28} color="#FFFFFF" />
                      )}
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#000', marginBottom: 4, fontFamily: 'Rubik-Bold' }}>{group.title}</Text>
                      <Text style={{ fontSize: 14, color: '#666', lineHeight: 20, fontFamily: 'Rubik-Regular' }} numberOfLines={2}>{group.description || 'Group'}</Text>
                      <Text style={{ marginTop: 6, color: '#6B7280', fontSize: 12, fontFamily: 'Rubik-Regular' }}>{`${group.members.toLocaleString()} Members`}</Text>
                    </View>

                    {/* Menu trigger */}
                    <TouchableOpacity onPress={() => { setMenuGroup(group); setMenuVisible(true); }} activeOpacity={0.8} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="ellipsis-vertical" size={18} color="#0F172A" />
                    </TouchableOpacity>
                  </View>
              ))}
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity onPress={() => setShowCreateModal(true)} activeOpacity={0.8} style={{ position: 'absolute', right: 24, bottom: 64, width: 56, height: 56, borderRadius: 28, backgroundColor: '#1C8E79', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 6 }}>
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Menu Modal */}
            <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
              <TouchableOpacity activeOpacity={1} onPress={() => setMenuVisible(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ width: 260, backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 8 }}>
                  {menuGroup ? (
                    <>
                      <TouchableOpacity activeOpacity={0.8} style={{ paddingVertical: 12, paddingHorizontal: 16 }} onPress={() => { setMenuVisible(false); router.push({ pathname: '/screens/GroupChatScreen', params: { groupId: menuGroup.id, groupTitle: menuGroup.title, groupDescription: menuGroup.description, groupMembers: String(menuGroup.members) } }); }}>
                        <Text style={{ fontFamily: 'Rubik-Bold', color: '#0F172A' }}>Group Details</Text>
                      </TouchableOpacity>
                      <TouchableOpacity activeOpacity={0.8} style={{ paddingVertical: 12, paddingHorizontal: 16 }} onPress={() => { setMenuVisible(false); setShowCreateModal(true); }}>
                        <Text style={{ fontFamily: 'Rubik-Bold', color: '#0F172A' }}>Edit group details</Text>
                      </TouchableOpacity>
                      <TouchableOpacity activeOpacity={0.8} style={{ paddingVertical: 12, paddingHorizontal: 16 }} onPress={async () => { if (menuGroup) { await removeMyGroup(menuGroup.id); const stored = await getMyGroups(); setMyGroups(stored); } setMenuVisible(false); }}>
                        <Text style={{ fontFamily: 'Rubik-Bold', color: '#DC2626' }}>Exit group</Text>
                      </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.8} style={{ paddingVertical: 12, paddingHorizontal: 16 }} onPress={() => { setMenuVisible(false); setShowFlag(true); }}>
                          <Text style={{ fontFamily: 'Rubik-Bold', color: '#DC2626' }}>Flag group</Text>
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.8} style={{ paddingVertical: 12, paddingHorizontal: 16 }} onPress={() => { setMenuVisible(false); setShowDelete(true); }}>
                          <Text style={{ fontFamily: 'Rubik-Bold', color: '#DC2626' }}>Delete</Text>
                        </TouchableOpacity>
                    </>
                  ) : null}
                </View>
              </TouchableOpacity>
            </Modal>

              <CreateGroupModal visible={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={handleCreateFromModal} />
            <DeleteGroupModal visible={showDelete} onClose={() => setShowDelete(false)} onDelete={async () => { if (menuGroup) { await removeMyGroup(menuGroup.id); const stored = await getMyGroups(); setMyGroups(stored); } setShowDelete(false); setToast({ visible: true, text: 'Item Deleted', type: 'error' }); }} />
            <FlagGroupModal visible={showFlag} onClose={() => setShowFlag(false)} onSubmit={() => { setShowFlag(false); setToast({ visible: true, text: 'Submitted. Thank you', type: 'success' }); }} />
            <TopToast visible={toast.visible} text={toast.text} type={toast.type} topOffset={headerOffset} onClose={() => setToast({ ...toast, visible: false })} />
          </>
        ) : null}
      </View>

      </SafeAreaView>
    </Animated.View>
  );
}
