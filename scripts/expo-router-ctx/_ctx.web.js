/**
 * App-local Expo Router context (web).
 * Excludes co-located non-route folders under app/ from the route map.
 */
export const ctx = require.context(
  process.env.EXPO_ROUTER_APP_ROOT,
  true,
  /^(?:\.\/)(?!(?:.*\/)?(?:utils|hooks|services|store|components|context|types|api|lib|constants|helpers|styles)\/)(?!(?:(?:(?:.*\+api)|(?:\+middleware)|(?:\+(html|native-intent))))\.[tj]sx?$).*(?:\.android|\.ios|\.native)?\.[tj]sx?$/,
  process.env.EXPO_ROUTER_IMPORT_MODE
);
