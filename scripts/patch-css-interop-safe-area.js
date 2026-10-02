/**
 * NativeWind's css-interop touches React Native's deprecated SafeAreaView,
 * which prints a startup warning on React Native 0.81+.
 * className on SafeAreaView still works via react-native-safe-area-context.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(
  root,
  "node_modules/react-native-css-interop/dist/runtime/components.js"
);
const src = path.join(
  root,
  "node_modules/react-native-css-interop/src/runtime/components.ts"
);

function patchDist(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  const next = text.replace(
    '\n(0, api_1.cssInterop)(react_native_1.SafeAreaView, { className: "style" });',
    ""
  );
  if (next !== text) fs.writeFileSync(filePath, next);
}

function patchSrc(filePath) {
  if (!fs.existsSync(filePath)) return;
  let text = fs.readFileSync(filePath, "utf8");
  const next = text
    .replace("\n  SafeAreaView,", "")
    .replace('\ncssInterop(SafeAreaView, { className: "style" });', "");
  if (next !== text) fs.writeFileSync(filePath, next);
}

patchDist(dist);
patchSrc(src);
