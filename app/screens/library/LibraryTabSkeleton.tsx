import { StyleSheet, View } from "react-native";
import Skeleton from "../../../src/shared/components/Skeleton/Skeleton";
import { getResponsiveSpacing } from "../../../utils/responsive";

/** Chip widths approximate ALL / SERMON / MUSIC / E-BOOKS / VIDEO / PLAYLISTS */
const CHIP_WIDTHS = [58, 92, 82, 96, 78, 104];
const GRID_ROWS = 3;

/**
 * Loading placeholder for the Library tab.
 *
 * Mirrors LibraryScreen's header, search field and category rail, then the
 * two-column 232px card grid that AllLibrary renders for the default
 * "ALL" category.
 */
export default function LibraryTabSkeleton() {
  const pagePad = getResponsiveSpacing(16, 20, 24, 32);
  const railPadV = getResponsiveSpacing(12, 16, 20, 24);
  const railMarginTop = getResponsiveSpacing(20, 24, 28, 32);
  const chipGap = getResponsiveSpacing(4, 6, 8, 10);

  return (
    <View style={styles.root}>
      {/* "My Library" */}
      <View style={{ paddingHorizontal: pagePad }}>
        <Skeleton
          width={168}
          height={26}
          borderRadius={8}
          style={styles.title}
        />
      </View>

      {/* Search field */}
      <View style={{ paddingHorizontal: pagePad, marginTop: 12 }}>
        <Skeleton height={42} borderRadius={12} />
      </View>

      {/* Category rail */}
      <View style={[styles.rail, { paddingHorizontal: pagePad }]}>
        <View
          style={{
            flexDirection: "row",
            paddingVertical: railPadV,
            marginTop: railMarginTop,
          }}
        >
          {CHIP_WIDTHS.map((w, i) => (
            <Skeleton
              key={i}
              width={w}
              height={44}
              borderRadius={8}
              style={{ marginHorizontal: chipGap }}
            />
          ))}
        </View>
      </View>

      {/* Two-column card grid */}
      <View style={styles.grid}>
        {Array.from({ length: GRID_ROWS }).map((_, row) => (
          <View key={row} style={styles.gridRow}>
            <Skeleton width="48%" height={232} borderRadius={12} />
            <Skeleton width="48%" height={232} borderRadius={12} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  title: { marginTop: 48 },
  rail: { backgroundColor: "#FCFCFD" },
  grid: {
    flex: 1,
    width: "100%",
    backgroundColor: "#FCFCFD",
    paddingHorizontal: 12,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
});
