import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#9E7B5B",
          light: "#C9B79C",
          dark: "#6B5239",
        },
        ink: {
          DEFAULT: "#2A2522",
          muted: "#7A736D",
        },
        canvas: "#FAF8F5",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Hiragino Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
