const { withGradleProperties } = require("@expo/config-plugins");

/** Stops AAPT2 from emitting colliding short res/* names that Tecno PackageInstaller rejects. */
function withAndroidNoDupResources(config) {
  return withGradleProperties(config, (mod) => {
    const key = "android.enableResourceOptimizations";
    mod.modResults = mod.modResults.filter(
      (item) => !(item.type === "property" && item.key === key)
    );
    mod.modResults.push({ type: "property", key, value: "false" });
    return mod;
  });
}

module.exports = withAndroidNoDupResources;
