/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./App.tsx", "./app/**/*.{js,jsx,ts,tsx}" , "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        rubik: ['Rubik_400Regular'],
        'rubik-bold': ['Rubik_700Bold'],
        'rubik-semibold': ['Rubik_600SemiBold'],

      },
    },
  },
  plugins: ["react-native-reanimated/plugin",],
}