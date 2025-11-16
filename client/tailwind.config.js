// client/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", // Include the root HTML file
    "./src/**/*.{js,ts,jsx,tsx}", // Include all JS/TS/JSX/TSX files in src
  ],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      colors: {
        "primary": "#3182CE", // Cool Blue
        "background-light": "#F7FAFC", // Off-white
        "background-dark": "#0A192F", // Dark Blue
        "text-light-primary": "#1A202C", // Dark Charcoal
        "text-dark-primary": "#F7FAFC", // Off-white
        "text-light-secondary": "#A0AEC0", // Medium Gray
        "text-dark-secondary": "#A0AEC0", // Medium Gray
        "card-light": "#FFFFFF",
        "card-dark": "#1A192F", // Dark Charcoal
        "border-light": "#E2E8F0",
        "border-dark": "#2D3748",
        "positive": "#38A169", // Muted Green
        "negative": "#E53E3E", // Muted Red
        "accent": {
          "purple": "#764ba2",
          "purple-light": "#a8a8e6",
          "purple-dark": "#5a3d7a"
        }
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
    },
  },
  plugins: [],
}