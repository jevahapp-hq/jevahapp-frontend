/**
 * App-local Expo Router context (default).
 * Excludes co-located non-route folders under app/ from the route map.
 */
export const ctx = require.context(
  process.env.EXPO_ROUTER_APP_ROOT,
  true,
  // Exclude: utils|hooks|services|store|components|context|types|api|lib|constants|helpers|styles
  // Also exclude root +html / *+api (same as expo-router default).
  /^(?:\.\/)(?!(?:.*\/)?(?:utils|hooks|services|store|components|context|types|api|lib|constants|helpers|styles)\/)(?!(?:(?:(?:.*\+api)|(?:\+html)))\.[tj]sx?$).*\.[tj]sx?$/
);
