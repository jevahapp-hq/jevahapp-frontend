import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { BibleBook, BibleChapter } from "../../services/bibleApiService";

interface BibleFloatingNavProps {
  book: BibleBook | null;
  currentChapter: number;
  chapters: BibleChapter[];
  onChapterSelect: (chapter: BibleChapter) => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
  onScreenTap?: () => void;
}

export interface BibleFloatingNavRef {
  showArrow: () => void;
  toggleArrow: () => void;
}

const BibleFloatingNav = forwardRef<BibleFloatingNavRef, BibleFloatingNavProps>(({
  book,
  currentChapter,
  chapters,
  onChapterSelect,
  onNavigatePrev,
  onNavigateNext,
  canNavigatePrev,
  canNavigateNext,
  onScreenTap,
}, ref) => {
  const [showChapterPicker, setShowChapterPicker] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const slideX = useRef(new Animated.Value(0)).current;
  const arrowOpacity = useRef(new Animated.Value(1)).current;
  const [isArrowVisible, setIsArrowVisible] = useState(true);

  const toggleHide = () => {
    const nextHidden = !isHidden;
    setIsHidden(nextHidden);
    Animated.timing(slideX, {
      toValue: nextHidden ? Dimensions.get("window").width : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
    
    // Hide arrow when nav bar is hidden, show when nav bar is shown
    if (nextHidden) {
      setIsArrowVisible(false);
      Animated.timing(arrowOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    } else {
      setIsArrowVisible(true);
      Animated.timing(arrowOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  };

  const toggleArrow = () => {
    const shouldShow = !isArrowVisible;
    setIsArrowVisible(shouldShow);
    Animated.timing(arrowOpacity, {
      toValue: shouldShow ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const showArrow = () => {
    if (!isArrowVisible) {
      toggleArrow();
    }
  };

  // Expose showArrow and toggleArrow via ref
  useImperativeHandle(ref, () => ({
    showArrow,
    toggleArrow,
  }));

  const handleChapterPress = (chapter: BibleChapter) => {
    onChapterSelect(chapter);
    setShowChapterPicker(false);
  };

  const renderChapterPicker = () => {
    if (!book || chapters.length === 0) return null;

    // Group chapters in rows of 5
    const chunkSize = 5;
    const chapterRows = [];
    for (let i = 0; i < chapters.length; i += chunkSize) {
      chapterRows.push(chapters.slice(i, i + chunkSize));
    }

    return (
      <Modal
        visible={showChapterPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChapterPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowChapterPicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {book.name} - Select Chapter
              </Text>
              <TouchableOpacity onPress={() => setShowChapterPicker(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.chaptersScroll}
              contentContainerStyle={styles.chaptersGrid}
              showsVerticalScrollIndicator={false}
            >
              {chapterRows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.chapterRow}>
                  {row.map((chapter) => {
                    const isCurrent = chapter.chapterNumber === currentChapter;
                    return (
                      <TouchableOpacity
                        key={chapter._id}
                        style={[
                          styles.chapterButton,
                          isCurrent && styles.chapterButtonActive,
                        ]}
                        onPress={() => handleChapterPress(chapter)}
                      >
                        <Text
                          style={[
                            styles.chapterButtonText,
                            isCurrent && styles.chapterButtonTextActive,
                          ]}
                        >
                          {chapter.chapterNumber}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {/* Fill empty spaces in last row */}
                  {row.length < chunkSize &&
                    Array(chunkSize - row.length)
                      .fill(null)
                      .map((_, i) => (
                        <View key={`empty-${i}`} style={styles.chapterButton} />
                      ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderFloatingNav = () => {
    if (!book) return null;

    const floatingContent = (
      <View style={styles.floatingContainer}>
        {/* Previous Chapter Button */}
        <TouchableOpacity
          style={[
            styles.navButton,
            styles.prevButton,
            !canNavigatePrev && styles.navButtonDisabled,
          ]}
          onPress={onNavigatePrev}
          disabled={!canNavigatePrev}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={canNavigatePrev ? "#FFFFFF" : "#9CA3AF"}
          />
        </TouchableOpacity>

        {/* Current Chapter Display (tappable to open picker) */}
        <TouchableOpacity
          style={styles.currentChapterButton}
          onPress={() => setShowChapterPicker(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.bookName} numberOfLines={1}>
            {book.name}
          </Text>
          <Text style={styles.chapterNumber}>{currentChapter}</Text>
        </TouchableOpacity>

        {/* Next Chapter Button */}
        <TouchableOpacity
          style={[
            styles.navButton,
            styles.nextButton,
            !canNavigateNext && styles.navButtonDisabled,
          ]}
          onPress={onNavigateNext}
          disabled={!canNavigateNext}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={canNavigateNext ? "#FFFFFF" : "#9CA3AF"}
          />
        </TouchableOpacity>
      </View>
    );

    // Use BlurView on native, regular View on web, with inline slide toggle
    if (Platform.OS !== "web") {
      return (
        <View style={styles.outerRow}>
          <Animated.View style={{ transform: [{ translateX: slideX }] }}>
            <BlurView intensity={80} tint="light" style={styles.blurContainer}>
              {floatingContent}
            </BlurView>
          </Animated.View>
          <Animated.View style={{ opacity: arrowOpacity }}>
            <TouchableOpacity style={styles.inlineSlideToggleRight} onPress={toggleHide} activeOpacity={0.8} disabled={!isArrowVisible}>
              <Ionicons name={isHidden ? "chevron-back" : "chevron-forward"} size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      );
    }

    return (
      <View style={styles.outerRow}>
        <Animated.View style={{ transform: [{ translateX: slideX }] }}>
          <View style={[styles.blurContainer, styles.webContainer]}>
            {floatingContent}
          </View>
        </Animated.View>
        <Animated.View style={{ opacity: arrowOpacity }}>
          <TouchableOpacity style={styles.inlineSlideToggleRight} onPress={toggleHide} activeOpacity={0.8} disabled={!isArrowVisible}>
            <Ionicons name={isHidden ? "chevron-back" : "chevron-forward"} size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  return (
    <>
      {renderFloatingNav()}
      {renderChapterPicker()}
    </>
  );
});

BibleFloatingNav.displayName = "BibleFloatingNav";

export default BibleFloatingNav;

const styles = StyleSheet.create({
  outerRow: {
    position: "absolute",
    bottom: 95,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    zIndex: 9999,
  },
  blurContainer: {
    width: 270,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  webContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)",
  },
  floatingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    height: "100%",
    paddingHorizontal: 8,
    backgroundColor: "rgba(37, 110, 99, 0.15)", // Semi-transparent teal
  },
  inlineSlideToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#256E63",
    alignItems: "center",
    justifyContent: "center",
  },
  inlineSlideToggleRight: {
    position: "absolute",
    left: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#256E63",
    alignItems: "center",
    justifyContent: "center",
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#256E63",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  prevButton: {
    marginRight: 8,
  },
  nextButton: {
    marginLeft: 8,
  },
  navButtonDisabled: {
    backgroundColor: "#E5E7EB",
    shadowOpacity: 0,
    elevation: 0,
  },
  currentChapterButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  bookName: {
    fontSize: 12,
    fontFamily: "Rubik_500Medium",
    color: "#1F2937",
    marginBottom: 2,
  },
  chapterNumber: {
    fontSize: 18,
    fontFamily: "Rubik_700Bold",
    color: "#256E63",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "85%",
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Rubik_600SemiBold",
    color: "#1F2937",
  },
  chaptersScroll: {
    maxHeight: 400,
  },
  chaptersGrid: {
    padding: 16,
  },
  chapterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  chapterButton: {
    flex: 1,
    height: 50,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minWidth: 50,
  },
  chapterButtonActive: {
    backgroundColor: "#256E63",
    borderColor: "#256E63",
  },
  chapterButtonText: {
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
    color: "#1F2937",
  },
  chapterButtonTextActive: {
    color: "#FFFFFF",
  },
});
