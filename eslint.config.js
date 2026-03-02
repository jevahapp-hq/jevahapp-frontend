module.exports = {
  // ... your existing config
  settings: {
    'import/resolver': {
      alias: {
        map: [
          ['@', './app'], // 👈 match tsconfig and babel
        ],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    },
  },
};
