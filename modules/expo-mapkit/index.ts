// Reexport the native module. On web, it will be resolved to ExpoMapkitModule.web.ts
// and on native platforms to ExpoMapkitModule.ts
export { default } from './src/ExpoMapkitModule';
export { default as ExpoMapkitView } from './src/ExpoMapkitView';
export * from  './src/ExpoMapkit.types';
