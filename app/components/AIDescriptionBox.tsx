import { Feather, Ionicons } from "@expo/vector-icons";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface AIDescriptionBoxProps {
  description?: string;
  enhancedDescription?: string;
  bibleVerses?: string[];
  title: string;
  authorName: string;
  contentType: string;
  category?: string;
}

const { width } = Dimensions.get("window");

const AIDescriptionBox = memo(function AIDescriptionBox({
  description,
  enhancedDescription,
  bibleVerses = [],
  title,
  authorName,
  contentType,
  category,
}: AIDescriptionBoxProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showVerses, setShowVerses] = useState(false);
  const [typewriterText, setTypewriterText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const typewriterRef = useRef<NodeJS.Timeout | null>(null);
  const currentText =
    description ||
    enhancedDescription ||
    `Discover the spiritual wisdom in "${title}" by ${authorName}.`;

  // Memoize expensive calculations
  const contentColor = useMemo(
    () => getContentColor(contentType),
    [contentType]
  );
  const hasEnhancedDescription = useMemo(
    () => enhancedDescription && enhancedDescription !== description,
    [enhancedDescription, description]
  );
  const hasVerses = useMemo(
    () => bibleVerses && bibleVerses.length > 0,
    [bibleVerses]
  );

  // Typewriter effect
  useEffect(() => {
    if (isExpanded && currentText) {
      setIsTyping(true);
      setTypewriterText("");

      let index = 0;
      const speed = 30; // milliseconds per character

      typewriterRef.current = setInterval(() => {
        if (index < currentText.length) {
          setTypewriterText(currentText.substring(0, index + 1));
          index++;
        } else {
          setIsTyping(false);
          if (typewriterRef.current) {
            clearInterval(typewriterRef.current);
          }
        }
      }, speed);
    }

    return () => {
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
      }
    };
  }, [isExpanded, currentText]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    Animated.timing(fadeAnim, {
      toValue: isExpanded ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const toggleVerses = () => {
    setShowVerses(!showVerses);
  };

  function getContentIcon(contentType: string) {
    switch (contentType) {
      case "videos":
        return "play-circle";
      case "audio":
      case "music":
        return "headphones";
      case "books":
      case "ebook":
        return "book-open";
      case "sermon":
        return "person";
      default:
        return "sparkles";
    }
  }

  function getContentColor(contentType: string) {
    switch (contentType) {
      case "videos":
        return "#FEA74E";
      case "audio":
      case "music":
        return "#FEA74E";
      case "books":
      case "ebook":
        return "#059669";
      case "sermon":
        return "#DC2626";
      default:
        return "#6B7280";
    }
  }

  return (
    <View style={styles.container}>
      {/* Header with AI Icon */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: contentColor }]}>
          <Ionicons name="sparkles" size={16} color="white" />
        </View>
        <Text style={styles.headerText}>AI Spiritual Insight</Text>
        <TouchableOpacity onPress={toggleExpanded} style={styles.expandButton}>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>

      {/* Main Description with Typewriter Effect */}
      <View style={styles.descriptionContainer}>
        <Text style={styles.description}>
          {typewriterText}
          {isTyping && <Text style={styles.cursor}>|</Text>}
        </Text>
      </View>

      {/* Expanded Content */}
      <Animated.View
        style={[
          styles.expandedContent,
          {
            opacity: fadeAnim,
            maxHeight: isExpanded ? 1000 : 0,
          },
        ]}
      >
        {/* Enhanced Description */}
        {hasEnhancedDescription && (
          <View style={styles.enhancedSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb" size={16} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Deeper Insight</Text>
            </View>
            <Text style={styles.enhancedDescription}>
              {enhancedDescription}
            </Text>
          </View>
        )}

        {/* Bible Verses */}
        {hasVerses && (
          <View style={styles.versesSection}>
            <TouchableOpacity
              onPress={toggleVerses}
              style={styles.versesHeader}
            >
              <View style={styles.sectionHeader}>
                <Ionicons name="book" size={16} color="#DC2626" />
                <Text style={styles.sectionTitle}>
                  Related Scripture ({bibleVerses.length})
                </Text>
              </View>
              <Ionicons
                name={showVerses ? "chevron-up" : "chevron-down"}
                size={16}
                color="#6B7280"
              />
            </TouchableOpacity>

            {showVerses && (
              <View style={styles.versesList}>
                {bibleVerses.map((verse, index) => (
                  <View key={index} style={styles.verseItem}>
                    <Text style={styles.verseReference}>{verse}</Text>
                    <TouchableOpacity style={styles.verseButton}>
                      <Feather name="external-link" size={14} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Content Type Info */}
        <View style={styles.contentTypeInfo}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name={getContentIcon(contentType)}
              size={16}
              color={contentColor}
            />
            <Text style={styles.sectionTitle}>Content Type</Text>
          </View>
          <Text style={styles.contentTypeText}>
            {contentType.charAt(0).toUpperCase() + contentType.slice(1)} •
            Spiritual{" "}
            {contentType === "videos"
              ? "Teaching"
              : contentType === "audio"
              ? "Message"
              : contentType === "music"
              ? "Worship"
              : "Content"}
          </Text>
        </View>
      </Animated.View>

      {/* Expand/Collapse Button */}
      <TouchableOpacity
        onPress={toggleExpanded}
        style={styles.expandButtonFull}
      >
        <Text style={styles.expandButtonText}>
          {isExpanded ? "Show Less" : "Show More"}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

export default AIDescriptionBox;

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginHorizontal: 12,
    backgroundColor: "#FEFEFE",
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#E5E7EB",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  headerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    fontFamily: "Rubik-SemiBold",
  },
  expandButton: {
    padding: 4,
  },
  descriptionContainer: {
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: "#4B5563",
    fontFamily: "Rubik-Regular",
  },
  cursor: {
    color: "#FEA74E",
    fontWeight: "bold",
    fontSize: 16,
  },
  expandedContent: {
    overflow: "hidden",
  },
  enhancedSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  versesSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  versesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  versesList: {
    marginTop: 8,
  },
  verseItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#FEF7F0",
    borderRadius: 6,
    marginBottom: 4,
  },
  verseReference: {
    fontSize: 12,
    fontWeight: "500",
    color: "#DC2626",
    fontFamily: "Rubik-Medium",
  },
  verseButton: {
    padding: 2,
  },
  contentTypeInfo: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 6,
    fontFamily: "Rubik-SemiBold",
  },
  enhancedDescription: {
    fontSize: 12,
    lineHeight: 16,
    color: "#4B5563",
    fontStyle: "italic",
    fontFamily: "Rubik-Regular",
  },
  contentTypeText: {
    fontSize: 11,
    color: "#6B7280",
    fontFamily: "Rubik-Regular",
  },
  expandButtonFull: {
    alignItems: "center",
    paddingVertical: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    fontFamily: "Rubik-Medium",
  },
});
