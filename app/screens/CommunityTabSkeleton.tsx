import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Skeleton from "../../src/shared/components/Skeleton/Skeleton";

const FEATURE_ROWS = 6;

/**
 * Loading placeholder for the Community tab.
 *
 * Mirrors CommunityScreen's header block, the "in development" notice card
 * and the divided feature list, so the real screen swaps in without shift.
 */
export default function CommunityTabSkeleton() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {/* Eyebrow / title / subtitle */}
      <View style={[styles.header, { paddingTop: insets.top + 28 }]}>
        <Skeleton width={62} height={11} borderRadius={5} />
        <Skeleton
          width={228}
          height={32}
          borderRadius={8}
          style={styles.title}
        />
        <Skeleton height={14} borderRadius={7} style={styles.sub} />
        <Skeleton width="62%" height={14} borderRadius={7} />
      </View>

      <View style={styles.body}>
        {/* Notice card */}
        <View style={styles.notice}>
          <Skeleton width={116} height={24} borderRadius={999} />
          <Skeleton height={18} borderRadius={8} style={styles.noticeTitle} />
          <Skeleton width="78%" height={18} borderRadius={8} />
          <Skeleton height={13} borderRadius={6} style={styles.noticeBody} />
          <Skeleton width="88%" height={13} borderRadius={6} />
        </View>

        {/* Section label */}
        <Skeleton
          width={96}
          height={11}
          borderRadius={5}
          style={styles.sectionLabel}
        />

        {/* Feature list */}
        <View style={styles.list}>
          {Array.from({ length: FEATURE_ROWS }).map((_, i) => (
            <View
              key={i}
              style={[styles.row, i === FEATURE_ROWS - 1 && styles.rowLast]}
            >
              <Skeleton width={40} height={40} borderRadius={12} />
              <View style={styles.rowCopy}>
                <Skeleton width={124} height={15} borderRadius={7} />
                <Skeleton
                  width="82%"
                  height={12}
                  borderRadius={6}
                  style={styles.rowDesc}
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 22,
  },
  title: { marginTop: 8, marginBottom: 10 },
  sub: { marginBottom: 6 },
  body: { paddingHorizontal: 20 },
  notice: {
    backgroundColor: "#F7F9F9",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E7EDEC",
    marginBottom: 32,
  },
  noticeTitle: { marginTop: 14, marginBottom: 8 },
  noticeBody: { marginTop: 10, marginBottom: 8 },
  sectionLabel: { marginBottom: 12 },
  list: {
    borderTopWidth: 1,
    borderTopColor: "#F0F2F5",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  rowLast: { borderBottomWidth: 0 },
  rowCopy: { flex: 1, marginLeft: 14 },
  rowDesc: { marginTop: 6 },
});
