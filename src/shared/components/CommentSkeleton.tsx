import React from "react";
import { View, StyleSheet } from "react-native";
import Skeleton from "./Skeleton/Skeleton";

interface CommentSkeletonProps {
  count?: number;
}

export const CommentSkeleton: React.FC<CommentSkeletonProps> = ({ count = 3 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.commentContainer}>
          {/* Avatar skeleton */}
          <Skeleton variant="avatar" width={28} height={28} borderRadius={14} />
          
          <View style={styles.commentContent}>
            {/* Name and timestamp row with like button */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={styles.nameRow}>
                <Skeleton width={100} height={13} borderRadius={4} />
                <Skeleton width={50} height={10} borderRadius={4} style={styles.timestamp} />
              </View>
              <Skeleton width={50} height={16} borderRadius={4} />
            </View>
            
            {/* Comment text lines */}
            <View style={styles.commentTextContainer}>
              <Skeleton width="100%" height={14} borderRadius={4} style={styles.commentLine} />
              <Skeleton width="85%" height={14} borderRadius={4} style={styles.commentLine} />
              {index % 2 === 0 && (
                <Skeleton width="70%" height={14} borderRadius={4} style={styles.commentLine} />
              )}
            </View>
          </View>
        </View>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  commentContainer: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  commentContent: {
    flex: 1,
    marginLeft: 8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  timestamp: {
    marginLeft: 6,
  },
  commentTextContainer: {
    marginTop: 8,
    marginLeft: 36,
    marginBottom: 8,
  },
  commentLine: {
    marginBottom: 6,
  },
  actionsRow: {
    marginTop: 4,
  },
});

export default CommentSkeleton;

