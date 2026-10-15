module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    wsBaseUrl: process.env.EXPO_PUBLIC_WS_BASE_URL,
  },
});
