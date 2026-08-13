/**
 * App-local Expo Router context (ios).
 * Excludes co-located non-route folders under app/ from the route map.
 */
export const ctx = require.context(
  process.env.EXPO_ROUTER_APP_ROOT,
  true,
  /^(?:\.\/)(?!(?:.*\/)?(?:utils|hooks|services|store|components|context|types|api|lib|constants|helpers|styles)\/)(?!(?:(?:(?:.*\+api)|(?:\+html)|(?:\+middleware)))\.[tj]sx?$).*(?:\.android|\.web)?\.[tj]sx?$/,
  process.env.EXPO_ROUTER_IMPORT_MODE
);
