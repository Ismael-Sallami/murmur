/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./web/index.html",
    "./web/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        night: {
          DEFAULT: "#0F1220",
          soft: "#161A2C",
          deep: "#1E2338",
        },
        chalk: {
          DEFAULT: "#ECEAF4",
          soft: "#C3C1D6",
          muted: "#8C8AA6",
          faint: "#585A74",
        },
        mint: {
          DEFAULT: "#A8E6CF",
          deep: "#92D9BE",
        },
        lilac: {
          DEFAULT: "#B9A7F2",
          light: "#CBBDF7",
        },
        mist: "#8EB8E6",
        dusk: "#7C6FD1",
        peach: "#F4B393",
      },
      fontFamily: {
        display: ["Bricolage Grotesque", "Figtree", "system-ui", "sans-serif"],
        sans: ["Figtree", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        wave: {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
        bob: {
          "0%, 100%": { transform: "translateY(0) rotate(-1deg)" },
          "50%": { transform: "translateY(-5px) rotate(1deg)" },
        },
        note: {
          "0%": { transform: "translate(0, 0) rotate(0deg) scale(0.6)", opacity: "0" },
          "15%": { opacity: "1" },
          "100%": { transform: "translate(var(--dx), -170px) rotate(var(--rot)) scale(1.15)", opacity: "0" },
        },
        beat: {
          "0%, 100%": { transform: "scale(1)" },
          "12%": { transform: "scale(1.03)" },
          "30%": { transform: "scale(1)" },
        },
        ring: {
          "0%": { transform: "scale(0.9)", opacity: "0.45" },
          "100%": { transform: "scale(1.7)", opacity: "0" },
        },
        progress: {
          from: { width: "8%" },
          to: { width: "92%" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        wave: "wave 1.6s ease-in-out infinite",
        bob: "bob 4s ease-in-out infinite",
        note: "note 6s ease-out infinite",
        "fade-up": "fade-up 0.9s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};
