import "dotenv/config";

export default ({ config }) => {
  const IS_DEV = process.env.APP_VARIANT === "development";

  return {
    ...config, // Lädt alle deine alten Einstellungen aus der app.json
    name: IS_DEV ? "JobApp 2 (Dev)" : "JobApp 2",
    ios: {
      ...config.ios,
      bundleIdentifier: IS_DEV
        ? "com.ricky1993.jobape.dev"
        : "com.ricky1993.jobape",
    },
    android: {
      ...config.android,
      package: IS_DEV
        ? "com.ricky1993.jobape.dev"
        : "com.ricky1993.jobape",
    },
  };
};
