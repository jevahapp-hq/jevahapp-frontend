const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * react-native-screens 4.26 calls setupFabric during module init and casts
 * a missing FabricUIManager. On a slow cold start that cast throws:
 * null cannot be cast to non-null type FabricUIManager (RNSModule).
 * onHostResume already calls setupFabric again, so returning early is safe.
 */
const UNSAFE =
  "UIManagerHelper.getUIManager(reactContext, UIManagerType.FABRIC) as FabricUIManager";
const SAFE =
  "UIManagerHelper.getUIManager(reactContext, UIManagerType.FABRIC) as? FabricUIManager ?: return";

function withScreensFabricGuard(config) {
  return withDangerousMod(config, [
    "android",
    (mod) => {
      const file = path.join(
        mod.modRequest.projectRoot,
        "node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreensModule.kt",
      );
      if (!fs.existsSync(file)) return mod;
      const src = fs.readFileSync(file, "utf8");
      if (!src.includes(UNSAFE) || src.includes("as? FabricUIManager")) return mod;
      fs.writeFileSync(file, src.replace(UNSAFE, SAFE));
      return mod;
    },
  ]);
}

module.exports = withScreensFabricGuard;
