module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./",
            "@/src": "./src",
            "@/shared": "./src/shared",
            "@/core": "./src/core",
            "@/features": "./src/features",
            "@/components": "./src/shared/components",
            "@/hooks": "./src/shared/hooks",
            "@/utils": "./src/shared/utils",
            "@/types": "./src/shared/types",
            "@/constants": "./src/shared/constants",
          },
        },
      ],
      // Reanimated plugin MUST be listed last
      "react-native-reanimated/plugin",
    ],
  };
};