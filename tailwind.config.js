/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#14213D", light: "#1f3260", accent: "#F5A623" },
      },
    },
  },
  plugins: [],
};
