/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./web/index.html",
    "./web/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        nordic: {
          bg: "#0B1311",
          surface: "#121F1C",
          surfaceLight: "#182925",
          border: "#1C332D",
          aurora: "#2DD4BF",
          emerald: "#10B981",
          gold: "#F59E0B",
          pearl: "#F1F5F9",
          muted: "#94A3B8",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
