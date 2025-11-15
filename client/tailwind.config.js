// client/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", // Include the root HTML file
    "./src/**/*.{js,ts,jsx,tsx}", // Include all JS/TS/JSX/TSX files in src
  ],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {},
  },
  plugins: [],
}