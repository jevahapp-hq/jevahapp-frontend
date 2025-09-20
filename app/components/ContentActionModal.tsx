import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import {
    Dimensions,
    Modal,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import {
    GestureHandlerRootView,
    HandlerStateChangeEvent,
    PanGestureHandler,
    PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

interface ContentActionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onViewDetails: () => void;
  onSaveToLibrary: () => void;
  onShare: () => void;
  onDownload: () => void;
  isSaved: boolean;
  isDownloaded: boolean;
  contentTitle?: string;
}

export default function ContentActionModal({
  isVisible,
  onClose,
  onViewDetails,
  onSaveToLibrary,
  onShare,
  onDownload,
  isSaved,
  isDownloaded,
  contentTitle = 'Content',
}: ContentActionModalProps) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const lastTranslateY = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0, { 
        damping: 20, 
        stiffness: 100,
        mass: 1,
        overshootClamping: true
      });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, { 
        damping: 20, 
        stiffness: 100,
        mass: 1,
        overshootClamping: true
      });
    }
  }, [isVisible, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const onGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    const { translationY } = event.nativeEvent;
    if (translationY > 0) {
      translateY.value = translationY;
      lastTranslateY.value = translationY;
    }
  };

  const onGestureEnd = (
    _event: HandlerStateChangeEvent<Record<string, unknown>>
  ) => {
    if (lastTranslateY.value > 150) {
      translateY.value = withSpring(SCREEN_HEIGHT, { 
        damping: 20, 
        stiffness: 100,
        mass: 1,
        overshootClamping: true
      });
      runOnJS(onClose)();
    } else {
      translateY.value = withSpring(0, { 
        damping: 20, 
        stiffness: 100,
        mass: 1,
        overshootClamping: true
      });
    }
  };

  const handleClose = () => {
    translateY.value = withSpring(SCREEN_HEIGHT, { 
      damping: 20, 
      stiffness: 100,
      mass: 1,
      overshootClamping: true
    });
    runOnJS(onClose)();
  };

  const handleAction = (action: () => void) => {
    handleClose();
    // Small delay to allow modal to close before executing action
    setTimeout(() => {
      action();
    }, 200);
  };

  const handleShareAction = () => {
    // Execute share without closing modal automatically
    // Let user close modal manually after sharing
    onShare();
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Background overlay */}
      <TouchableWithoutFeedback onPress={handleClose}>
          <View style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.3)' 
          }} />
      </TouchableWithoutFeedback>

      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onGestureEnd}
      >
        <Animated.View
          style={[
            animatedStyle,
            {
              position: "absolute",
              bottom: 0,
              width: SCREEN_WIDTH,
              backgroundColor: 'white',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 24,
              paddingVertical: 24,
              maxHeight: SCREEN_HEIGHT * 0.45,
              minHeight: 320,
            },
          ]}
        >
          {/* Handle */}
            <View style={{ 
              width: 36, 
              height: 4, 
              backgroundColor: '#D1D5DB', 
              alignSelf: 'center', 
              borderRadius: 2, 
              marginBottom: 16, 
              marginTop: 0 
            }} />
          
          {/* Header */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: 20 
            }}>
              <Text style={{ 
                fontSize: 20, 
                fontWeight: '600', 
                color: '#1D2939',
                fontFamily: 'Rubik-SemiBold'
              }}>
              Content Actions
            </Text>
            <TouchableOpacity
              onPress={handleClose}
                style={{ 
                  width: 32, 
                  height: 32, 
                  backgroundColor: '#E5E7EB', 
                  borderRadius: 16, 
                  justifyContent: 'center', 
                  alignItems: 'center' 
                }}
            >
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content Title */}
          <Text 
              style={{ 
                fontSize: 14, 
                color: '#667085', 
                fontFamily: 'Rubik', 
              marginBottom: 16, 
              textAlign: 'center'
              }}
            numberOfLines={2}
          >
            {contentTitle}
          </Text>

          {/* Action Buttons */}
          <View style={{ gap: 8 }}>
            {/* View Details */}
            <TouchableOpacity
              onPress={() => handleAction(onViewDetails)}
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: '#F9FAFB', 
                  borderRadius: 12 
                }}
              activeOpacity={0.7}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ 
                  width: 36, 
                  height: 36, 
                  backgroundColor: '#DBEAFE', 
                  borderRadius: 18, 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  marginRight: 12
                  }}>
                  <Ionicons name="eye-outline" size={18} color="#3B82F6" />
                </View>
                  <Text style={{ 
                fontSize: 14, 
                fontFamily: 'Rubik-SemiBold', 
                color: '#1D2939'
                  }}>
                  View Details
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Save to Library */}
            <TouchableOpacity
              onPress={() => handleAction(onSaveToLibrary)}
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: '#F9FAFB', 
                  borderRadius: 12 
                }}
              activeOpacity={0.7}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ 
                    width: 36, 
                    height: 36, 
                    backgroundColor: '#D1FAE5', 
                    borderRadius: 18, 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    marginRight: 12 
                  }}>
                  <MaterialIcons
                    name={isSaved ? "bookmark" : "bookmark-border"}
                    size={18}
                    color={isSaved ? "#10B981" : "#6B7280"}
                  />
                </View>
                  <Text style={{ 
                fontSize: 14, 
                fontFamily: 'Rubik-SemiBold', 
                color: '#1D2939'
                  }}>
                  {isSaved ? "Remove from Library" : "Save to Library"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity
              onPress={handleShareAction}
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: '#F9FAFB', 
                  borderRadius: 12 
                }}
              activeOpacity={0.7}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ 
                    width: 36, 
                    height: 36, 
                    backgroundColor: '#EDE9FE', 
                    borderRadius: 18, 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    marginRight: 12 
                  }}>
                  <Feather name="send" size={18} color="#8B5CF6" />
                </View>
                  <Text style={{ 
                fontSize: 14, 
                fontFamily: 'Rubik-SemiBold', 
                color: '#1D2939'
                  }}>
                  Share
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Download */}
            <TouchableOpacity
              onPress={() => handleAction(onDownload)}
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: '#F9FAFB', 
                  borderRadius: 12 
                }}
              activeOpacity={0.7}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ 
                    width: 36, 
                    height: 36, 
                    backgroundColor: '#FED7AA', 
                    borderRadius: 18, 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    marginRight: 12 
                  }}>
                  <Ionicons
                    name={isDownloaded ? "checkmark-circle" : "download-outline"}
                    size={18}
                    color={isDownloaded ? "#256E63" : "#F59E0B"}
                  />
                </View>
                  <Text style={{ 
                fontSize: 14, 
                fontFamily: 'Rubik-SemiBold', 
                color: '#1D2939'
                  }}>
                  {isDownloaded ? "Remove Download" : "Download"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
    </Modal>
  );
}