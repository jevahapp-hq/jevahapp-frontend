const path = require("path");
const { withNativeWind } = require("nativewind/metro");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const ROUTER_CTX_DIR = path.resolve(__dirname, "scripts/expo-router-ctx");

function matchExpoRouterCtx(context, moduleName) {
  const name = String(moduleName || "").replace(/\\/g, "/");

  if (name === "expo-router/_ctx-shared") return "shared";
  if (name === "expo-router/_ctx") return "ctx";

  const origin = String(context.originModulePath || "").replace(/\\/g, "/");
  if (!origin.includes("/expo-router/")) return null;

  if (name === "./_ctx-shared" || name.endsWith("/_ctx-shared")) return "shared";
  if (
    name === "./_ctx" ||
    name === "../_ctx" ||
    name === "../../_ctx" ||
    /(^|\/)_ctx$/.test(name)
  ) {
    return "ctx";
  }
  return null;
}

function resolveCtxFile(kind, platform) {
  if (kind === "shared") {
    return path.join(ROUTER_CTX_DIR, "_ctx-shared.js");
  }
  if (platform === "web") return path.join(ROUTER_CTX_DIR, "_ctx.web.js");
  if (platform === "ios") return path.join(ROUTER_CTX_DIR, "_ctx.ios.js");
  if (platform === "android") return path.join(ROUTER_CTX_DIR, "_ctx.android.js");
  return path.join(ROUTER_CTX_DIR, "_ctx.js");
}

module.exports = (() => {
  const config = getSentryExpoConfig(__dirname);

  const { transformer, resolver } = config;
  const upstreamResolveRequest = resolver.resolveRequest;

  config.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve("react-native-svg-transformer"),
  };

  config.resolver = {
    ...resolver,
    assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
    sourceExts: [...resolver.sourceExts, "svg"],
    resolveRequest(context, moduleName, platform) {
      const kind = matchExpoRouterCtx(context, moduleName);
      if (kind) {
        return {
          type: "sourceFile",
          filePath: resolveCtxFile(kind, platform),
        };
      }
      if (typeof upstreamResolveRequest === "function") {
        return upstreamResolveRequest(context, moduleName, platform);
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  };

  return withNativeWind(config, { input: "./global.css" });
})();
