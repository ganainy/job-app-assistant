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
        "primary": "#9333ea", // Purple-600 (Updated from user request)
        "primaryLight": "#a855f7", // Purple-500
        "background-light": "#f3f4f6", // Gray-100
        "background-dark": "#0f172a", // Slate-900
        "card-light": "#ffffff",
        "card-dark": "#1e293b", // Slate-800
        "text-main-light": "#111827",
        "text-main-dark": "#f8fafc",
        "text-sub-light": "#6b7280",
        "text-sub-dark": "#94a3b8",
        // Kept existing for backward compatibility if needed, though some overlap
        "text-light-primary": "#1A202C",
        "text-dark-primary": "#F7FAFC",
        "text-light-secondary": "#A0AEC0",
        "text-dark-secondary": "#A0AEC0",
        "border-light": "#E2E8F0",
        "border-dark": "#2D3748",
        "positive": "#38A169",
        "negative": "#E53E3E",
        "accent": {
          "purple": "#764ba2",
          "purple-light": "#a8a8e6",
          "purple-dark": "#5a3d7a"
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Updated to Inter
        display: ['Inter', 'sans-serif'], // Updated to Inter
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