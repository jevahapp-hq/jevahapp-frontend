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
            "@/store": "./src/store",
            "@/src": "./src",
            "@/shared": "./src/shared",
            "@/core": "./src/core",
            "@/features": "./src/features",
            "@/components": "./src/shared/components",
            "@/hooks": "./src/shared/hooks",
            "@/utils": "./src/shared/utils",
            "@/types": "./src/shared/types",
            "@/constants": "./src/shared/constants",
            "@": "./",
          },
        },
      ],
      // Worklets plugin MUST be listed last for Reanimated 4
      "react-native-worklets/plugin",
    ],
  };
};