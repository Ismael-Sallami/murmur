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
          bg: "#0A0F1D",
          surface: "#0F172A",
          surfaceLight: "#1E293B",
          border: "rgba(56, 189, 248, 0.15)",
          aurora: "#00F0FF",
          emerald: "#10B981",
          iris: "#818CF8",
          sky: "#38BDF8",
          gold: "#F59E0B",
          pearl: "#F8FAFC",
          muted: "#94A3B8",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "aurora-slow": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(20px, -25px) scale(1.08)" },
        },
        "aurora-reverse": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(-25px, 20px) scale(1.06)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4", filter: "drop-shadow(0 0 15px rgba(0, 240, 255, 0.3))" },
          "50%": { opacity: "0.85", filter: "drop-shadow(0 0 28px rgba(16, 185, 129, 0.5))" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "float-delayed": "float 7s ease-in-out 2s infinite",
        "aurora-slow": "aurora-slow 18s ease-in-out infinite",
        "aurora-reverse": "aurora-reverse 22s ease-in-out infinite",
        "pulse-glow": "pulse-glow 4s ease-in-out infinite",
        shimmer: "shimmer 3s infinite linear",
      },
    },
  },
  plugins: [],
};
