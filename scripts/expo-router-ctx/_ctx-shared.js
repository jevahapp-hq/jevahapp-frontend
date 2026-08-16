/**
 * App-local Expo Router shared context ignore regex (typed routes).
 * Excludes co-located non-route folders and helper files under app/.
 */
module.exports = {
  EXPO_ROUTER_CTX_IGNORE:
    /^(?:\.\/)(?!(?:.*\/)?(?:utils|hooks|services|store|components|context|types|api|lib|constants|helpers|styles)\/)(?!(?:.*\/)?(?:types|constants|styles)\.[tj]sx?$)(?!(?:.*\/)?use[A-Z][^/]*\.[tj]sx?$)(?!(?:.*\/)[^/]*(?:Formatters|transform)[^/]*\.[tj]sx?$)(?!(?:.*\/)(?:LegalDocument|MusicLaneTabs)\.[tj]sx?$)(?!(?:(?:(?:.*\+api)|(?:\+(html|native-intent))))\.[tj]sx?$).*\.[tj]sx?$/,
};
