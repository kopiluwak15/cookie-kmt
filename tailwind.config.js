/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f8f6f3",
          100: "#f0ebe5",
          200: "#e0d5ca",
          300: "#d0c0af",
          400: "#b39d7e",
          500: "#9e7b5b",
          600: "#8a6d4d",
          700: "#765f41",
          800: "#62513a",
          900: "#4e4330",
        },
      },
    },
  },
  plugins: [],
};
