/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#1e293b', // Deep blue-grey (Slate 800) - Main Brand
          900: '#0f172a', // Slate 900
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b', // Slate 500
          600: '#475569', // Slate 600
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        accent: {
          500: '#0ea5e9', // Sky 500
          600: '#0284c7',
        },
        surface: '#ffffff',
        background: '#f1f5f9', // Slate 100
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      }
    },
  },
  plugins: [],
}