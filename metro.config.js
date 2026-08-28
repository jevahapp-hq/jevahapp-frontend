const fs = require("fs");
const path = require("path");
const { withNativeWind } = require("nativewind/metro");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

function mergeBlockList(existing, extra) {
  if (existing instanceof RegExp) {
    return new RegExp(`(?:${existing.source})|(?:${extra.source})`);
  }
  return extra;
}

const ROUTER_CTX_DIR = path.resolve(__dirname, "scripts/expo-router-ctx");
const NITRO_LIB = path.resolve(
  __dirname,
  "node_modules/react-native-nitro-modules/lib/commonjs"
);
const NITRO_SRC_MARK = "/node_modules/react-native-nitro-modules/src/";
const MMKV_LIB = path.resolve(__dirname, "node_modules/react-native-mmkv/lib");
const MMKV_SRC_MARK = "/node_modules/react-native-mmkv/src/";

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

function firstExisting(candidates) {
  for (const filePath of candidates) {
    if (filePath && fs.existsSync(filePath)) return filePath;
  }
  return null;
}

function libFile(libRoot, relNoExt) {
  return firstExisting([
    path.join(libRoot, `${relNoExt}.js`),
    path.join(libRoot, relNoExt, "index.js"),
  ]);
}

function slash(p) {
  return String(p || "").replace(/\\/g, "/");
}

function rewriteSrcRelativeToLib(originModulePath, moduleName) {
  if (!moduleName.startsWith(".")) return null;
  const origin = slash(originModulePath);
  const specs = [
    { mark: NITRO_SRC_MARK, lib: NITRO_LIB },
    { mark: MMKV_SRC_MARK, lib: MMKV_LIB },
  ];
  for (const spec of specs) {
    const idx = origin.indexOf(spec.mark);
    if (idx === -1) continue;
    const srcRoot = origin.slice(0, idx + spec.mark.length);
    const absSrc = slash(path.resolve(path.dirname(originModulePath), moduleName));
    const rel = path.posix.relative(srcRoot, absSrc).replace(/\.(tsx?|jsx?)$/, "");
    return libFile(spec.lib, rel);
  }
  return null;
}

function rewriteAbsoluteSrc(moduleName) {
  const name = slash(moduleName);
  const specs = [
    { mark: NITRO_SRC_MARK, lib: NITRO_LIB },
    { mark: MMKV_SRC_MARK, lib: MMKV_LIB },
  ];
  for (const spec of specs) {
    const idx = name.indexOf(spec.mark);
    if (idx === -1) continue;
    const after = name
      .slice(idx + spec.mark.length)
      .replace(/\.(tsx?|jsx?)$/, "");
    return libFile(spec.lib, after || "index");
  }
  return null;
}

function asSource(filePath) {
  if (!filePath) return null;
  return { type: "sourceFile", filePath };
}

const STORE_ROOT = path.resolve(__dirname, "src/store");

function rewriteLegacyAppStoreRelative(originModulePath, moduleName) {
  if (!moduleName || moduleName[0] !== ".") return null;
  const abs = path.resolve(path.dirname(originModulePath), moduleName);
  const appStoreRoot = path.resolve(__dirname, "app", "store");
  const rel = path.relative(appStoreRoot, abs);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  const rest = slash(rel).replace(/\.(tsx?|jsx?)$/, "");
  return firstExisting([
    path.join(STORE_ROOT, `${rest}.tsx`),
    path.join(STORE_ROOT, `${rest}.ts`),
    path.join(STORE_ROOT, rest, "index.tsx"),
    path.join(STORE_ROOT, rest, "index.ts"),
  ]);
}

function resolveStoreAlias(moduleName) {
  const name = slash(moduleName);
  let rest = null;
  if (name === "@/store" || name === "src/store") rest = "";
  else if (name.startsWith("@/store/")) rest = name.slice("@/store/".length);
  else if (name.startsWith("src/store/")) rest = name.slice("src/store/".length);
  if (rest === null) return null;
  return firstExisting([
    path.join(STORE_ROOT, `${rest}.tsx`),
    path.join(STORE_ROOT, `${rest}.ts`),
    path.join(STORE_ROOT, rest, "index.tsx"),
    path.join(STORE_ROOT, rest, "index.ts"),
  ]);
}

module.exports = (() => {
  const base = getSentryExpoConfig(__dirname);
  const { transformer, resolver } = base;

  base.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve("react-native-svg-transformer"),
  };

  const srcBlock =
    /node_modules[/\\]react-native-(nitro-modules|mmkv)[/\\]src[/\\]/;
  const prevBlockList = resolver.blockList;
  base.resolver = {
    ...resolver,
    assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
    sourceExts: [...resolver.sourceExts, "svg"],
    blockList: mergeBlockList(prevBlockList, srcBlock),
  };

  // NativeWind wraps resolveRequest — apply aliases AFTER so they actually run.
  const config = withNativeWind(base, { input: "./global.css" });
  const innerResolve = config.resolver.resolveRequest;
  config.maxWorkers = 2;

  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const kind = matchExpoRouterCtx(context, moduleName);
    if (kind) {
      return asSource(resolveCtxFile(kind, platform));
    }

    const storePath = resolveStoreAlias(moduleName);
    if (storePath) return asSource(storePath);

    const legacyStore = rewriteLegacyAppStoreRelative(
      context.originModulePath,
      moduleName
    );
    if (legacyStore) return asSource(legacyStore);

    if (moduleName === "react-native-nitro-modules") {
      return asSource(path.join(NITRO_LIB, "index.js"));
    }
    if (moduleName === "react-native-mmkv") {
      return asSource(path.join(MMKV_LIB, "index.js"));
    }

    const fromRelative = rewriteSrcRelativeToLib(
      context.originModulePath,
      moduleName
    );
    if (fromRelative) return asSource(fromRelative);

    const fromAbs = rewriteAbsoluteSrc(moduleName);
    if (fromAbs) return asSource(fromAbs);

    if (typeof innerResolve === "function") {
      return innerResolve(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  };

  return config;
})();
