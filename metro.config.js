const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    // 👇 Add support for `.cjs` so pdf-lib can load properly
    sourceExts: [...defaultConfig.resolver.sourceExts, 'cjs'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
