import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Kanit", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        heading: ["Kanit", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      colors: {
        lime: {
          DEFAULT: "#ccff00",
          hover: "#b8e600",
          glow: "rgba(204, 255, 0, 0.4)",
          50: "#f7fee7",
          100: "#ecfccb",
          200: "#d9f99d",
          300: "#ccff00",
          400: "#b8e600",
          500: "#a3cf00",
          600: "#84a300",
          700: "#657d00",
          800: "#495b00",
          900: "#313d00",
        },
      },
      borderRadius: {
        card: "22px",
        hero: "32px",
      },
    },
  },
  plugins: [],
};

export default config;
