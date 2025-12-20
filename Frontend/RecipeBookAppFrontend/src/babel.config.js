module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxRuntime: 'automatic',
          flow: 'strip', // Strip Flow types from React Native
        },
      ],
      '@babel/preset-typescript',
    ],
    plugins: [],
  };
};
