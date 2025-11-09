import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image,
    Modal,
    SafeAreaView,
    StatusBar,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import CreateGroupModal from "../components/CreateGroupModal";
import DeleteGroupModal from "../components/DeleteGroupModal";
import FlagGroupModal from "../components/FlagGroupModal";
import TopToast from "../components/TopToast";
import { useMyGroups } from "../hooks/useGroups";
import { Group } from "../utils/communityAPI";
import { validateGroupForm } from "../utils/communityHelpers";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function GroupsScreen() {
  const [activeTab, setActiveTab] = useState<string>("Community");
  const [selectedTab, setSelectedTab] = useState<"MY GROUPS" | "EXPLORE GROUPS">("MY GROUPS");
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuGroup, setMenuGroup] = useState<Group | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [showFlag, setShowFlag] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; text: string; type: "success" | "error" }>({ visible: false, text: "", type: "success" });
  const [headerOffset, setHeaderOffset] = useState(20);

  // Get groups from backend
  const {
    groups,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    createGroup,
    updateGroup,
  } = useMyGroups();

  useEffect(() => {
    // Slide in animation from right to left
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

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

  const handleGroupModalSubmit = async (group: {
    id?: string;
    name: string;
    description?: string;
    visibility: "public" | "private";
    imageUri?: string | null;
    imageBase64?: string | null;
  }) => {
    const validation = validateGroupForm({
      name: group.name,
      description: group.description,
      visibility: group.visibility,
    });

    if (!validation.valid) {
      setToast({ visible: true, text: validation.errors[0], type: "error" });
      return false;
    }

    if (editingGroup && group.id) {
      const result = await updateGroup(group.id, {
        name: group.name,
        description: group.description,
        visibility: group.visibility,
        imageBase64: group.imageBase64,
        imageUri: group.imageUri,
      });

      if (result) {
        setToast({ visible: true, text: "Group updated successfully!", type: "success" });
        await refresh();
        return true;
      }

      setToast({ visible: true, text: "Failed to update group", type: "error" });
      return false;
    }

    const result = await createGroup({
      name: group.name,
      description: group.description,
      visibility: group.visibility,
      imageBase64: group.imageBase64,
      imageUri: group.imageUri,
    });

    if (result) {
      setToast({ visible: true, text: "Group created successfully!", type: "success" });
      await refresh();
      return true;
    }

    setToast({ visible: true, text: "Failed to create group", type: "error" });
    return false;
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
    setEditingGroup(null);
  };

  const handleLeaveGroup = async (groupId: string) => {
    // Use the explore groups hook to leave group
    // For now, we'll use the communityAPI directly
    try {
      const { communityAPI } = await import("../utils/communityAPI");
      const response = await communityAPI.leaveGroup(groupId);
      if (response.success) {
        // Refresh groups list
        await refresh();
        setToast({ visible: true, text: "You left the group", type: "success" });
        setShowDelete(false);
        setMenuVisible(false);
      } else {
        setToast({ visible: true, text: "Failed to leave group", type: "error" });
      }
    } catch (error) {
      setToast({ visible: true, text: "Error leaving group", type: "error" });
    }
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
        paddingTop: 36,
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
            {loading && (!groups || groups.length === 0) ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
                <ActivityIndicator size="large" color="#1C8E79" />
                <Text style={{ marginTop: 16, fontSize: 16, color: '#6B7280', fontFamily: 'Rubik-Regular' }}>Loading groups...</Text>
              </View>
            ) : error && (!groups || groups.length === 0) && loading === false ? (
              // Only show error if we're not loading and we have an actual error (not just empty result)
              // Check if it's a real error vs just no groups
              error.code === "HTTP_ERROR" && error.error?.includes("404") ? (
                // Treat 404 as empty state, not error
                renderEmptyState()
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 }}>
                  <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginTop: 16, fontFamily: 'Rubik-Bold' }}>Error loading groups</Text>
                  <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, fontFamily: 'Rubik-Regular' }}>{error.error}</Text>
                  <TouchableOpacity
                    style={{ backgroundColor: '#1C8E79', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 16 }}
                    onPress={refresh}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', fontFamily: 'Rubik-SemiBold' }}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )
            ) : (!groups || groups.length === 0) ? (
              renderEmptyState()
            ) : (
              <FlatList
                style={{ flex: 1 }}
                data={groups}
                keyExtractor={(item, index) => {
                  if (item?._id) return item._id;
                  if (item?.id) return String(item.id);
                  return `group-${index}`;
                }}
                showsVerticalScrollIndicator={false}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                onEndReached={() => {
                  if (!loading && hasMore) {
                    loadMore();
                  }
                }}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                  loading && groups && groups.length > 0 ? (
                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#1C8E79" />
                    </View>
                  ) : null
                }
                contentContainerStyle={{ paddingBottom: 120 }}
                renderItem={({ item }) => (
                  <View style={{ backgroundColor: '#E9F1EF', borderRadius: 16, padding: 16, marginHorizontal: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                    {/* Icon/Image */}
                    <View style={{ width: 60, height: 60, borderRadius: 30, overflow: 'hidden', backgroundColor: '#CBD5D1', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                      {item.profileImageUrl ? (
                        <Image source={{ uri: item.profileImageUrl }} style={{ width: 60, height: 60 }} />
                      ) : (
                        <Ionicons name="people" size={28} color="#FFFFFF" />
                      )}
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#000', marginBottom: 4, fontFamily: 'Rubik-Bold' }}>{item.name}</Text>
                      <Text style={{ fontSize: 14, color: '#666', lineHeight: 20, fontFamily: 'Rubik-Regular' }} numberOfLines={2}>{item.description || 'Group'}</Text>
                      <Text style={{ marginTop: 6, color: '#6B7280', fontSize: 12, fontFamily: 'Rubik-Regular' }}>{`${(item.membersCount || 0).toLocaleString()} Members`}</Text>
                    </View>

                    {/* Menu trigger */}
                    <TouchableOpacity onPress={() => { setMenuGroup(item); setMenuVisible(true); }} activeOpacity={0.8} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="ellipsis-vertical" size={18} color="#0F172A" />
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}

            {/* FAB */}
            <TouchableOpacity onPress={() => { setEditingGroup(null); setShowCreateModal(true); }} activeOpacity={0.8} style={{ position: 'absolute', right: 24, bottom: 64, width: 56, height: 56, borderRadius: 28, backgroundColor: '#1C8E79', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 6 }}>
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Menu Modal */}
            <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
              <TouchableOpacity activeOpacity={1} onPress={() => setMenuVisible(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ width: 168, height: 208, backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 8 }}>
                  {menuGroup ? (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: '#CBD5D1', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                          {menuGroup.profileImageUrl ? (
                            <Image source={{ uri: menuGroup.profileImageUrl }} style={{ width: 40, height: 40 }} />
                          ) : (
                            <Ionicons name="people" size={20} color="#FFFFFF" />
                          )}
                        </View>
                        <Text style={{ flex: 1, fontFamily: 'Rubik-Bold', color: '#0F172A', fontSize: 12 }} numberOfLines={2}>
                          {menuGroup.name}
                        </Text>
                      </View>
                      <View style={{ height: 1, backgroundColor: '#E4E7EC', marginHorizontal: 12, marginBottom: 4 }} />
                      <TouchableOpacity activeOpacity={0.8} style={{ paddingVertical: 10, paddingHorizontal: 16 }} onPress={() => { setMenuVisible(false); router.push({ pathname: '/screens/GroupChatScreen', params: { groupId: menuGroup._id, groupTitle: menuGroup.name, groupDescription: menuGroup.description, groupMembers: String(menuGroup.membersCount || 0) } }); }}>
                        <Text style={{ fontFamily: 'Rubik-Bold', color: '#0F172A', fontSize: 12 }}>Group Details</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        disabled={(menuGroup.userRole || menuGroup.role || "").toLowerCase() !== 'admin'}
                        style={{ paddingVertical: 10, paddingHorizontal: 16, opacity: (menuGroup.userRole || menuGroup.role || "").toLowerCase() === 'admin' ? 1 : 0.5 }}
                        onPress={() => {
                          if ((menuGroup.userRole || menuGroup.role || "").toLowerCase() === 'admin') {
                            setMenuVisible(false);
                            setEditingGroup(menuGroup);
                            setShowCreateModal(true);
                          }
                        }}
                      >
                        <Text style={{ fontFamily: 'Rubik-Bold', fontSize: 12, color: (menuGroup.userRole || menuGroup.role || "").toLowerCase() === 'admin' ? '#0F172A' : '#98A2B3' }}>Edit group Details</Text>
                      </TouchableOpacity>
                      <TouchableOpacity activeOpacity={0.8} style={{ paddingVertical: 10, paddingHorizontal: 16 }} onPress={() => { setMenuVisible(false); setShowDelete(true); }}>
                        <Text style={{ fontFamily: 'Rubik-Bold', color: '#DC2626', fontSize: 12 }}>Delete group</Text>
                      </TouchableOpacity>
                      <TouchableOpacity activeOpacity={0.8} style={{ paddingVertical: 10, paddingHorizontal: 16 }} onPress={() => { setMenuVisible(false); setShowFlag(true); }}>
                        <Text style={{ fontFamily: 'Rubik-Bold', color: '#DC2626', fontSize: 12 }}>Flag group</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}
                </View>
              </TouchableOpacity>
            </Modal>

              <CreateGroupModal
                visible={showCreateModal}
                onClose={handleModalClose}
                mode={editingGroup ? "edit" : "create"}
                initialGroup={
                  editingGroup
                    ? {
                        id: editingGroup._id,
                        name: editingGroup.name,
                        description: editingGroup.description,
                        visibility: editingGroup.visibility || (editingGroup.isPublic ? "public" : "private"),
                        profileImageUrl: editingGroup.profileImageUrl,
                      }
                    : undefined
                }
                onSubmit={handleGroupModalSubmit}
              />
            <DeleteGroupModal visible={showDelete} onClose={() => setShowDelete(false)} onDelete={async () => { if (menuGroup) { await handleLeaveGroup(menuGroup._id); } }} />
            <FlagGroupModal visible={showFlag} onClose={() => setShowFlag(false)} onSubmit={() => { setShowFlag(false); setToast({ visible: true, text: 'Submitted. Thank you', type: 'success' }); }} />
            <TopToast visible={toast.visible} text={toast.text} type={toast.type} topOffset={headerOffset} onClose={() => setToast({ ...toast, visible: false })} />
          </>
        ) : null}
      </View>

      </SafeAreaView>
    </Animated.View>
  );
}
