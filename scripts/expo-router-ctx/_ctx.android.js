/**
 * App-local Expo Router context (android).
 * Excludes co-located non-route folders and helper files under app/.
 * Android dev loads each screen when it opens.
 */
export const ctx = require.context(
  process.env.EXPO_ROUTER_APP_ROOT,
  true,
  /^(?:\.\/)(?!(?:.*\/)?(?:utils|hooks|services|store|components|context|types|api|lib|constants|helpers|styles)\/)(?!(?:.*\/)?[^/]*\.test\.[tj]sx?$)(?!(?:.*\/)?(?:types|constants|styles)\.[tj]sx?$)(?!(?:.*\/)?use[A-Z][^/]*\.[tj]sx?$)(?!(?:.*\/)[^/]*(?:Formatters|transform)[^/]*\.[tj]sx?$)(?!(?:.*\/)(?:LegalDocument|MusicLaneTabs|reelAudible|reelFrame|reelMedia|reelPlayheadStore|reelPlayerQueue|reelScrollIndex|ebookNarrationSync|pdfPageFromTap|avatarTypes|buildEbookChapters|pdfJsExtractorHtml)\.[tj]sx?$)(?!(?:(?:(?:.*\+api)|(?:\+html)|(?:\+middleware)))\.[tj]sx?$).*(?:\.ios|\.web)?\.[tj]sx?$/,
  process.env.EXPO_ROUTER_IMPORT_MODE
);
