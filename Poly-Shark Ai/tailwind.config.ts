import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        abyss: {
          50: "#eef9ff",
          100: "#d9f0ff",
          200: "#bce5ff",
          300: "#8ed5ff",
          400: "#59bbff",
          500: "#319bff",
          600: "#1a7bf5",
          700: "#1462e0",
          800: "#1750b4",
          900: "#0b1f3a",
          950: "#050d1c",
        },
        shark: {
          DEFAULT: "#0ea5e9",
          deep: "#0b2545",
          tooth: "#e0f2fe",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "ocean-gradient":
          "radial-gradient(ellipse at top, #0b2545 0%, #050d1c 50%, #000 100%)",
        "shark-shine":
          "linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #8b5cf6 100%)",
      },
      animation: {
        "swim": "swim 8s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2.5s ease-in-out infinite",
        "fade-in": "fadeIn 0.4s ease-out",
      },
      keyframes: {
        swim: {
          "0%, 100%": { transform: "translateX(0) rotate(0deg)" },
          "50%": { transform: "translateX(8px) rotate(2deg)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(14,165,233,0.4)" },
          "50%": { boxShadow: "0 0 40px rgba(14,165,233,0.8)" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
