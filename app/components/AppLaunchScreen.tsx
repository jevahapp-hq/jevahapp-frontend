import { useEffect, useState } from "react";
import { Image, StyleSheet, useWindowDimensions, View } from "react-native";
import {
  hideNativeSplash,
  subscribeAppReady,
} from "../../src/shared/utils/appSplash";

/** White screen, Jevah icon, app name — same layout as the native splash. */
export default function AppLaunchScreen() {
  return (
    <View style={styles.root}>
      <LaunchMark />
    </View>
  );
}

/** Covers the app until Home is ready, so loading stays on this screen. */
export function AppLaunchGate() {
  const { width, height } = useWindowDimensions();
  const [visible, setVisible] = useState(true);

  useEffect(() => subscribeAppReady(() => setVisible(false)), []);

  if (!visible) return null;

  return (
    <View
      onLayout={hideNativeSplash}
      style={[styles.gate, { width, height }]}
    >
      <LaunchMark />
    </View>
  );
}

function LaunchMark() {
  return (
    <Image
      source={require("../../assets/images/splash-logo.png")}
      style={styles.mark}
      resizeMode="contain"
      accessibilityLabel="jevah-app"
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  mark: {
    width: 230,
    height: 248,
  },
  // Pin to the window. `bottom: 0` plus a flex child was stretching this
  // overlay to twice the screen and painting a second logo on the bottom edge.
  gate: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 100,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
});
