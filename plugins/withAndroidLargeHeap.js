const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Budget Androids cap the app heap at 128MB. One video decoder plus images
 * fills that and the process dies with OutOfMemoryError. largeHeap raises
 * the cap (often to 256MB) on the next native build.
 */
function withAndroidLargeHeap(config) {
  return withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application?.[0];
    if (app?.$) {
      app.$["android:largeHeap"] = "true";
    }
    return mod;
  });
}

module.exports = withAndroidLargeHeap;
