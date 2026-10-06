const svgExpo = require("react-native-svg-transformer/expo");

/**
 * Expo only keeps `asyncRoutes` while transforming `expo-router/_ctx*`.
 * This app replaces that file with `scripts/expo-router-ctx`, so the flag
 * was stripped and every Android route still evaluated on refresh.
 * Restoring it here makes Android dev bundles lazy. Native production
 * stays eager inside babel-preset-expo.
 */
function transform(args) {
  const filename = String(args.filename || "").replace(/\\/g, "/");
  if (filename.includes("/scripts/expo-router-ctx/_ctx.android.")) {
    const options = args.options || {};
    const dev = options.dev !== false;
    let src = args.src;
    // Babel was still emitting a sync route map, so every Android refresh
    // downloaded all 5,300 modules. Dev loads a screen when it opens.
    // Release builds keep the env flag, which stays sync.
    if (dev && typeof src === "string") {
      src = src.replace("process.env.EXPO_ROUTER_IMPORT_MODE", '"lazy"');
    }
    args = {
      ...args,
      src,
      options: {
        ...options,
        customTransformOptions: {
          ...(options.customTransformOptions || {}),
          asyncRoutes: dev ? "true" : options.customTransformOptions?.asyncRoutes,
        },
      },
    };
  }
  return svgExpo.transform(args);
}

module.exports = { transform };
