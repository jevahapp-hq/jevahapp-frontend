/**
 * App-local Expo Router context (default).
 * Excludes co-located non-route folders and helper files under app/.
 */
export const ctx = require.context(
  process.env.EXPO_ROUTER_APP_ROOT,
  true,
  // Exclude: utils|hooks|services|store|components|context|types|api|lib|constants|helpers|styles folders
  // Exclude helper files: types.ts, constants.ts, styles.ts, useX hooks, *Formatters, transform*, colocated components
  /^(?:\.\/)(?!(?:.*\/)?(?:utils|hooks|services|store|components|context|types|api|lib|constants|helpers|styles)\/)(?!(?:.*\/)?(?:types|constants|styles)\.[tj]sx?$)(?!(?:.*\/)?use[A-Z][^/]*\.[tj]sx?$)(?!(?:.*\/)[^/]*(?:Formatters|transform)[^/]*\.[tj]sx?$)(?!(?:.*\/)(?:LegalDocument|MusicLaneTabs)\.[tj]sx?$)(?!(?:(?:(?:.*\+api)|(?:\+html)))\.[tj]sx?$).*\.[tj]sx?$/
);
