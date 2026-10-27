/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // High-contrast palette chosen for direct sunlight on a phone screen.
        turf: { 900: '#0b2c21', 800: '#0f3d2e', 700: '#15543f', 600: '#1c6b50' },
        sand: { 50: '#fdfcf7', 100: '#f7f3e8', 200: '#ece4cf' },
        flag: { 500: '#d6453a', 600: '#b8362c' },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
