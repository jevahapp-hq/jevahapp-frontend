/**
 * SVG transform without SVGO. SVGO opens dozens of plugin files per icon
 * and is what pushes Metro over the Windows file-handle limit while the
 * welcome screen is bundling.
 */
const { transform: svgrTransform } = require("@svgr/core");
const upstream = require("@expo/metro-config/babel-transformer");

const svgrConfig = {
  native: true,
  plugins: ["@svgr/plugin-jsx"],
};

module.exports.transform = async ({ src, filename, ...rest }) => {
  if (filename.endsWith(".svg")) {
    const code = await svgrTransform(src, svgrConfig, { filePath: filename });
    return upstream.transform({ src: code, filename, ...rest });
  }
  return upstream.transform({ src, filename, ...rest });
};
