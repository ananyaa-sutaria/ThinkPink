const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

let svgTransformerPath = null;
try {
  svgTransformerPath = require.resolve("react-native-svg-transformer");
} catch {
  // Keep Metro bootable even if the transformer package is temporarily missing.
}

if (svgTransformerPath) {
  config.transformer = {
    ...config.transformer,
    babelTransformerPath: svgTransformerPath,
  };

  config.resolver = {
    ...config.resolver,
    assetExts: config.resolver.assetExts.filter((ext) => ext !== "svg"),
    sourceExts: [...config.resolver.sourceExts, "svg"],
  };
}

module.exports = config;
