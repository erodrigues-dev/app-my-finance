/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Dracula palette
        dracula: {
          background: "#282A36",
          foreground: "#F8F8F2",
          selection: "#44475A",
          comment: "#6272A4",
          red: "#FF5555",
          orange: "#FFB86C",
          yellow: "#F1FA8C",
          green: "#50FA7B",
          purple: "#BD93F9",
          pink: "#FF79C6",
          cyan: "#8BE9FD",
        },
      },
    },
  },
  plugins: [],
};
