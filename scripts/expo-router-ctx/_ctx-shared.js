/**
 * App-local Expo Router shared context ignore regex (typed routes).
 * Excludes co-located non-route folders under app/.
 */
module.exports = {
  EXPO_ROUTER_CTX_IGNORE:
    /^(?:\.\/)(?!(?:.*\/)?(?:utils|hooks|services|store|components|context|types|api|lib|constants|helpers|styles)\/)(?!(?:(?:(?:.*\+api)|(?:\+(html|native-intent))))\.[tj]sx?$).*\.[tj]sx?$/,
};
